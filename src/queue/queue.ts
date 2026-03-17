/**
 * @module queue/queue
 * Upcoming track list with a fallback for when the queue is empty.
 */
import { getRandomMp3 } from '../audio'

const queue: string[] = []
const fallbackFn = getRandomMp3

/**
 * Append an audio track path to the end of the queue.
 * @param path - Absolute path to mp3 file
 */
export function append(path: string): void {
  queue.push(path)
}

/**
 * Return a shallow copy of the current queue.
 */
export function list(): string[] {
  return [...queue]
}

/**
 * Remove the track at the given index from the queue.
 * @returns The removed path, or undefined if the index is out of bounds.
 */
export function remove(index: number): string | undefined {
  if (index < 0 || index >= queue.length) return undefined
  return queue.splice(index, 1)[0]
}

/**
 * Get the next track path. Pops from the front, or calls the fallback if empty.
 */
export async function next(): Promise<string> {
  const track = queue.shift()
  if (track) return track
  return fallbackFn()
}
