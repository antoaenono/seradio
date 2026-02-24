import { describe, expect, test } from 'bun:test'

import type { Segment } from '../../src/playout'
import { bufferThreshold, buildWindow, parseM3u8 } from '../../src/playout'

describe('bufferThreshold', () => {
  test('should survive ffmpeg segmenting the longest track', () => {
    // 1s segments, 1-hour track, ffmpeg at 20x real-time, 2x safety
    const mark = bufferThreshold(1, 3600, 20, 2)

    // Buffer drains at 1 seg/sec. ffmpeg needs 3600/20 = 180s to finish.
    // So we need at least 180 segments, with 2x safety = 360.
    expect(mark).toBe(360)
  })

  test('should scale with segment duration', () => {
    // Longer segments drain slower, so fewer are needed
    const oneSecond = bufferThreshold(1, 3600, 20, 2)
    const twoSecond = bufferThreshold(2, 3600, 20, 2)

    expect(twoSecond).toBeLessThan(oneSecond)
  })

  test('should scale with throughput', () => {
    // Faster ffmpeg means less buffer needed
    const slow = bufferThreshold(1, 3600, 10, 2)
    const fast = bufferThreshold(1, 3600, 50, 2)

    expect(fast).toBeLessThan(slow)
  })

  test('should round up to whole segments', () => {
    // 2 * 100 / (3 * 1) = 66.666... should ceil to 67
    const mark = bufferThreshold(1, 100, 3, 2)

    expect(mark).toBe(67)
    expect(Number.isInteger(mark)).toBe(true)
  })

  test('should scale with safety margin', () => {
    const margin2x = bufferThreshold(1, 3600, 20, 2)
    const margin3x = bufferThreshold(1, 3600, 20, 3)

    expect(margin2x).toBe(360)
    expect(margin3x).toBe(540)
  })

  test('should return zero when safety margin is zero', () => {
    expect(bufferThreshold(1, 3600, 20, 0)).toBe(0)
  })

  test('should return 1 for minimum inputs', () => {
    // 1 * 1 / (1 * 1) = 1
    expect(bufferThreshold(1, 1, 1, 1)).toBe(1)
  })
})

describe('buildWindow', () => {
  test('should produce a valid m3u8 with headers and segment entries', () => {
    const segments: Segment[] = [
      { file: 't0_000.ts', duration: 1.0, trackId: 0 },
      { file: 't0_001.ts', duration: 1.0, trackId: 0 },
      { file: 't0_002.ts', duration: 0.834, trackId: 0 },
    ]

    const result = buildWindow(segments, 5)

    expect(result).toBe(
      [
        '#EXTM3U',
        '#EXT-X-TARGETDURATION:1',
        '#EXT-X-MEDIA-SEQUENCE:5',
        '#EXTINF:1.000000,',
        'segments/t0_000.ts',
        '#EXTINF:1.000000,',
        'segments/t0_001.ts',
        '#EXTINF:0.834000,',
        'segments/t0_002.ts',
      ].join('\n'),
    )
  })

  describe('headers', () => {
    test('should include the sequence number in the output', () => {
      const segments: Segment[] = [{ file: 'a.ts', duration: 1.0, trackId: 0 }]

      expect(buildWindow(segments, 42)).toContain('#EXT-X-MEDIA-SEQUENCE:42')
    })

    test('should produce valid headers with no entries for an empty window', () => {
      const result = buildWindow([], 0)

      expect(result).toContain('#EXTM3U')
      expect(result).toContain('#EXT-X-TARGETDURATION:0')
      expect(result).toContain('#EXT-X-MEDIA-SEQUENCE:0')
      expect(result).not.toContain('EXTINF')
    })
  })

  describe('boundary', () => {
    test('should handle a single segment', () => {
      const segments: Segment[] = [{ file: 'only.ts', duration: 0.5, trackId: 0 }]

      const result = buildWindow(segments, 0)

      expect(result).toContain('#EXTINF:0.500000,')
      expect(result).toContain('segments/only.ts')
      expect(result).toContain('#EXT-X-TARGETDURATION:1')
    })

    test('should handle a very small fractional duration', () => {
      const segments: Segment[] = [{ file: 'tiny.ts', duration: 0.000001, trackId: 0 }]

      const result = buildWindow(segments, 0)

      expect(result).toContain('#EXTINF:0.000001,')
      expect(result).toContain('#EXT-X-TARGETDURATION:1')
    })

    test('should handle a large sequence number', () => {
      const segments: Segment[] = [{ file: 'a.ts', duration: 1.0, trackId: 0 }]

      expect(buildWindow(segments, 999999)).toContain('#EXT-X-MEDIA-SEQUENCE:999999')
    })
  })

  describe('segments', () => {
    test('should use relative paths for segment filenames', () => {
      const segments: Segment[] = [{ file: 'silence.ts', duration: 1.0, trackId: 0 }]

      const result = buildWindow(segments, 0)

      expect(result).toContain('segments/silence.ts')
    })

    test('should treat silence and track segments the same', () => {
      const segments: Segment[] = [
        { file: 't0_005.ts', duration: 1.0, trackId: 0 },
        { file: 'silence.ts', duration: 1.0, trackId: 0 },
        { file: 't1_000.ts', duration: 1.0, trackId: 1 },
      ]

      const result = buildWindow(segments, 10)

      expect(result).toContain('segments/t0_005.ts')
      expect(result).toContain('segments/silence.ts')
      expect(result).toContain('segments/t1_000.ts')
      expect(result).toContain('#EXT-X-TARGETDURATION:1')
    })
  })

  describe('TARGETDURATION', () => {
    test('should round up the longest segment duration for the target', () => {
      const segments: Segment[] = [
        { file: 'a.ts', duration: 1.5, trackId: 0 },
        { file: 'b.ts', duration: 2.3, trackId: 0 },
      ]

      const result = buildWindow(segments, 0)

      expect(result).toContain('#EXT-X-TARGETDURATION:3')
    })

    test('should not round up when max duration is an exact integer', () => {
      const segments: Segment[] = [{ file: 'a.ts', duration: 2.0, trackId: 0 }]

      const result = buildWindow(segments, 0)

      expect(result).toContain('#EXT-X-TARGETDURATION:2')
    })

    test('should set TARGETDURATION >= every segment duration', () => {
      const segments: Segment[] = [
        { file: 'a.ts', duration: 0.5, trackId: 0 },
        { file: 'b.ts', duration: 0.834, trackId: 0 },
        { file: 'c.ts', duration: 1.0, trackId: 0 },
      ]

      const result = buildWindow(segments, 0)
      const match = result.match(/#EXT-X-TARGETDURATION:(\d+)/)
      const target = Number(match![1])

      for (const seg of segments) {
        expect(target).toBeGreaterThanOrEqual(seg.duration)
      }
    })
  })
})

describe('parseM3u8', () => {
  test('should extract file and duration from each segment entry', () => {
    const m3u8 = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:2',
      '#EXTINF:1.000000,',
      't0_000.ts',
      '#EXTINF:0.834000,',
      't0_001.ts',
      '#EXT-X-ENDLIST',
    ].join('\n')

    expect(parseM3u8(m3u8)).toEqual([
      { file: 't0_000.ts', duration: 1 },
      { file: 't0_001.ts', duration: 0.834 },
    ])
  })

  describe('parsing', () => {
    test('should preserve full decimal precision on durations', () => {
      const m3u8 = ['#EXTINF:1.234567,', 'seg.ts'].join('\n')

      expect(parseM3u8(m3u8)).toEqual([{ file: 'seg.ts', duration: 1.234567 }])
    })
  })

  describe('edge cases', () => {
    test('should return nothing for empty input', () => {
      expect(parseM3u8('')).toEqual([])
    })

    test('should return nothing when playlist has headers but no segments', () => {
      const m3u8 = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:1',
        '#EXT-X-ENDLIST',
      ].join('\n')

      expect(parseM3u8(m3u8)).toEqual([])
    })

    test('should skip EXTINF when it is the last line with no filename after', () => {
      const m3u8 = ['#EXTINF:1.000000,'].join('\n')

      expect(parseM3u8(m3u8)).toEqual([])
    })

    test('should skip EXTINF followed by an empty line', () => {
      const m3u8 = ['#EXTINF:1.000000,', '', 'orphan.ts'].join('\n')

      expect(parseM3u8(m3u8)).toEqual([])
    })

    test('should parse segments with other tags interspersed', () => {
      const m3u8 = [
        '#EXTM3U',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:1.000000,',
        'a.ts',
        '#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00Z',
        '#EXTINF:2.000000,',
        'b.ts',
      ].join('\n')

      expect(parseM3u8(m3u8)).toEqual([
        { file: 'a.ts', duration: 1 },
        { file: 'b.ts', duration: 2 },
      ])
    })
  })
})
