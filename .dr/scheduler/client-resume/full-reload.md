---
author: @antoaenono
asked: 2026-03-03
decided: 2026-03-03
status: accepted
deciders: @antoaenono
tags: [scheduler, playback, hls, frontend]
parent: scheduler/hls
children: []
---

# SDF: Client Resume Strategy

## Scenario

How should the HLS client handle pause/resume to avoid playing stale buffered segments on a live stream?

## Pressures

### More

1. [M1] Live sync - all listeners hear the same audio at the same time
2. [M2] Immediate playback on resume - minimal delay when user hits play

### Less

1. [L1] Network overhead - unnecessary manifest/segment re-fetches
2. [L2] Complexity - code paths and browser-specific branching

### No

1. [N1] Backwards compatibility - this is a greenfield player, no existing users to migrate

### Non

1. [X1] Love

## Decision

Full source reload on every resume. Call `hls.loadSource()` + `hls.startLoad(-1)` to flush all internal buffers and fetch a fresh manifest from the live edge. For Safari native HLS, re-set `audio.src`.

## Consequences

- [buffer] All stale segments are flushed. The player starts clean with the current live manifest.
- [sync] Every resume guarantees the listener is at the live edge, matching all other listeners.
- [dx] Small amount of code: a shared `reloadSource` callback and browser-specific branches for hls.js vs Safari native.
- [overhead] Every resume triggers a full manifest fetch + first segment download (~2 HTTP requests). Brief silence (~1-2s) while the new content loads.

## Evidence

`hls.loadSource()` internally destroys the old transmuxer, clears segment references, and rebuilds the HLS session from scratch. `hls.startLoad(-1)` tells hls.js to start from the default position, which for a live stream with `liveSyncDurationCount: 2` (WINDOW_SIZE - 1) means the oldest segment in the current window, providing maximum buffer runway.

Safari's native HLS implementation handles live streams well (it powers Apple TV and radio streams), so re-setting `audio.src` is a lightweight equivalent that forces a fresh manifest fetch.

During development, an attempt to put reload logic in a `play` event listener (separate from the click handler) caused `loadSource()` to tear down the MediaSource while `audio.play()` was in progress, making the button unresponsive. The fix was to call `reloadSource()` synchronously before `audio.play()` in the click handler.

## Why(not)

In the face of **stale buffered segments playing on resume of a live HLS stream**,
instead of doing nothing (**listeners hear old audio and lose sync with live**),
we decided **to do a full source reload on every resume**,
to achieve **guaranteed live sync where every resume starts from the current live edge**,
accepting **a brief 1-2 second silence during the reload and an extra manifest+segment fetch per resume**.

## Points

### For

- [M1] Every resume starts from the live edge, all listeners stay in sync
- [M2] hls.js live sync kicks in immediately after reload, no stale buffer to drain
- [L2] Simple implementation: a shared `reloadSource` callback, no timers or thresholds

### Against

- [L1] Every resume triggers a full manifest + segment fetch, even for brief pauses
- [M2] Brief silence (~1-2s) while the new manifest and first segment download
- [L2] Two code paths needed: hls.js and Safari native

## Implementation

In `public/player/index.js`, a `reloadSource` callback is set per browser path, then called synchronously before `audio.play()` in the click handler. The reload must happen before `audio.play()` to avoid `loadSource()` tearing down the MediaSource mid-play.

```js
let hasPaused = false
let reloadSource = () => {}

// hls.js path (Chrome, Firefox, Edge)
if (typeof Hls !== 'undefined' && Hls.isSupported()) {
  const hls = new Hls({ liveSyncDurationCount: 2 }) // WINDOW_SIZE - 1
  hls.attachMedia(audio)

  audio.addEventListener('pause', () => {
    hasPaused = true
    hls.stopLoad()
  })

  reloadSource = () => {
    hls.loadSource('/api/audio/')
    hls.startLoad(-1) // -1 = default start position (live edge)
  }

  play.addEventListener('click', () => {
    if (audio.paused) {
      playIcon.src = '../images/stop-button-svgrepo-com.svg'
      reloadSource()
      audio.play()
    } else {
      playIcon.src = '../images/play-button-svgrepo-com.svg'
      audio.pause()
    }
  })

// Safari native HLS
} else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
  audio.addEventListener('pause', () => {
    hasPaused = true
  })

  reloadSource = () => {
    audio.src = '/api/audio/'
  }

  play.addEventListener('click', () => {
    if (audio.paused) {
      playIcon.src = '../images/stop-button-svgrepo-com.svg'
      reloadSource()
      audio.play()
    } else {
      playIcon.src = '../images/play-button-svgrepo-com.svg'
      audio.pause()
    }
  })
}
```

Every resume calls `reloadSource()` which does a full manifest fetch. `liveSyncDurationCount: 2` (WINDOW_SIZE - 1) targets the oldest segment in the window for maximum buffer runway.

As defined in `scheduler/hls`, the client fetches the manifest from `GET /api/audio/` and segments from `GET /api/audio/segments/*.ts`. This decision does not change the server-side playout or manifest generation.

## Reconsider

- observe: The 1-2 second silence on resume is unacceptable for the user experience
  respond: Switch to time-threshold approach (fast resume for short pauses, full reload for long ones)
- observe: Users rarely pause and resume, making the optimization unnecessary
  respond: Simplify to the nothing variant

## Artistic

"Fresh start, every time."

## Historic

HLS was designed for broadcast-style "tune in" behavior where joining a stream always means starting from the live edge. The `loadSource()` approach mirrors this: each resume is essentially "tuning in" again. This is how traditional radio works - you turn it on and hear whatever is playing now, with no concept of "where you left off."

## More Info

- [hls.js loadSource API](https://github.com/video-dev/hls.js/blob/master/docs/API.md#hlsloadsourceurl)
- [hls.js startLoad API](https://github.com/video-dev/hls.js/blob/master/docs/API.md#hlsstartloadstartposition-1)
