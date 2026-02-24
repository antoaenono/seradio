/**
 * @module schedule/schedule
 * Upcoming track list with a fallback for when the schedule is empty.
 */
import { firstMp3 } from '../audio'

const schedule: string[] = []
const fallbackFn = firstMp3

/**
 * Append an audio track path to the end of the schedule.
 * @param path - Absolute path to mp3 file
 */
export function append(path: string): void {
  schedule.push(path)
}

/**
 * Get the next track path. Pops from the front, or calls the fallback if empty.
 */
export async function next(): Promise<string> {
  const track = schedule.shift()
  if (track) return track
  return fallbackFn()
}
