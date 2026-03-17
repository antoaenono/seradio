/**
 * @module util
 * Shared utilities.
 */
export const isDev = process.env.NODE_ENV !== 'production'

/** ISO timestamp with colons and dots replaced by dashes, safe for filenames. */
export function timestampFnSafe(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-')
}
