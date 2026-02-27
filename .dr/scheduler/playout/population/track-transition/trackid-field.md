---
author: @antoaenono
asked: 2026-02-22
decided: 2026-02-22
status: proposed
deciders: @antoaenono
tags: [scheduler, queue, track-transition]
parent: scheduler/playout/population
children: []
---

# ADR: Track Transition Detection

## Scenario

How does the scheduler detect that playback has moved into the next track?

## Pressures

### More

1. [M1] Simplicity
2. [M2] Reliability
3. [M3] Decoupling
4. [M4] Testability

### Less

1. [L1] Filename coupling
2. [L2] Mutable state

## Chosen Option

Add a `trackId` field to the Segment type. The scheduler compares `trackId` values to detect transitions.

## Why

In the context of **detecting track transitions in the scheduler**, facing **the need to know when one track ends and another begins**, we decided **to stamp each segment with a numeric trackId and compare values on shift**, to achieve **decoupled, reliable detection that doesn't depend on filename conventions**, accepting **one extra field on every Segment and one piece of mutable state (currentTrackId)**.

## Points

### For

- [M1] Simple numeric comparison: `old.trackId !== currentTrackId`
- [M2] No string parsing that could silently break if naming changes
- [M3] Scheduler doesn't need to know how filenames are structured
- [L1] Zero filename coupling, detection is purely data-driven
- [M4] Tests can use any filenames, just set trackId to control transitions

### Against

- [L2] Requires `currentTrackId` mutable state in the scheduler
- [M1] Every Segment literal in tests needs a trackId field

## Consequences

- Segment type gains a `trackId: number` field
- Silence segments use `trackId: -1` as a sentinel (never triggers transition)
- Scheduler tracks `currentTrackId` and compares on each tick
- Filename conventions become purely a segmenter concern

## How

```ts
type Segment = { file: string; duration: number; trackId: number }

// In tick():
if (old && old.trackId >= 0 && old.trackId !== currentTrackId) {
  currentTrackId = old.trackId
  advance()
}
```

## Reconsider

- observe: Segment type becomes too bloated with metadata
  respond: Consider a separate track metadata structure referenced by ID
- observe: Need richer track identity (e.g. for displaying "now playing")
  respond: trackId could become a reference into a track metadata store

## More Info

- [HLS spec: media segments](https://datatracker.ietf.org/doc/html/rfc8216#section-3)
