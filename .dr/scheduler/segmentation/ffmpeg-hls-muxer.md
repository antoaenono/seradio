---
author: @antoaenono
asked: 2026-02-18
decided: 2026-02-18
status: proposed
deciders: @antoaenono
tags: [scheduler, segmentation, ffmpeg]
parent: scheduler/hls
children: []
---

# ADR: Segmentation Strategy

## Scenario

How do we chunk up mp3 files for streaming?

## Pressures

### More

1. [M1] Streaming compatibility
2. [M2] Simplicity of integration

### Less

1. [L1] Implementation complexity
2. [L2] External dependencies

## Chosen Option

Use ffmpeg's built-in HLS muxer to produce .ts segments and a temp .m3u8 playlist, then parse the playlist for actual segment durations.

## Artistic

"Let ffmpeg do the bookkeeping."

## Why

In the context of **chunking mp3 files for streaming**,
facing **the need to produce HLS-compatible segments with accurate durations**,
we decided **to use ffmpeg's HLS muxer which outputs both .ts segments and an .m3u8 manifest**,
to achieve **correct segment boundaries and accurate duration metadata for free**,
accepting **ffmpeg as a runtime dependency and a temp playlist file to parse and delete**.

## Points

### For

- [M1] Outputs .ts (MPEG Transport Stream) segments natively - the format HLS clients expect
- [M1] Generates an .m3u8 with actual segment durations, accounting for codec frame boundaries
- [M2] One ffmpeg call produces everything - segments + duration metadata
- [L1] No manual duration tracking - parse the temp .m3u8 that ffmpeg already wrote
- [L1] Segment naming pattern handled by ffmpeg (`-hls_segment_filename`)

### Against

- [L2] Requires ffmpeg binary at runtime (@rse/ffmpeg bundles it via npm)
- [L1] Must parse the temp .m3u8 to extract durations, then delete it
- [L1] ffmpeg's `-hls_time` is a target, not exact - actual durations vary slightly per codec frame alignment

## Consequences

- [deps] ffmpeg binary required, bundled via @rse/ffmpeg npm package
- [format] MPEG Transport Stream (.ts) segments with AAC audio
- [latency] One ffmpeg process per track, takes seconds
- [disk] N .ts segment files + 1 temp .m3u8 per track (temp deleted after parsing)
- [integration] Returns Segment[] with accurate durations - scheduler uses directly for tick timing

## How

```ts
// segmentTrack: one ffmpeg call, parse temp playlist, clean up
const proc = Bun.spawn([
  FFmpeg.binary,
  '-i', mp3Path,
  '-vn',
  '-codec:a', 'aac',
  '-b:a', '128k',
  '-hls_time', String(segmentDuration),
  '-hls_list_size', '0',
  '-hls_segment_filename', segPattern,
  tempPlaylist,
])

// ffmpeg writes: t0_000.ts, t0_001.ts, ..., t0.m3u8
// Parse t0.m3u8 for actual durations, delete it
const segments = parseM3u8(await readFile(tempPlaylist, 'utf-8'))
await unlink(tempPlaylist)
```

```ts
// parseM3u8: extract {file, duration} from EXTINF lines
// Pure function, no side effects, separately testable
function parseM3u8(content: string): Segment[] { ... }
```

## Reconsider

- observe: ffmpeg startup overhead becomes a bottleneck with many short tracks
  respond: Consider pre-segmenting tracks at upload time instead of runtime
- observe: We need finer control over segment boundaries (e.g., for gapless playback)
  respond: Evaluate ffmpeg's segment muxer or a custom segmentation approach

## History

ffmpeg's HLS muxer was added to support Apple's HLS spec directly. The `-hls_time` flag targets a segment duration but respects codec frame boundaries, so actual durations may differ slightly. The muxer handles the MPEG-TS container format, AAC packetization, and playlist generation in one pass. This is the standard approach used by most HLS toolchains.

## More Info

- [ffmpeg HLS muxer docs](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- [@rse/ffmpeg npm package](https://www.npmjs.com/package/@rse/ffmpeg)
