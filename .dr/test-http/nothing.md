---
author: @antoaenono
asked: 2025-01-28
decided: 2025-01-28
status: accepted
deciders: @antoaenono @TraeDWill
tags: [tooling, testing, http]
---

# ADR: HTTP Testing

## Scenario

How should we test our HTTP endpoints?

## Pressures

### More

1. [M1] Readability
2. [M2] Execution speed
3. [M3] Exposure to HTTP fundamentals

### Less

1. [L1] Boilerplate
2. [L2] Dependency count

## Chosen Option

Nothing: native fetch (built into bun)

## Why

In the context of **testing HTTP endpoints**,
facing **the desire to learn HTTP testing fundamentals**,
we decided **to use native fetch**,
to achieve **zero dependencies and hands-on server lifecycle experience**,
accepting **more verbose test code with server lifecycle management**.

## Points

### For

- [M3] Tests exercise the real HTTP stack - server lifecycle, ports, headers
- [L2] Zero dependencies - fetch is built into bun and Node 18+

### Against

- [L1] Must manually start/stop server in each test
- [L1] Need to handle port allocation
- [M1] More verbose test code
- [M2] Real HTTP overhead (slower than in-memory)

## Consequences

- Scope server lifecycle per describe block using beforeAll/afterAll
- fetch does not throw on HTTP errors (4xx/5xx resolve successfully)
- Response body (.json(), .text()) can only be consumed once

## How

```ts
import type { Server } from 'node:http'
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
    expect(await resp.json()).toEqual({ status: 'ok' })
  })
})
```

## Reconsider

- observe: Test boilerplate becomes tedious across many test files.
  respond: Adopt supertest for cleaner syntax.

## More Info

- [MDN fetch documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
