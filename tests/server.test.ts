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

  describe('page routes', () => {
    test('GET / returns 200 with text/html', async () => {
      const resp = await fetch(`${baseUrl}/`)
      expect(resp.status).toBe(200)
      expect(resp.headers.get('content-type')).toContain('text/html')
    })

    test('GET /player returns 200 with text/html', async () => {
      const resp = await fetch(`${baseUrl}/player`)
      expect(resp.status).toBe(200)
      expect(resp.headers.get('content-type')).toContain('text/html')
    })

    test('GET /dj returns 200 with text/html', async () => {
      const resp = await fetch(`${baseUrl}/dj`)
      expect(resp.status).toBe(200)
      expect(resp.headers.get('content-type')).toContain('text/html')
    })

    test('GET /queue returns 200 with text/html', async () => {
      const resp = await fetch(`${baseUrl}/queue`)
      expect(resp.status).toBe(200)
      expect(resp.headers.get('content-type')).toContain('text/html')
    })

    test('GET /admin returns 200 with text/html', async () => {
      const resp = await fetch(`${baseUrl}/admin`)
      expect(resp.status).toBe(200)
      expect(resp.headers.get('content-type')).toContain('text/html')
    })
  })

  describe('404 handling', () => {
    test('GET /nonexistent with Accept: application/json returns 404 JSON', async () => {
      const resp = await fetch(`${baseUrl}/nonexistent`, {
        headers: { Accept: 'application/json' },
      })
      expect(resp.status).toBe(404)
      expect(await resp.json()).toEqual({ error: 'Not found' })
    })

    test('GET /nonexistent with Accept: text/html returns 404 HTML', async () => {
      const resp = await fetch(`${baseUrl}/nonexistent`, {
        headers: { Accept: 'text/html' },
      })
      expect(resp.status).toBe(404)
      expect(resp.headers.get('content-type')).toContain('text/html')
    })
  })
})
