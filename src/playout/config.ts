/**
 * @module playout/config
 * Shared paths and constants for the playout module.
 */
import path from 'path'

// Paths
export const SEGMENT_DIR = path.join(import.meta.dirname, '../../audio/segments')
export const WINDOW_PATH = path.join(SEGMENT_DIR, 'playlist.m3u8')

// HLS
export const SEGMENT_DURATION = 1
export const WINDOW_SIZE = 3
export const SILENCE_GAP_SEGMENTS = 3

// Fallback tone
export const TONE_DURATION = 10 // seconds per sweep cycle

// Buffer threshold inputs
export const MAX_TRACK_DURATION = 3600 // seconds (1 hour, mirrors FCC hourly ID)
export const FFMPEG_THROUGHPUT = 20 // audio seconds per wall-clock second (conservative)
export const SAFETY_MARGIN = 2 // multiplier for jitter and I/O stalls
