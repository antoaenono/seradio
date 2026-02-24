---
author: @antoaenono
asked: 2026-02-18
decided: 2026-02-18
status: proposed
deciders: @antoaenono
tags: [scheduler, queue, population]
parent: scheduler/playout
children: []
---

# ADR: Queue Population

## Scenario

When should we segment the next track and add it to the queue?

## Pressures

### More

1. [M1] Continuity
2. [M2] Predictability
3. [M3] Responsiveness
4. [M4] Simplicity

### Less

1. [L1] Wasted disk
2. [L2] Coupling
3. [L3] Stale segments

## Chosen Option

Reactive: tick checks the queue length against a threshold each tick, and triggers advance() when it drops below. Configurable buffer depth.

## Artistic

"Fill when low."

## Why

In the context of **deciding when to segment the next track and add it to the queue**,
facing **the tradeoff between readiness and resource waste**,
we decided **to check queue depth each tick and trigger segmentation when it falls below a threshold**,
to achieve **a configurable buffer that adapts to consumption rate**,
accepting **a threshold to tune, a guard flag to prevent double-advance, and more logic in tick**.

## Points

### For

- [M1] Buffer depth is configurable - can tune for safety margin
- [M2] Threshold is computable from segment duration and max track length, giving a mathematical guarantee the queue won't drain
- [M3] Only segments when the queue is actually running low
- [L1] Disk usage proportional to the threshold, not unbounded
- [L3] Segments are relatively fresh, only buffered by the threshold amount

### Against

- [M4] Requires a threshold constant, an isAdvancing guard flag, and a length check per tick
- [L2] tick() must inspect queue length and manage the isAdvancing flag
- [M2] Harder to predict exactly when segmentation fires - depends on queue state
- [M4] More moving parts than one-ahead: threshold, guard flag, length comparison

## Consequences

- [startup] Same as others - segment first track, fire initial advance
- [disk] Bounded by threshold, typically 1-2 tracks worth
- [runtime] advance() fires when queue drops below threshold, guard prevents concurrent runs
- [flexibility] Threshold is tunable, can increase for unreliable ffmpeg or decrease for disk savings

## How

Given:
- `S` = segment duration (e.g. 1s)
- `T_max` = max track duration (e.g. 3600s for 1 hour)
- `R` = ffmpeg segmentation rate (segments per second of wall time, measured empirically)

The worst case is: advance fires, ffmpeg must segment a `T_max` track. That
takes `T_max / R` wall-clock seconds. The queue drains at 1 segment per `S`
seconds. So we need at least `T_max / (R * S)` segments buffered.

With a safety margin of 2x: `LOW_WATER_MARK = 2 * T_max / (R * S)`

If we also bound max track length (e.g. radio stations must ID every hour),
we can keep the threshold reasonable.

```ts
const LOW_WATER_MARK = 60 // segments (= 60s at 1s/segment)
let isAdvancing = false

async function tick(): Promise<void> {
  const old = queue.shift()
  if (old && !old.file.startsWith('silence')) {
    unlink(path.join(SEGMENT_DIR, old.file)).catch(() => {})
  }

  segmentCounter++
  await writeWindow(queue.slice(0, WINDOW_SIZE), segmentCounter)

  // trigger advance when queue is running low
  if (queue.length < LOW_WATER_MARK && !isAdvancing) {
    isAdvancing = true
    advance().finally(() => { isAdvancing = false })
  }

  const current = queue[0]
  if (current) {
    setTimeout(tick, current.duration * 1000)
  }
}
```

## Reconsider

- observe: The isAdvancing flag is a source of bugs
  respond: One-ahead avoids the flag entirely by using track transition as the trigger
- observe: ffmpeg segments faster than real-time, so the threshold can be small
  respond: If segmentation is always fast enough, one-ahead might be sufficient

## History

Reactive buffering with low-water marks is standard in network programming (TCP receive windows, buffered streams). The pattern appears in video players (YouTube's buffer bar), audio frameworks (Web Audio API's buffer scheduling), and message queues (RabbitMQ prefetch). The tradeoff is always: how much to buffer vs how often to refill.

## More Info

- [HLS spec: sliding window playlists](https://datatracker.ietf.org/doc/html/rfc8216#section-6.2.2)
