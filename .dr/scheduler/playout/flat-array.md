---
author: @antoaenono
asked: 2026-02-18
decided: 2026-02-18
status: proposed
deciders: @antoaenono
tags: [scheduler, queue, playback]
parent: scheduler/hls
children: [scheduler/playout/consumption, scheduler/playout/sizing, scheduler/playout/population]
---

# ADR: Queue Architecture

## Scenario

How do we organize and advance through audio segments to produce a continuous stream?

## Pressures

### More

1. [M1] Continuous playback
2. [M2] Conceptual simplicity
3. [M3] Testability

### Less

1. [L1] State complexity
2. [L2] Memory growth
3. [L3] Disk usage
4. [L4] Coupling to infra

## Chosen Option

Flat array: a plain Segment[] where advance() pushes onto the back and tick() consumes from the front. Consumption strategy (cursor vs shift) is a child decision.

## Artistic

"One big line, walk forward, never look back."

## Why

In the context of **organizing and advancing through audio segments**,
facing **the need to continuously serve segments without stalling**,
we decided **to use a flat array with greedy pre-chunking that always stays one track ahead**,
to achieve **a simple mental model where silence and track segments are structurally identical and the tick loop has no branching**,
accepting **the need to separately decide how to consume from the front (cursor vs shift) and a recursive advance loop**.

## Points

### For

- [M1] Greedy advance means the next track is always ready before the current one finishes
- [M1] Tick loop is unconditional - just consume, write playlist, schedule next tick
- [M2] One data structure (array), one timer (setTimeout)
- [M2] Silence is just more segments in the array - no special cases in the tick loop
- [M3] buildPlaylist() is pure: takes segments + sequence number, returns m3u8 string
- [M3] parseM3u8() is pure: takes string, returns Segment[]
- [L1] No reactive queue-length checks, no isAdvancing flag, no coordination between tick and advance
- [L4] Pure functions (buildPlaylist, parseM3u8) are fully decoupled from infra

### Against

- [L1] advance() recursively calls itself - a subtle pattern that could confuse new readers
- [L3] Greedy advance creates .ts files for tracks that won't play for a while
- [L4] tick() and advance() still touch filesystem (writeFile, unlink) and timers (setTimeout)
- [L2] Memory behavior depends on consumption strategy: shift keeps it bounded, cursor lets it grow

## Consequences

- [automation] Fully automated - start() kicks off both tick loop and greedy advance
- [data-structure] Flat Segment[] array, production via push(), consumption strategy deferred to child ADR
- [buffering] Greedy: advance() chains itself, always chunking the next track immediately
- [cleanup] tick() consumes the front segment and deletes its .ts file (silence segments shared, not deleted)
- [playlist] buildPlaylist() renders the window into m3u8

## How

```
queue: [t0_047, t0_048, t0_049, ..., sil, sil, sil, t1_000, t1_001, ...]
        ^front                                                       ^back

tick:    consume front, delete .ts, mediaSequence++, writePlaylist(), setTimeout(tick)
advance: segmentTrack() -> push gap + segments -> advance()
start:   segment first track, writePlaylist, advance(), setTimeout(tick)
```

```ts
const queue: Segment[] = []
let mediaSequence = 0

// tick: consume from front (cursor++ or shift(), see consumption ADR)
async function tick() {
  const old = consume()  // child decision: cursor++ or shift()
  if (old && !old.file.startsWith('silence')) unlink(old.file)
  mediaSequence++
  writePlaylist()
  setTimeout(tick, current().duration * 1000)
}

// advance: greedy, chains itself
async function advance() {
  const segments = await segmentTrack(await firstMp3(), ...)
  queue.push(...buildGap(), ...segments)
  advance() // always stay ahead
}
```

## Reconsider

- observe: Greedy advance fills disk with segments for tracks far in the future
  respond: Switch to reactive advance (trigger when queue length drops below threshold)
- observe: The recursive advance() pattern confuses team members
  respond: Refactor to an explicit loop or reactive trigger in tick()
- observe: The array itself becomes a bottleneck at very large queue sizes
  respond: Switch to a ring buffer

## History

The flat array pattern is common in audio sequencers and media players. VLC, mpd, and most playlist-based players use a similar model internally. The "greedy" variant (always buffering ahead) trades disk space for guaranteed continuity - the same tradeoff CDNs make when pre-caching content.

## More Info

- [HLS spec: sliding window playlists](https://datatracker.ietf.org/doc/html/rfc8216#section-6.2.2)
