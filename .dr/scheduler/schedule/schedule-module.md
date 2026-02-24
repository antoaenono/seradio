---
author: @antoaenono
asked: 2026-02-22
decided: 2026-02-22
status: proposed
deciders: @antoaenono
tags: [scheduler, schedule, tracks]
parent: scheduler/hls
children: []
---

# ADR: Schedule

## Scenario

How do we manage the list of upcoming tracks and feed them into the real-time segment queue?

## Pressures

### More

1. [M1] Extensibility
2. [M2] Decoupling
3. [M3] Simplicity
4. [M4] Testability

### Less

1. [L1] Coupling
2. [L2] Complexity
3. [L3] Shared mutable state

## Chosen Option

Schedule module: a separate `src/schedule/` module that holds a list of upcoming track paths and provides a `next()` function. Accepts a fallback function at creation for when the list is empty.

## Artistic

"What's on deck."

## Why

In the context of **managing the list of upcoming tracks and feeding them into the real-time segment queue**,
facing **the need for teammates to build playlists, shuffle, and other track sources on top**,
we decided **to create a separate schedule module with a track list and a fallback function**,
to achieve **a clean boundary where the segment queue asks for the next track without knowing where it came from**,
accepting **one more module and a function boundary between schedule and queue**.

## Points

### For

- [M1] Teammates can push tracks, playlists, or anything into the schedule without touching the segment queue
- [M2] The segment queue only knows "call this function to get the next track path" - no knowledge of playlists or selection logic
- [M3] The interface is one function: `next() => Promise<string>`. Minimal surface area.
- [M4] The schedule can be tested independently: push tracks, call next, verify order. The fallback can be tested with an empty schedule.
- [L1] The scheduler module no longer imports `firstMp3` or knows about the audio directory
- [L3] Schedule state is encapsulated in its own module, not scattered as globals in the scheduler

### Against

- [L2] One more module to understand and maintain
- [M3] The fallback function adds a concept that teammates need to understand
- [L2] The boundary between schedule and segment queue is another seam that could drift

## Consequences

- `src/schedule/` module owns track ordering, the fallback, and the "what's next" interface
- `src/scheduler/` only receives a `getNextTrack` function (or calls `schedule.next()`)
- `nextTrackPath()` in scheduler.ts is replaced by a call to the schedule
- The schedule holds strings (paths) for now; teammates can extend to Track objects or Playlist types later
- The fallback function is provided at schedule creation, e.g., `createSchedule({ fallback: () => firstMp3() })`

## How

```ts
// src/schedule/schedule.ts

type ScheduleOptions = {
  /** Called when the schedule is empty and a track is requested. */
  fallback: () => Promise<string>
}

const queue: string[] = []
let fallbackFn: () => Promise<string>

/** Create the schedule with a fallback for when the queue is empty. */
export function create(options: ScheduleOptions): void {
  fallbackFn = options.fallback
}

/** Push one or more track paths onto the end of the schedule. */
export function push(...paths: string[]): void {
  queue.push(...paths)
}

/** Get the next track path. Pops from the front, or calls fallback if empty. */
export async function next(): Promise<string> {
  const track = queue.shift()
  if (track) return track
  return fallbackFn()
}
```

```ts
// src/scheduler/scheduler.ts (changes)

import * as schedule from '../schedule'

// Remove nextTrackPath(), replace with schedule.next()
async function advance(): Promise<void> {
  const mp3 = await schedule.next()
  // ...rest unchanged
}

export async function start(): Promise<void> {
  // ...setup...
  const mp3 = await schedule.next()
  // ...rest unchanged
}
```

## Reconsider

- observe: The schedule needs to hold richer types than strings (metadata, playlists)
  respond: Introduce a Track type or accept Track | Playlist union
- observe: Multiple consumers need to read the schedule without popping
  respond: Add a `peek()` or iteration interface
- observe: The fallback pattern is too limiting for complex selection logic
  respond: Replace fallback with a pluggable track source strategy

## History

Most media players separate the playlist/queue from the playback engine. Winamp had a playlist window independent of the decoder. MPD (Music Player Daemon) separates the queue from the output pipeline. The pattern of "schedule of upcoming items" feeding a "player that consumes them" is well established.

## More Info

- [MPD architecture](https://www.musicpd.org/doc/html/developer.html)
