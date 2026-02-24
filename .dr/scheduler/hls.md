---
author: @antoaenono
asked: 2026-02-18
decided: 2026-02-18
status: proposed
deciders: @antoaenono
tags: [scheduler, playback]
parent: null
children: [scheduler/segmentation, scheduler/playout, scheduler/schedule]
---

# ADR: Scheduler

## Scenario

How do we manage the state of what is currently playing and what plays next, so that the radio station continuously streams without manual intervention?

## Pressures

### More

1. [M1] Continuous playback

### Less

1. [L1] Complexity

## Chosen Option

HLS (HTTP Live Streaming): pre-chunk tracks into segments with a sliding window playlist, clients pull current segments and stay synced to live.

## Why

In the context of **managing playback state and track sequencing**,
facing **no mechanism to advance tracks**,
we decided **to use HLS with pre-chunked audio segments and a sliding window m3u8 playlist**,
to achieve **continuous live playback where all listeners stay synced to the current position**,
accepting **a pre-processing step to segment audio and more moving parts than a raw stream**.

## Points

### For

- [M1] The playlist manifest can be continuously updated with new segments, enabling seamless track transitions
- [M1] Sliding window means all listeners stay near live - pause/resume jumps to current position, like real radio
- [L1] No stream throttling or backpressure management - the server just serves static files (segments)
- [L1] Battle-tested protocol used by Spotify, Apple Music, and most modern streaming

### Against

- [L1] Requires a pre-processing step to split mp3s into segments (ffmpeg or similar)
- [L1] More files to manage: each track becomes N segment files plus a playlist
- [L1] Slight latency from segment duration (e.g., 5-second segments mean up to 5 seconds behind "live")
- [M1] The `<audio>` element doesn't natively support HLS on all browsers - may need hls.js library

## Consequences

- Requires ffmpeg as a dependency for segmenting tracks (@rse/ffmpeg bundles the binary via npm, no system install)
- Each mp3 is split into fixed-duration segments (e.g., 5s or 10s .ts files) at runtime or startup
- A sliding window m3u8 playlist is generated, only listing the most recent segments (old ones are cleaned up)
- The audio route serves the playlist, clients fetch segments via standard HTTP
- Adding new tracks means segmenting them first
- Configurable gap between tracks via silent segments (hardcoded for now)
- Chrome/Safari support HLS natively, Firefox needs hls.js as a client-side polyfill

## How

```
# Segment an mp3 into .ts chunks (ffmpeg is just a batch converter, we write our own playlist)
ffmpeg -i track.mp3 -codec:a aac -b:a 128k \
  -f segment -segment_time 10 \
  segments/track_%03d.ts

# Generate silent gap segments once
ffmpeg -f lavfi -i anullsrc -t 3 -codec:a aac segments/silence_%03d.ts
```

```ts
// Pseudocode - server side

// Segment queue: [trackA..., silence..., trackB..., silence..., ...]
// One linear queue. The ticker walks through it. Silence is just more segments.
const queue: string[] = []

// Serve segment files statically
app.use('/segments', express.static('segments'))

// Serve the live sliding window playlist
// No #EXT-X-PLAYLIST-TYPE header = live mode (clients re-fetch periodically)
app.get('/api/audio/playlist.m3u8', (req, res) => {
  res.set('Content-Type', 'application/vnd.apple.mpegurl')
  res.sendFile(currentPlaylistPath)
})

// segmentTrack: ffmpeg splits one mp3 into .ts files, returns filenames
async function segmentTrack(mp3: string): Promise<string[]> { /* ... */ }

// tick: every ~10s, slide window forward by 1 segment, write .m3u8, clean up old .ts from disk
// When queue is running low, call advance()
function tick() { /* ... */ }

// advance: segment next track, push silence + new segments onto queue
// Next track is segmented during the silence gap
async function advance() {
  const segments = await segmentTrack(await firstMp3())
  queue.push(...silenceSegments, ...segments)
}
```

```html
<!-- Client side with hls.js -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<audio id="player" controls></audio>
<script>
  const audio = document.getElementById('player')
  if (Hls.isSupported()) {
    const hls = new Hls()
    hls.loadSource('/api/audio/playlist.m3u8')
    hls.attachMedia(audio)
  }
</script>
```

## Reconsider

- observe: The segmentation step adds too much friction for a simple radio app
  respond: Fall back to throttled stream for simplicity
- observe: Latency from segment duration is unacceptable for live features
  respond: Use shorter segments or switch to a push-based streaming approach

## History

Apple introduced HLS in 2009 for iOS streaming. It replaced continuous byte streams (Icecast/Shoutcast) with segmented HTTP delivery, enabling CDN caching and adaptive bitrate. Now the dominant streaming protocol - Apple Music still uses HLS with ALAC. HLS segments work over HTTP/3 (QUIC) automatically for faster delivery. Media over QUIC (MoQ) is an emerging IETF draft that could eventually replace HLS by building streaming natively on QUIC.

## More Info

- [Issue #10: A single song on repeat](https://github.com/antoaenono/seradio/issues/10)
- [Apple HLS Authoring Specification](https://developer.apple.com/documentation/http-live-streaming) (covers VOD vs live/sliding window playlist types)
- [hls.js](https://github.com/video-dev/hls.js/)
