/**
 * @module moduleName
 * This is a TypeScript file template.
 * This top docstring should provide a brief description of what this file does.
 */

// Tip: Type `mod` + tab in a .ts file to scaffold the header above.
// The snippet only works when VSCode knows the file is TypeScript (save as .ts first).
// See CONTRIBUTING.md > Documentation Standards for more info.

// Note: The @module tag is a JSDoc file header — it's unrelated to ES modules.
// It just names and describes the file. JSDoc also has @file (alias @fileoverview)
// which does the same thing, but @module is more widely used because documentation
// generators like TypeDoc use it to organize output pages.

// Tip: Type `/**` + Enter above anything to generate JSDoc from the signature.
// In general it's nice to always have a @module or @file tag at the top.
// Function and class-level JSDocs are optional, use when code isn't self-explanatory.
// For the full list of JSDoc tags, see: https://jsdoc.app

/** Example enum. */
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}

/**
 * Represents a track in the radio library.
 * @example
 * const track = new Track('Clair de Lune', 'Debussy', 300)
 * track.isLong // false
 */
export class Track {
  /** Display title shown in the player UI. */
  readonly title: string

  /** Artist or composer name. */
  readonly artist: string

  /** Duration in seconds. */
  readonly duration: number

  /**
   * @param title - The track's display title
   * @param artist - Artist or composer name
   * @param duration - Length in seconds
   */
  constructor(title: string, artist: string, duration: number) {
    this.title = title
    this.artist = artist
    this.duration = duration
  }

  /**
   * Whether the track is longer than 10 minutes.
   * @returns True if duration exceeds 600 seconds
   */
  get isLong(): boolean {
    return this.duration > 600
  }
}

/**
 * Formats a summary for the given {@link Track}.
 * See {@link Status} for valid filter values.
 * @param name - The user's display name
 * @param count - How many items to return
 * @param status - Filter by active or inactive
 * @returns A formatted summary string
 */
export function exampleFunction(name: string, count: number, status: Status): string {
  return `${name}: ${count} ${status}`
}
