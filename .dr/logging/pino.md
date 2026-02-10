---
author: @antoaenono
asked: 2025-01-28
decided: 2025-01-28
status: accepted
deciders: @antoaenono @TraeDWill
tags: [tooling, logging, observability]
---

# ADR: Logging Library

## Scenario

Which logging library should we use for our server?

## Pressures

### More

1. [M1] Readable CLI output
2. [M2] Structured output
3. [M3] Community support
4. [M4] Performance

### Less

1. [L1] Configuration complexity
2. [L2] Dependency count

## Chosen Option

Pino as the logging library

## Why

In the context of **adding structured logging to our server**,
facing **the need for readable, observable, filterable logs**,
we decided **to use pino**,
to achieve **readable, fast, structured JSON logging with minimal overhead**,
accepting **requiring pino-pretty for readable CLI output**.

## Points

### For

- [M1] Readable dev output via pino-pretty, structured JSON in production
- [M2] JSON-first structured output, ready for log aggregation
- [M2] Built-in log levels with filtering
- [M3] Widely used with Express (pino-http)
- [M3] Extensive documentation
- [M4] Fastest Node.js logger (~5x faster than winston)
- [M4] Low CPU and memory overhead

### Against

- [L1] Requires pino-pretty configuration for dev readability
- [L2] Adds pino, pino-http, and pino-pretty (dev) to dependencies

## Consequences

- Add `pino` to dependencies
- Add `pino-pretty` to devDependencies (readable dev output)
- Add `pino-http` for Express request logging middleware
- JSON structured logs ready for production log aggregation (CloudWatch, Datadog, etc.)
- In development, pino-pretty formats JSON logs into colored, human-readable output

## How

```ts
import pino from 'pino'

const logger = pino()
logger.info('server started')
logger.error({ err }, 'request failed')
```

```ts
// Express middleware
import pinoHttp from 'pino-http'
app.use(pinoHttp({ logger }))
```

## Reconsider

- observe: Pino introduces breaking changes or bun compatibility issues.
  respond: Evaluate consola or winston as alternatives.
- observe: Team finds JSON logs too noisy even with pino-pretty.
  respond: Evaluate consola for developer-friendly output.

## More Info

- [Pino documentation](https://github.com/pinojs/pino)
- [pino-http](https://github.com/pinojs/pino-http)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
