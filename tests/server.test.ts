import type { Server } from 'node:http'

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { app } from '../src/app'

describe('Server', () => {
  let server: Server
  let baseUrl: string

  // Start server on a random available port, wait until it's listening
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address()
        if (!addr || typeof addr === 'string') throw new Error('Unexpected server address')
        baseUrl = `http://localhost:${addr.port}`
        resolve()
      })
    })
  })

  // Wait for all connections to close before tearing down
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test('GET /api/health returns ok', async () => {
    const resp = await fetch(`${baseUrl}/api/health`)
    expect(resp.status).toBe(200)
    expect(resp.headers.get('content-type')).toMatch(/application\/json/)
    expect(await resp.json()).toEqual({ status: 'ok' })
  })

  test('unknown route returns 404', async () => {
    const resp = await fetch(`${baseUrl}/nonexistent`)
    expect(resp.status).toBe(404)
    expect(await resp.json()).toEqual({ error: 'Not found' })
  })
})
