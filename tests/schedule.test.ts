import { describe, expect, test } from 'bun:test'

import * as schedule from '../src/schedule'

describe('schedule', () => {
  test('next should return pushed tracks in order', async () => {
    schedule.append('a.mp3')
    schedule.append('b.mp3')

    expect(await schedule.next()).toBe('a.mp3')
    expect(await schedule.next()).toBe('b.mp3')
  })

  test('push after drain should resume from queue', async () => {
    schedule.append('c.mp3')
    expect(await schedule.next()).toBe('c.mp3')

    schedule.append('d.mp3')
    expect(await schedule.next()).toBe('d.mp3')
  })
})
