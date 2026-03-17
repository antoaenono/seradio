import { describe, expect, mock, test } from 'bun:test'

import { logger } from '../../src/logger'
import type { PlayoutDeps } from '../../src/playout'
import { _reset, history, init, nowPlaying, onDeck, start } from '../../src/playout'

logger.level = 'silent'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const waitFor = async (check: () => boolean, timeoutMs = 250): Promise<void> => {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start >= timeoutMs) throw new Error('timed out waiting for condition')
    await wait(1)
  }
}

const fakeSilence = { file: 'silence.ts', duration: 0.001 }
const fakeTone = [
  { file: 'tone_000.ts', duration: 0.001 },
  { file: 'tone_001.ts', duration: 0.001 },
]

// Generate enough fake segments to stay above buffer threshold (180)
const fakeTrackSegments = Array.from({ length: 200 }, (_, i) => ({
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
    _reset()
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
    // and transition to track 2. Fixed delays are flaky on Windows timer resolution.
    await waitFor(() => nowPlaying() === 'second.mp3')

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
    // (3 track + 3 silence), well below the 180 threshold, so tick should
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
    // the buffer threshold (180) so tick doesn't trigger runaway advances.
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

describe('onDeck', () => {
  test('should return empty when only one track is buffered', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.resolve('only.mp3'), deps)
    await start()

    expect(onDeck()).toEqual([])
  })

  test('should return the next track when buffer has two tracks', async () => {
    _reset()

    // Small segments so the buffer stays below threshold and advance fires for a second track.
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
    // Buffer is small, tick triggers advance for the second track
    await wait(10)

    expect(onDeck()).toContain('second.mp3')
  })

  test('should return multiple tracks when several small tracks are buffered', async () => {
    _reset()

    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let callCount = 0
    const tracks = ['first.mp3', 'second.mp3', 'third.mp3']

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
    // Let multiple advances fire - small segments drain fast so several
    // tracks get segmented. We just verify more than one is on deck.
    await wait(20)

    const deck = onDeck()
    expect(deck.length).toBeGreaterThanOrEqual(2)
  })

  test('should return empty before start is called', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.resolve('track.mp3'), deps)

    expect(onDeck()).toEqual([])
  })

  test('on deck track should become nowPlaying after transition', async () => {
    _reset()

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

    // Wait for track transition
    await waitFor(() => nowPlaying() === 'second.mp3')

    expect(nowPlaying()).toBe('second.mp3')
  })

  test('should not include the currently playing track', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.resolve('only.mp3'), deps)
    await start()

    expect(nowPlaying()).toBe('only.mp3')
    expect(onDeck()).not.toContain('only.mp3')
  })
})

describe('history', () => {
  test('should return empty before any track plays', async () => {
    _reset()

    expect(await history(10)).toEqual([])
  })

  test('should record the first track on start', async () => {
    _reset()
    const deps = fakeDeps()
    await init(() => Promise.resolve('first.mp3'), deps)
    await start()

    // Give the async appendFile a moment to flush
    await wait(10)
    const entries = await history(10)

    expect(entries.length).toBeGreaterThanOrEqual(1)
    expect(entries.some((e) => e.file.includes('first.mp3'))).toBe(true)
    expect(entries[entries.length - 1].timestamp).toBeTruthy()
  })

  test('should record track transitions', async () => {
    _reset()

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
    await waitFor(() => nowPlaying() === 'second.mp3')
    await wait(10)

    const entries = await history(10)
    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(entries[0].file).toContain('first.mp3')
    expect(entries[1].file).toContain('second.mp3')
  })

  test('should respect the n limit', async () => {
    _reset()

    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let callCount = 0
    const tracks = ['a.mp3', 'b.mp3', 'c.mp3']

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
    await waitFor(() => nowPlaying() === 'c.mp3', 500)
    await wait(10)

    const last1 = await history(1)
    expect(last1.length).toBe(1)
    expect(last1[0].file).toContain('c.mp3')
  })

  test('should have timestamps in chronological order', async () => {
    _reset()

    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let callCount = 0

    const deps: PlayoutDeps = {
      segmentTrack: mock(() => Promise.resolve(smallSegments)),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => {
      callCount++
      return Promise.resolve(`track${callCount}.mp3`)
    }, deps)

    await start()
    await wait(20)

    const entries = await history(10)
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].timestamp >= entries[i - 1].timestamp).toBe(true)
    }
  })
})

describe('full playback fidelity', () => {
  test('tracks should play all segments before transitioning', async () => {
    _reset()

    // Track A has 5 segments, Track B has 3 segments.
    // Each track should play all its segments + 3 silence before the next starts.
    // We observe this via writeWindow calls: the first segment's trackId tells us
    // which track is playing, and we count how many windows each trackId appears in.
    const trackASegments = Array.from({ length: 5 }, (_, i) => ({
      file: `tA_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))
    const trackBSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tB_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let callCount = 0
    const segmentSets = [trackASegments, trackBSegments]
    const tracks = ['a.mp3', 'b.mp3']

    const windowCalls: { trackId: number }[] = []

    const deps: PlayoutDeps = {
      segmentTrack: mock(() => {
        const segs = segmentSets[callCount] ?? segmentSets[segmentSets.length - 1]
        callCount++
        return Promise.resolve(segs)
      }),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock((segments) => {
        if (segments.length > 0) windowCalls.push({ trackId: segments[0].trackId })
        return Promise.resolve()
      }),
    }

    await init(() => {
      const t = tracks[callCount - 1] ?? tracks[tracks.length - 1]
      return Promise.resolve(t)
    }, deps)

    await start()
    // Wait for both tracks to drain through
    await waitFor(() => callCount >= 2 && windowCalls.length > 10, 500)
    await wait(20)

    // Count consecutive windows per trackId
    const runs: { trackId: number; count: number }[] = []
    for (const call of windowCalls) {
      const last = runs[runs.length - 1]
      if (last && last.trackId === call.trackId) {
        last.count++
      } else {
        runs.push({ trackId: call.trackId, count: 1 })
      }
    }

    // Track A (trackId 1) should have at least 5 + 3 = 8 windows (segments + silence)
    const trackARun = runs.find((r) => r.trackId === 1)
    expect(trackARun).toBeDefined()
    expect(trackARun!.count).toBeGreaterThanOrEqual(5 + 3)

    // Track B (trackId 2) should have at least 3 + 3 = 6 windows
    const trackBRun = runs.find((r) => r.trackId === 2)
    expect(trackBRun).toBeDefined()
    expect(trackBRun!.count).toBeGreaterThanOrEqual(3 + 3)
  })

  test('play order should match queue order', async () => {
    _reset()

    const smallSegments = Array.from({ length: 3 }, (_, i) => ({
      file: `tx_${String(i).padStart(3, '0')}.ts`,
      duration: 0.001,
    }))

    let callCount = 0
    const tracks = ['first.mp3', 'second.mp3', 'third.mp3']
    const playOrder: string[] = []

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
    playOrder.push(nowPlaying()!)

    // Wait for transitions and record each new track
    await waitFor(() => {
      const current = nowPlaying()
      if (current && current !== playOrder[playOrder.length - 1]) {
        playOrder.push(current)
      }
      return playOrder.length >= 3
    }, 500)

    expect(playOrder).toEqual(['first.mp3', 'second.mp3', 'third.mp3'])
  })

  test('tracks of different lengths should each play fully', async () => {
    _reset()

    // Simulate tracks of very different sizes
    const shortTrack = Array.from({ length: 2 }, (_, i) => ({
      file: `short_${i}.ts`,
      duration: 0.001,
    }))
    const longTrack = Array.from({ length: 10 }, (_, i) => ({
      file: `long_${i}.ts`,
      duration: 0.001,
    }))

    let trackCallCount = 0
    let segCallCount = 0
    const segmentSets = [shortTrack, longTrack]
    const tracks = ['short.mp3', 'long.mp3']
    const transitions: { from: string; to: string }[] = []
    let lastPlaying: string | undefined

    const deps: PlayoutDeps = {
      segmentTrack: mock(() => {
        const segs = segmentSets[segCallCount] ?? segmentSets[segmentSets.length - 1]
        segCallCount++
        return Promise.resolve(segs)
      }),
      generateSilence: mock(() => Promise.resolve(fakeSilence)),
      generateTone: mock(() => Promise.resolve(fakeTone)),
      writeWindow: mock(() => Promise.resolve()),
    }

    await init(() => {
      const t = tracks[trackCallCount] ?? tracks[tracks.length - 1]
      trackCallCount++
      return Promise.resolve(t)
    }, deps)

    await start()
    lastPlaying = nowPlaying()

    await waitFor(() => {
      const current = nowPlaying()
      if (current && current !== lastPlaying) {
        transitions.push({ from: lastPlaying!, to: current })
        lastPlaying = current
      }
      return transitions.length >= 1
    }, 500)

    // The short track should transition to the long track
    expect(transitions[0]).toEqual({ from: 'short.mp3', to: 'long.mp3' })
  })
})
