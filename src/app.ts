/**
 * @module app
 * Express application setup: logging, static files, API routes, and 404 handling.
 * Imported by server.ts to start listening and by tests directly.
 */
import express from 'express'
import path from 'path'
import pinoHttp from 'pino-http'

import { apiRouter } from './api'
import { logger } from './logger'
import * as playout from './playout'
import * as schedule from './schedule'
import { isDev } from './util'

export const app = express()

/**
 * Wire up the schedule and playout, then start the tick loop.
 * Call before app.listen().
 * This is in a function so tests can avoid `ffmpeg` making audio segments.
 */
export async function init(): Promise<void> {
  await playout.init(() => schedule.next())
  await playout.start()
}

// 1. HTTP Logging (first, so it sees all requests)
// dev: minimal output
// prod: full pino-http defaults for observability
app.use(
  pinoHttp({
    logger,
    serializers: isDev
      ? {
          req: (req) => ({ method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        }
      : undefined,
  }),
)

// 2. Parse JSON bodies (without this, req.body is undefined)
app.use(express.json())

// 3. Serve static files from "public" dir
app.use(express.static(path.join(import.meta.dirname, '../public')))

// 4. Mount API routes
app.use('/api', apiRouter)

// 5. App-level 404 (after routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})
