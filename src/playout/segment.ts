/**
 * @module playout/segment
 * FFmpeg integration:
 * - segments mp3 tracks into HLS .ts files
 * - generates silence
 * - generates a fallback tone (sine sweep)
 */
import { readFile, unlink } from 'node:fs/promises'

import FFmpeg from '@rse/ffmpeg'
import path from 'path'

export type SegmenterOutput = {
  file: string
  duration: number
}

/**
 * Segment an mp3 into .ts files and return their durations.
 * Runs ffmpeg to chop the file, then reads the temp playlist to get actual durations.
 * @param mp3Path - Absolute path to the source mp3 file
 * @param segmentDir - Directory to write .ts segment files into
 * @param segmentDuration - Target duration per segment in seconds
 * @param trackId - Numeric ID used to prefix segment filenames (t0_, t1_, ...)
 */
export async function segmentTrack(
  mp3Path: string,
  segmentDir: string,
  segmentDuration: number,
  trackId: number,
): Promise<SegmenterOutput[]> {
  const playlistPath = await ffmpegSegment(mp3Path, segmentDir, segmentDuration, `t${trackId}`)
  return collectSegments(playlistPath)
}

/**
 * Run ffmpeg to chop an mp3 into HLS .ts segments.
 * Writes segment files and a temp .m3u8 playlist to segmentDir.
 * @param mp3Path - Absolute path to the source mp3 file
 * @param segmentDir - Directory to write .ts segment files into
 * @param segmentDuration - Target duration per segment in seconds
 * @param prefix - Filename prefix for segments (e.g. 't0', 'tone')
 * @returns Path to the temp .m3u8 playlist
 */
async function ffmpegSegment(
  mp3Path: string,
  segmentDir: string,
  segmentDuration: number,
  prefix: string,
): Promise<string> {
  const segPattern = path.join(segmentDir, `${prefix}_%03d.ts`)
  const tempPlaylist = path.join(segmentDir, `${prefix}.m3u8`)

  // prettier-ignore
  const proc = Bun.spawn([
    FFmpeg.binary,
    '-loglevel', 'error',                  // suppress info/warning output
    '-i', mp3Path,                         // input file
    '-vn',                                 // drop video stream (mp3s sometimes have album art)
    '-codec:a', 'aac',                     // re-encode audio as AAC for HLS compatibility
    '-b:a', '128k',                        // audio bitrate
    '-hls_time', String(segmentDuration),  // target seconds per segment
    '-hls_list_size', '0',                 // include all segments in the temp playlist
    '-hls_segment_filename', segPattern,   // output segment filename pattern
    tempPlaylist,                          // output playlist (parsed then deleted)
  ])

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`ffmpeg segmentation failed (exit ${exitCode}): ${mp3Path}`)
  }

  return tempPlaylist
}

/**
 * Read a temp .m3u8 playlist, parse it into segment tuples, then delete it.
 * @param playlistPath - Path to the temp .m3u8 file written by ffmpeg
 */
async function collectSegments(playlistPath: string): Promise<SegmenterOutput[]> {
  const segments = parseM3u8(await readFile(playlistPath, 'utf-8'))
  await unlink(playlistPath)
  return segments
}

/**
 * Parse an ffmpeg-generated .m3u8 to extract a {file, duration} tuple for each segment.
 * @param content - Raw .m3u8 file contents
 */
export function parseM3u8(content: string): SegmenterOutput[] {
  const lines = content.split('\n')
  const segments: SegmenterOutput[] = []

  // Look through all lines for #EXTINF tags, which indicate the duration of a next segment file.
  // The segment filename is expected to be on the line immediately following the #EXTINF line.
  // Get all segment files and their durations.
  // Look at `tests/segment.test.ts` for example .m3u8 contents.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('#EXTINF:')) {
      const duration = parseFloat(line.slice('#EXTINF:'.length))
      const file = lines[i + 1]?.trim()
      if (file) segments.push({ file, duration })
    }
  }

  return segments
}

/**
 * Generate a silent .ts segment for inter-track gaps.
 * @param segmentDir - Directory to write the silence.ts file into
 * @param durationSec - Length of silence in seconds
 */
export async function generateSilence(
  segmentDir: string,
  durationSec: number,
): Promise<SegmenterOutput> {
  const file = 'silence.ts'
  const outPath = path.join(segmentDir, file)

  // prettier-ignore
  const proc = Bun.spawn([
    FFmpeg.binary,
    '-loglevel', 'error',                // suppress info/warning output
    '-f', 'lavfi',                       // use libavfilter virtual input
    '-i', 'anullsrc=r=44100:cl=stereo',  // generate silent audio (44.1kHz stereo)
    '-t', String(durationSec),           // duration of silence
    '-codec:a', 'aac',                   // encode as AAC to match track segments
    outPath,
  ])

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`ffmpeg silence generation failed (exit ${exitCode})`)
  }

  return { file, duration: durationSec }
}

/**
 * Generate a sine sweep as fallback audio, segmented into HLS .ts chunks.
 * Frequency sweeps from 220Hz up to 440Hz and back over the duration,
 * following a cosine curve for a smooth cycle.
 * @param segmentDir - Directory to write segment files into
 * @param segmentDuration - Target duration per segment in seconds
 * @param toneDuration - Total length of the sweep in seconds
 */
export async function generateTone(
  segmentDir: string,
  segmentDuration: number,
  toneDuration: number,
): Promise<SegmenterOutput[]> {
  // Frequency sweeps 220Hz -> 440Hz -> 220Hz over toneDuration
  // f(t) = 220 + 110*(1 - cos(2*PI*t/d)), integrated for correct phase
  const d = toneDuration
  const expr = `sin(2*PI*(330*t-110*${d}/(2*PI)*sin(2*PI*t/${d})))`

  const tempMp3 = path.join(segmentDir, 'tone.mp3')

  // Shimmer: short echoes for doubling, longer echoes for deep reverb tail
  const filter = 'aecho=0.6:0.4:60|90|120:0.4|0.3|0.25,aecho=0.8:0.5:300|600|900:0.35|0.25|0.15'

  // Generate 3 cycles and keep the middle one. The first cycle warms up
  // the reverb, the third provides a tail for the middle to bleed into.
  // prettier-ignore
  const proc = Bun.spawn([
    FFmpeg.binary,
    '-loglevel', 'error',                           // suppress info/warning output
    '-f', 'lavfi',                                  // use libavfilter virtual input
    '-i', `aevalsrc='${expr}:s=44100:d=${d * 3}'`,  // sine sweep (44.1kHz, 3 cycles)
    '-af', filter,                                  // shimmer reverb (echo chain)
    '-codec:a', 'libmp3lame',                       // encode as mp3 (intermediate format)
    '-b:a', '128k',                                 // audio bitrate
    tempMp3,                                        // temp file (segmented then deleted)
  ])

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`ffmpeg tone generation failed (exit ${exitCode})`)
  }

  // Segment with a 'tone' prefix so tick() can skip deletion
  const playlistPath = await ffmpegSegment(tempMp3, segmentDir, segmentDuration, 'tone')
  const allSegments = await collectSegments(playlistPath)
  await unlink(tempMp3)

  // Keep only the middle cycle where reverb is fully verbing
  const cycleSegments = Math.floor(toneDuration / segmentDuration)
  return allSegments.slice(cycleSegments, cycleSegments * 2)
}
