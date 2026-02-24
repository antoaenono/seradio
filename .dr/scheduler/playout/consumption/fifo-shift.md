---
author: @antoaenono
asked: 2026-02-18
decided: 2026-02-18
status: proposed
deciders: @antoaenono
tags: [scheduler, queue, consumption]
parent: scheduler/playout
children: []
---

# ADR: Queue Consumption

## Scenario

How do we consume segments from the queue as they finish playing?

## Pressures

### More

1. [M1] Simplicity
2. [M2] Tick performance
3. [M3] Correctness

### Less

1. [L1] Memory growth
2. [L2] Code complexity
3. [L3] Mutable state

## Chosen Option

FIFO shift: call queue.shift() every tick to remove the front segment. The window is always queue.slice(0, WINDOW_SIZE). No cursor needed.

## Artistic

"First in, first out, no forwarding address."

## Why

In the context of **consuming segments from the queue as they finish playing**,
facing **the need to free memory and disk as segments are consumed**,
we decided **to shift the front element off the queue each tick and delete its .ts file**,
to achieve **bounded memory, automatic cleanup, and a dead-simple mental model where the current segment is always index 0**,
accepting **O(n) shift cost per tick (negligible at our scale of ~500 segments)**.

## Points

### For

- [M1] Current segment is always queue[0], window is always queue.slice(0, 3) - no offset arithmetic
- [M1] No cursor variable to track, increment, or bounds-check
- [L1] Queue length stays bounded: advance() pushes, tick() shifts, they balance out
- [L3] One less piece of mutable state (no cursor integer)
- [M3] Consumed segments are gone from the array - no risk of re-reading stale entries
- [L2] tick() body is 5 lines: shift, delete file, increment sequence, write playlist, schedule next

### Against

- [M2] Array.shift() is O(n) - every element must be re-indexed. At ~500 segments this is microseconds, but it's not O(1)
- [L2] If shift somehow fails or is skipped, the queue stalls (no fallback)

## Consequences

- [memory] Bounded, queue length stabilizes around (track segments + gap segments + next track segments)
- [disk] .ts files deleted as they fall off the front
- [tick-cost] O(n) shift per tick, measured in microseconds for n < 1000
- [correctness] No stale references, current position is always index 0

## How

```ts
async function tick(): Promise<void> {
  const old = queue.shift()
  if (old && !old.file.startsWith('silence')) {
    unlink(path.join(SEGMENTS_DIR, old.file)).catch(() => {})
  }
  mediaSequence++
  await writePlaylist()
  const current = queue[0]
  if (current) {
    setTimeout(tick, current.duration * 1000)
  }
}
```

The window for playlist generation:

```ts
const window = queue.slice(0, WINDOW_SIZE)
```

No cursor, no offset. The front of the array is always "now."

## Reconsider

- observe: Queue length grows past 10,000 and shift() becomes measurable in profiling
  respond: Switch to cursor-index approach or use a deque/ring buffer
- observe: We need random access to past segments (e.g., rewind, skip back)
  respond: Shift destroys history, switch to cursor to preserve it

## History

FIFO queues are the natural model for streaming: produce at the back, consume at the front. JavaScript's Array.shift() is O(n) because it re-indexes, but V8 optimizes small arrays heavily. In practice, shift() on arrays under a few thousand elements is sub-millisecond. For comparison, nginx-rtmp uses a linked list for its segment queue, achieving O(1) removal, but linked lists have worse cache locality and higher per-element overhead in JavaScript.

## More Info

- [V8 array internals](https://v8.dev/blog/elements-kinds)
- [HLS spec: sliding window playlists](https://datatracker.ietf.org/doc/html/rfc8216#section-6.2.2)
