import { describe, expect, test } from 'bun:test'

import * as queue from '../src/queue'

describe('queue', () => {
  test('next should return pushed tracks in order', async () => {
    queue.append('a.mp3')
    queue.append('b.mp3')

    expect(await queue.next()).toBe('a.mp3')
    expect(await queue.next()).toBe('b.mp3')
  })

  test('push after drain should resume from queue', async () => {
    queue.append('c.mp3')
    expect(await queue.next()).toBe('c.mp3')

    queue.append('d.mp3')
    expect(await queue.next()).toBe('d.mp3')
  })
})
