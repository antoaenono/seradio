---
author: @antoaenono
asked: 2026-02-23
decided: 2026-02-23
status: proposed
deciders: @antoaenono
tags: [playout, metadata, now-playing]
---

# ADR: Now Playing

## Scenario

How should the playout expose information about the currently playing track so that other modules (e.g., metadata API) can serve accurate now-playing data to clients?

## Pressures

### More

1. [M1] Module independence
2. [M2] Simplicity of interface
3. [M3] Accuracy

### Less

1. [L1] Coupling
2. [L2] Complexity in playout
3. [L3] Breaking changes

## Chosen Option

Playout exports a `nowPlaying()` getter function that returns the current track's mp3 path (or undefined during tone/silence).

## Why

In the context of **exposing now-playing information from the playout**, facing **the need for other modules to know what's currently streaming**, we decided **to export a simple getter function**, to achieve **a minimal, stable interface that consumers can call on demand**, accepting **that consumers must poll or call it per-request rather than being notified of changes**.

## Points

### For

- [M1] Consumers import a single function, no knowledge of buffer or segment internals needed
- [M2] One function, one return type - the simplest possible contract
- [M3] Returns what the playout is actually playing right now, not what was scheduled
- [L1] Consumers depend on a function signature, not data structures
- [L2] Playout only needs to track the current mp3 path, one variable
- [L3] Function signature is stable even if playout internals change completely

### Against

- [M1] Consumers that need richer data (artist, title) must do their own tag reading from the path
- [L2] Playout must update the current path on every track transition (minimal but nonzero bookkeeping)

## Consequences

The playout exports `nowPlaying()` which returns a path or undefined. The metadata route calls it per-request and reads tags from that path. No shared state, no events, no subscriptions. If we later need richer metadata, we can change the return type without changing the call pattern.

## How

1. Add a `trackPaths` map (trackIndex -> mp3 path) to playout, populated in `advance()`
2. Add a `currentMp3: string | undefined` variable, updated in `tick()` when `buffer[0].trackIndex` changes
3. Export `nowPlaying()` that returns `currentMp3`
4. Clean up map entries in `tick()` when the last segment of a track is shifted out

```ts
// playout.ts
const trackPaths = new Map<number, string>()
let currentMp3: string | undefined

async function advance(): Promise<void> {
  trackIndex++
  try {
    const mp3 = await getNextTrack()
    trackPaths.set(trackIndex, mp3)
    // ... segmentation
  } catch {
    // tone fallback, no entry in trackPaths
  }
}

async function tick(): Promise<void> {
  const old = buffer.shift()
  // Update now-playing when track changes
  if (old && buffer[0] && old.trackIndex !== buffer[0].trackIndex) {
    currentMp3 = trackPaths.get(buffer[0].trackIndex)
    trackPaths.delete(old.trackIndex)
  }
  // ...
}

export function nowPlaying(): string | undefined {
  return currentMp3
}
```

## Reconsider

- **Observe:** Multiple consumers need now-playing data and are all polling independently. **Respond:** Consider an event-based approach to push updates.
- **Observe:** The return type grows beyond just a path (progress, duration, queue position). **Respond:** Consider a shared state object instead.

## More Info

- [HLS spec (RFC 8216)](https://datatracker.ietf.org/doc/html/rfc8216)
