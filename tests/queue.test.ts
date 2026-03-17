import { beforeEach, describe, expect, test } from 'bun:test'

import { append, list, next, remove } from '../src/queue'

// The queue module uses shared state, so we drain it before each test.
// There's no reset export, so we pop everything via next().
beforeEach(async () => {
  while (list().length > 0) await next()
})

describe('append', () => {
  test('should add a track to an empty queue', () => {
    append('a.mp3')

    expect(list()).toEqual(['a.mp3'])
  })

  test('should add multiple tracks in order', () => {
    append('a.mp3')
    append('b.mp3')
    append('c.mp3')

    expect(list()).toEqual(['a.mp3', 'b.mp3', 'c.mp3'])
  })
})

describe('list', () => {
  test('should return an empty array when the queue is empty', () => {
    expect(list()).toEqual([])
  })

  test('should return a copy, not the internal array', () => {
    append('a.mp3')

    const snapshot = list()
    snapshot.push('injected.mp3')

    expect(list()).toEqual(['a.mp3'])
  })

  test('should reflect removals', () => {
    append('a.mp3')
    append('b.mp3')
    remove(0)

    expect(list()).toEqual(['b.mp3'])
  })
})

describe('remove', () => {
  test('should remove the track at the given index', () => {
    append('a.mp3')
    append('b.mp3')
    append('c.mp3')

    const removed = remove(1)

    expect(removed).toBe('b.mp3')
    expect(list()).toEqual(['a.mp3', 'c.mp3'])
  })

  test('should remove the first track at index 0', () => {
    append('a.mp3')
    append('b.mp3')

    expect(remove(0)).toBe('a.mp3')
    expect(list()).toEqual(['b.mp3'])
  })

  test('should remove the last track', () => {
    append('a.mp3')
    append('b.mp3')

    expect(remove(1)).toBe('b.mp3')
    expect(list()).toEqual(['a.mp3'])
  })

  test('should return undefined for a negative index', () => {
    append('a.mp3')

    expect(remove(-1)).toBeUndefined()
    expect(list()).toEqual(['a.mp3'])
  })

  test('should return undefined for an out-of-bounds index', () => {
    append('a.mp3')

    expect(remove(5)).toBeUndefined()
    expect(list()).toEqual(['a.mp3'])
  })

  test('should return undefined on an empty queue', () => {
    expect(remove(0)).toBeUndefined()
  })

  test('should handle removing the only element', () => {
    append('only.mp3')

    expect(remove(0)).toBe('only.mp3')
    expect(list()).toEqual([])
  })
})

describe('next', () => {
  test('should pop tracks in FIFO order', async () => {
    append('a.mp3')
    append('b.mp3')

    expect(await next()).toBe('a.mp3')
    expect(await next()).toBe('b.mp3')
  })

  test('should drain the queue one at a time', async () => {
    append('a.mp3')

    await next()

    expect(list()).toEqual([])
  })

  test('should resume after drain when new tracks are appended', async () => {
    append('a.mp3')
    await next()

    append('b.mp3')

    expect(await next()).toBe('b.mp3')
  })
})

describe('interactions', () => {
  test('remove then next should skip the removed track', async () => {
    append('a.mp3')
    append('b.mp3')
    append('c.mp3')
    remove(1) // remove b

    expect(await next()).toBe('a.mp3')
    expect(await next()).toBe('c.mp3')
  })

  test('append after partial drain should enqueue at the end', async () => {
    append('a.mp3')
    append('b.mp3')
    await next() // pop a

    append('c.mp3')

    expect(list()).toEqual(['b.mp3', 'c.mp3'])
  })

  test('remove all then append should work like a fresh queue', async () => {
    append('a.mp3')
    append('b.mp3')
    remove(0)
    remove(0)

    append('c.mp3')

    expect(list()).toEqual(['c.mp3'])
    expect(await next()).toBe('c.mp3')
  })

  test('next and remove interleaved should maintain correct order', async () => {
    append('a.mp3')
    append('b.mp3')
    append('c.mp3')
    append('d.mp3')

    expect(await next()).toBe('a.mp3') // pop a
    remove(1) // remove c (now at index 1)

    expect(list()).toEqual(['b.mp3', 'd.mp3'])
    expect(await next()).toBe('b.mp3')
    expect(await next()).toBe('d.mp3')
  })

  test('list should be stable across repeated calls without mutations', () => {
    append('a.mp3')
    append('b.mp3')

    expect(list()).toEqual(list())
  })
})
