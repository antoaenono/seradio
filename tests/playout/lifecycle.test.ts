import { describe, expect, mock, test } from 'bun:test'

import { logger } from '../../src/logger'
import type { PlayoutDeps } from '../../src/playout'
import { _reset, init, nowPlaying, start } from '../../src/playout'

logger.level = 'silent'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const fakeSilence = { file: 'silence.ts', duration: 0.001 }
const fakeTone = [
  { file: 'tone_000.ts', duration: 0.001 },
  { file: 'tone_001.ts', duration: 0.001 },
]

// Generate enough fake segments to stay above buffer threshold (360)
const fakeTrackSegments = Array.from({ length: 400 }, (_, i) => ({
  file: `t1_${String(i).padStart(3, '0')}.ts`,
  duration: 0.001,
}))

function fakeDeps(): PlayoutDeps {
  return {
    segmentTrack: mock(() => Promise.resolve(fakeTrackSegments)),
    generateSilence: mock(() => Promise.resolve(fakeSilence)),
    generateTone: mock(() => Promise.resolve(fakeTone)),
    writeWindow: mock(() => Promise.resolve()),
  }
}

describe('init', () => {
  test('should generate silence and tone segments', async () => {
    const deps = fakeDeps()
    await init(() => Promise.resolve('track.mp3'), deps)

    expect(deps.generateSilence).toHaveBeenCalledTimes(1)
    expect(deps.generateTone).toHaveBeenCalledTimes(1)
  })

  test('should accept partial deps without overriding others', async () => {
    _reset()
    const partialDeps: PlayoutDeps = {
      writeWindow: mock(() => Promise.resolve()),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
    }
    // No segmentTrack provided; init should still succeed
    await init(() => Promise.resolve('track.mp3'), partialDeps)

    expect(partialDeps.generateSilence).toHaveBeenCalledTimes(1)
    expect(partialDeps.generateTone).toHaveBeenCalledTimes(1)
  })
})

describe('start', () => {
  test('should segment a track and write the initial window', async () => {
    const deps = fakeDeps()
    await init(() => Promise.resolve('first.mp3'), deps)
    await start()

    expect(deps.segmentTrack).toHaveBeenCalledTimes(1)
    expect(deps.writeWindow).toHaveBeenCalledTimes(1)
  })

  test('should set nowPlaying to the first track path', async () => {
    const deps = fakeDeps()
    await init(() => Promise.resolve('first.mp3'), deps)
    await start()

    expect(nowPlaying()).toBe('first.mp3')
  })
})

describe('start with fallback', () => {
  test('should fill buffer with tone when no tracks available', async () => {
    const deps = fakeDeps()
    await init(() => Promise.reject(new Error('no tracks')), deps)
    await start()

    expect(deps.segmentTrack).not.toHaveBeenCalled()
    expect(deps.writeWindow).toHaveBeenCalledTimes(1)
  })

  test('should set nowPlaying to undefined during fallback tone', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.reject(new Error('no tracks')), deps)
    await start()

    expect(nowPlaying()).toBeUndefined()
  })
})

describe('tick', () => {
  test('should write an updated window after a segment elapses', async () => {
    const deps = fakeDeps()
    await init(() => Promise.resolve('tick-test.mp3'), deps)
    await start()

    // start() calls writeWindow once; wait for at least one tick to fire
    const callsBefore = (deps.writeWindow as ReturnType<typeof mock>).mock.calls.length
    await wait(10)
    const callsAfter = (deps.writeWindow as ReturnType<typeof mock>).mock.calls.length

    expect(callsAfter).toBeGreaterThan(callsBefore)
  })

  test('should update nowPlaying when the track changes', async () => {
    _reset()

    // Small segments so the buffer drains quickly and triggers a track transition.
    // First call returns 3 segments (track 1), second returns 3 segments (track 2).
    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let callCount = 0
    const tracks = ['first.mp3', 'second.mp3']

    const deps: PlayoutDeps = {
      segmentTrack: mock(() => Promise.resolve(smallSegments)),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => {
      const track = tracks[callCount] ?? tracks[tracks.length - 1]
      callCount++
      return Promise.resolve(track)
    }, deps)

    await start()
    expect(nowPlaying()).toBe('first.mp3')

    // Wait for ticks to drain through track 1's segments + silence gap
    // and trigger advance for track 2, then transition to it.
    await wait(10)

    expect(nowPlaying()).toBe('second.mp3')
  })

  test('should trigger advance when buffer drops below threshold', async () => {
    _reset()

    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    const deps: PlayoutDeps = {
      segmentTrack: mock(() => Promise.resolve(smallSegments)),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => Promise.resolve('any.mp3'), deps)
    await start()

    // start() calls segmentTrack once (for advance). Buffer starts with 6 segments
    // (3 track + 3 silence), well below the 360 threshold, so tick should
    // trigger additional advance calls.
    const callsBefore = (deps.segmentTrack as ReturnType<typeof mock>).mock.calls.length
    await wait(10)
    const callsAfter = (deps.segmentTrack as ReturnType<typeof mock>).mock.calls.length

    expect(callsAfter).toBeGreaterThan(callsBefore)
  })
})

describe('error recovery', () => {
  test('should skip a bad track and advance to the next one', async () => {
    _reset()

    // Small segments so the buffer stays below threshold and tick keeps
    // triggering advance. First track succeeds (starts the tick loop),
    // next advance's ffmpeg fails, the one after succeeds.
    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let startCalled = false
    let failedOnce = false
    const deps: PlayoutDeps = {
      segmentTrack: mock(() => {
        if (!startCalled || failedOnce) return Promise.resolve(smallSegments)
        failedOnce = true
        return Promise.reject(new Error('ffmpeg: corrupt file'))
      }),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => Promise.resolve('any.mp3'), deps)

    await start()
    startCalled = true
    expect(nowPlaying()).toBe('any.mp3')

    // Tick loop drains the small buffer, triggering advances.
    // First tick-triggered advance fails (ffmpeg), next one succeeds.
    await wait(10)

    expect(failedOnce).toBe(true)
    expect((deps.segmentTrack as ReturnType<typeof mock>).mock.calls.length).toBeGreaterThanOrEqual(
      3,
    )
  })

  test('should not fall back to tone when ffmpeg fails but schedule has tracks', async () => {
    _reset()

    // First track succeeds (starts the tick loop), second fails on ffmpeg,
    // third succeeds. The tone fallback should never be used because
    // getNextTrack never throws.
    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let startCalled = false
    let failedOnce = false
    const deps: PlayoutDeps = {
      segmentTrack: mock(() => {
        // Let start()'s advance always succeed. After that, fail once.
        if (!startCalled || failedOnce) return Promise.resolve(smallSegments)
        failedOnce = true
        return Promise.reject(new Error('ffmpeg: bad file'))
      }),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => Promise.resolve('any.mp3'), deps)
    await start()
    startCalled = true
    await wait(10)

    // segmentTrack was called multiple times (real tracks, not tone).
    expect(failedOnce).toBe(true)
    expect((deps.segmentTrack as ReturnType<typeof mock>).mock.calls.length).toBeGreaterThanOrEqual(
      3,
    )
  })

  test('should keep retrying advance on subsequent threshold checks', async () => {
    _reset()

    // First track succeeds (starts tick loop). Next two tick-triggered
    // advances fail. Then it succeeds again. Shows the tick loop keeps
    // retrying, not just once.
    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let startCalled = false
    let failCount = 0
    const deps: PlayoutDeps = {
      segmentTrack: mock(() => {
        if (!startCalled) return Promise.resolve(smallSegments)
        if (failCount < 2) {
          failCount++
          return Promise.reject(new Error('ffmpeg: bad file'))
        }
        return Promise.resolve(smallSegments)
      }),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => Promise.resolve('any.mp3'), deps)
    await start()
    startCalled = true
    await wait(10)

    // Failed twice, then recovered
    expect(failCount).toBe(2)
    expect((deps.segmentTrack as ReturnType<typeof mock>).mock.calls.length).toBeGreaterThanOrEqual(
      4,
    )
  })

  test('should fall back to tone only when schedule has nothing', async () => {
    _reset()

    const deps = fakeDeps()

    // getNextTrack always throws - schedule is empty
    await init(() => Promise.reject(new Error('no tracks')), deps)
    await start()

    // segmentTrack never called - we went straight to tone
    expect(deps.segmentTrack).not.toHaveBeenCalled()

    // Stream is still playing (writeWindow was called)
    expect(deps.writeWindow).toHaveBeenCalled()

    // nowPlaying is undefined during tone fallback
    expect(nowPlaying()).toBeUndefined()
  })
})

describe('nowPlaying', () => {
  test('should remain stable across ticks within the same track', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.resolve('steady.mp3'), deps)
    await start()

    expect(nowPlaying()).toBe('steady.mp3')

    // Let several ticks fire (all within the same large track)
    await wait(10)

    expect(nowPlaying()).toBe('steady.mp3')
  })

  test('should return undefined before start is called', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.resolve('track.mp3'), deps)

    expect(nowPlaying()).toBeUndefined()
  })

  test('should return the track path during silence gap', async () => {
    _reset()

    // 3 short segments at the front, then enough padding to stay above
    // the buffer threshold (360) so tick doesn't trigger runaway advances.
    // Tick drains the 3 short segments into the silence gap; nowPlaying
    // should still return the track path because silence shares the trackId.
    const shortSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))
    const padding = Array.from({ length: 400 }, (_, i) => ({
      file: `pad_${String(i).padStart(3, '0')}.ts`,
      duration: 10, // long duration so ticks don't reach these
    }))

    const deps: PlayoutDeps = {
      segmentTrack: mock(() => Promise.resolve([...shortSegments, ...padding])),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => Promise.resolve('silence-test.mp3'), deps)
    await start()

    // Wait for the 3 short segments to drain into the silence gap
    await wait(10)

    // Still the same track - silence segments share the trackId
    expect(nowPlaying()).toBe('silence-test.mp3')
  })
})
