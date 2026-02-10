---
author: @antoaenono
asked: 2025-01-28
decided: 2025-01-28
status: accepted
deciders: @antoaenono @TraeDWill
tags: [backend, http, framework]
---

# ADR: HTTP Framework

## Scenario

Which HTTP framework should we use for our backend API?

## Pressures

### More

1. [M1] Community support
2. [M2] Exposure to HTTP fundamentals
3. [M3] Performance
4. [M4] Portability

### Less

1. [L1] Boilerplate
2. [L2] Learning curve
3. [L3] Dependency count

## Chosen Option

Express as the HTTP framework

## Why

In the context of **choosing an HTTP framework**,
facing **common HTTP concerns**,
we decided **to use Express**,
to achieve **a familiar, well-documented framework with the largest middleware ecosystem**,
accepting **older callback-style API and moderate performance**.

## Points

### For

- [M1] Largest middleware ecosystem (cors, helmet, compression, pino-http, etc.)
- [M1] Most tutorials, Stack Overflow answers, and learning resources
- [L1] Built-in routing, static file serving, error handling
- [L2] Most widely known Node.js framework - easiest to onboard

### Against

- [M2] Abstracts HTTP details behind req/res/next convenience methods
- [M3] Slower than bun-native alternatives (Bun.serve, Elysia, Hono)
- [L3] Adds express and @types/express as dependencies
- [M4] Runs on Node and bun, but not edge runtimes (Cloudflare Workers, Deno)

## Consequences

- Add `express` and `@types/express` to dependencies
- Familiar middleware pattern: `app.use()`, `app.get()`, etc.
- Works with bun (bun runs Express without issues)
- Large ecosystem of compatible middleware

## How

```ts
import express from 'express'

const app = express()

app.use(express.json())
app.use(express.static('public'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(3000)
```

## Reconsider

- observe: Performance becomes a bottleneck.
  respond: Evaluate Hono or Elysia for better throughput.
- observe: Express v5 introduces breaking changes or stalls.
  respond: Evaluate Hono as a drop-in-style replacement.

## More Info

- [Express documentation](https://expressjs.com/)
- [Express with bun](https://bun.sh/guides/ecosystem/express)
