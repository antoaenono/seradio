/**
 * @module playout/playout
 * HLS playout: manages a sliding window of segments and advances through
 * the buffer with silent gaps between tracks.
 */
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'

import path from 'path'

import { logger } from '../logger'
import {
  FFMPEG_THROUGHPUT,
  MAX_TRACK_DURATION,
  SAFETY_MARGIN,
  SEGMENT_DIR,
  SEGMENT_DURATION,
  SILENCE_GAP_SEGMENTS,
  TONE_DURATION,
  WINDOW_PATH,
  WINDOW_SIZE,
} from './config'
import type { SegmenterOutput } from './segment'
import {
  generateSilence as defaultGenerateSilence,
  generateTone as defaultGenerateTone,
  segmentTrack as defaultSegmentTrack,
} from './segment'

/** Segmenter output annotated with the track it belongs to. */
export type Segment = SegmenterOutput & { trackId: number }

/** Injectable dependencies for testability. Only the heavy ones (ffmpeg, file IO). */
export type PlayoutDeps = {
  segmentTrack?: typeof defaultSegmentTrack
  generateSilence?: typeof defaultGenerateSilence
  generateTone?: typeof defaultGenerateTone
  writeWindow?: typeof writeWindow
}

// Static segments
let silenceSegment: SegmenterOutput
let toneSegments: SegmenterOutput[]

// Buffer
const buffer: Segment[] = []
let segmentIndex = 0 // increments for each tick (aka "media sequence" in HLS terms)
let isAdvancing = false
const BUFFER_THRESHOLD = bufferThreshold(
  SEGMENT_DURATION,
  MAX_TRACK_DURATION,
  FFMPEG_THROUGHPUT,
  SAFETY_MARGIN,
)

// Track
let trackIndex = 0 // used as prefix for segment filenames (t0_, t1_, ...) and lookup nowPlaying
let getNextTrack: () => Promise<string>
const trackPaths = new Map<number, string>() // trackIndex -> mp3 path
let currentTrackPath: string | undefined

// Injectable dependencies for testing purposes (default to real implementations)
let _segmentTrack = defaultSegmentTrack
let _generateSilence = defaultGenerateSilence
let _generateTone = defaultGenerateTone
let _writeWindow = writeWindow

// ---------------------------------------------------------------------------
// Lifecycle: init -> start -> advance/tick loop
// ---------------------------------------------------------------------------

/**
 * Initialize the playout: set the track source, clean the segments directory,
 * generate the silence and fallback segments.
 * @param nextTrack - Called whenever the playout needs the next track path
 * @param deps - Optional overrides for heavy dependencies (ffmpeg, file IO)
 */
export async function init(nextTrack: () => Promise<string>, deps?: PlayoutDeps): Promise<void> {
  getNextTrack = nextTrack

  if (deps?.segmentTrack) _segmentTrack = deps.segmentTrack
  if (deps?.generateSilence) _generateSilence = deps.generateSilence
  if (deps?.generateTone) _generateTone = deps.generateTone
  if (deps?.writeWindow) _writeWindow = deps.writeWindow

  await rm(SEGMENT_DIR, { recursive: true, force: true })
  await mkdir(SEGMENT_DIR, { recursive: true })

  silenceSegment = await _generateSilence(SEGMENT_DIR, SEGMENT_DURATION)
  toneSegments = await _generateTone(SEGMENT_DIR, SEGMENT_DURATION, TONE_DURATION)
}

/**
 * Segment the first track, write the initial window and kick off the tick loop.
 */
export async function start(): Promise<void> {
  await advance()
  currentTrackPath = trackPaths.get(buffer[0]?.trackId)
  await _writeWindow(buffer.slice(0, WINDOW_SIZE), segmentIndex)
  logger.info({ segments: buffer.length }, 'playout started')

  // First tick after the first segment's duration
  setTimeout(tick, buffer[0].duration * 1000)
}

/**
 * Segment one track via ffmpeg and push with a trailing silence gap onto the buffer.
 * Called by tick() when the buffer is low and by start() to pre-buffer.
 */
async function advance(): Promise<void> {
  trackIndex++

  // Try to get the next track. If it fails (there aren't any), fill with fallback tone.
  let mp3: string
  try {
    mp3 = await getNextTrack()
    trackPaths.set(trackIndex, mp3)
  } catch {
    logger.warn({ trackId: trackIndex }, 'no track available, using fallback tone')
    const fill = Array.from({ length: BUFFER_THRESHOLD }, (_, i) => ({
      ...toneSegments[i % toneSegments.length],
      trackId: trackIndex,
    }))
    buffer.push(...fill)
    return
  }

  logger.info({ mp3, trackId: trackIndex }, 'segmenting next track')

  // Append the segments and silence gap to buffer
  // Segment track can fail on a bad track: tick catches.
  const chunks = await _segmentTrack(mp3, SEGMENT_DIR, SEGMENT_DURATION, trackIndex)
  const segments = chunks.map((c) => ({ ...c, trackId: trackIndex }))
  buffer.push(...segments, ...silenceGap(trackIndex))
}

/**
 * Shifts the front segment off the buffer, deletes its .ts file,
 * writes a new window, and schedules the next tick.
 * Fires advance() when the buffer drops below the threshold.
 */
async function tick(): Promise<void> {
  const old = buffer.shift() // Remove the segment that just played
  const current = buffer[0]

  // Remove old segment file from disk (skip silence and tone, they're reused)
  if (old && !old.file.startsWith('silence') && !old.file.startsWith('tone')) {
    unlink(path.join(SEGMENT_DIR, old.file)).catch(() => {})
  }

  // Update now-playing when the track changes
  if (old && current && old.trackId !== current.trackId) {
    currentTrackPath = trackPaths.get(current.trackId)
    trackPaths.delete(old.trackId)
  }

  // Advance the HLS media sequence and write the updated window to disk
  segmentIndex++
  await _writeWindow(buffer.slice(0, WINDOW_SIZE), segmentIndex)

  // Trigger advance when buffer is running low
  if (buffer.length < BUFFER_THRESHOLD && !isAdvancing) {
    logger.info({ segments: buffer.length, threshold: BUFFER_THRESHOLD }, 'buffer below threshold')
    isAdvancing = true
    advance()
      .catch((err) => logger.error({ err }, 'playout advance failed'))
      .finally(() => {
        isAdvancing = false
      })
  }

  // Schedule the next tick after the front segment's duration elapses
  if (current) {
    setTimeout(tick, current.duration * 1000)
  } else {
    logger.error('buffer empty, tick loop stopped')
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns the mp3 path of the currently playing track, or undefined during fallback tone. */
export function nowPlaying(): string | undefined {
  return currentTrackPath
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the minimum buffer depth (in segments) to survive ffmpeg
 * segmenting the longest possible track without underrun.
 *
 * Worst case: advance fires and ffmpeg must segment a maxTrackDuration
 * track. That takes maxTrackDuration / throughput wall-clock seconds.
 * The buffer drains at 1 segment per segmentDuration seconds, so we
 * need at least maxTrackDuration / (throughput * segmentDuration)
 * segments. A safety margin (default 2x) covers jitter and I/O stalls.
 *
 * @param segmentDuration - HLS segment length in seconds
 * @param maxTrackDuration - Longest track in seconds
 * @param throughput - Audio seconds processed per wall-clock second
 * @param safetyMargin - Multiplier for jitter and I/O stalls
 */
export function bufferThreshold(
  segmentDuration: number,
  maxTrackDuration: number,
  throughput: number,
  safetyMargin: number,
): number {
  return Math.ceil((safetyMargin * maxTrackDuration) / (throughput * segmentDuration))
}

/**
 * Build the live sliding window .m3u8 string.
 * Segment paths are relative so the client resolves them against
 * whatever URL it fetched the window from.
 * @param segments - The current window of segments to include
 * @param sequence - Segment counter, HLS calls this "media sequence" (increments each tick)
 */
export function buildWindow(segments: Segment[], sequence: number): string {
  const maxDuration =
    segments.length > 0 ? Math.ceil(Math.max(...segments.map((s) => s.duration))) : 0

  const lines = [
    '#EXTM3U',
    `#EXT-X-TARGETDURATION:${maxDuration}`,
    `#EXT-X-MEDIA-SEQUENCE:${sequence}`,
    ...segments.flatMap((seg) => [`#EXTINF:${seg.duration.toFixed(6)},`, `segments/${seg.file}`]),
  ]

  return lines.join('\n')
}

/**
 * Writes the current window to disk as a .m3u8 file.
 * @param segments - The segments to include in the window
 * @param sequence - Current segment counter for the HLS media sequence
 */
async function writeWindow(segments: Segment[], sequence: number): Promise<void> {
  await writeFile(WINDOW_PATH, buildWindow(segments, sequence))
}

/** Arrange silence segments for a gap after a track.
 * Intended to pass the same ID as the preceding track so we can easily identify them together.
 * @param trackId - The track ID to assign to the silence segments
 */
function silenceGap(trackId: number): Segment[] {
  return Array.from({ length: SILENCE_GAP_SEGMENTS }, () => ({
    ...silenceSegment,
    trackId,
  }))
}

// ---------------------------------------------------------------------------
// Testing
// ---------------------------------------------------------------------------

/** Reset all module state. For tests only. */
export function _reset(): void {
  buffer.length = 0
  segmentIndex = 0
  trackIndex = 0
  trackPaths.clear()
  currentTrackPath = undefined
  isAdvancing = false
}
