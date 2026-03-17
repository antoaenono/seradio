/**
 * @module app
 * Express application setup: logging, static files, API routes, and 404 handling.
 * Imported by server.ts to start listening and by tests directly.
 */
import { Eta } from 'eta'
import express from 'express'
import path from 'path'
import pinoHttp from 'pino-http'

import { apiRouter } from './api'
import { logger } from './logger'
import pagesRouter from './pages'
import * as playout from './playout'
import * as queue from './queue'
import { isDev } from './util'

export const app = express()

const viewsDir = path.join(import.meta.dirname, '../views')
const eta = new Eta({ views: viewsDir })

/**
 * Wire up the queue and playout, then start the tick loop.
 * Call before app.listen().
 * This is in a function so tests can avoid `ffmpeg` making audio segments.
 */
export async function init(): Promise<void> {
  await playout.init(() => queue.next())
  await playout.start()
}

// 1. HTTP Logging (first, so it sees all requests)
// dev: minimal output
// prod: full pino-http defaults for observability
app.use(
  pinoHttp({
    logger,
    // Silence successful requests in dev to reduce noise; keep warnings/errors
    customLogLevel: isDev
      ? (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error'
          if (res.statusCode >= 400) return 'warn'
          return 'silent'
        }
      : undefined,
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

// 3. View engine (Eta)
app.engine('eta', (filePath, options, callback) => {
  try {
    const relative = path.relative(viewsDir, filePath).replace(/\.eta$/, '')
    const rendered = eta.render(relative, options as Record<string, unknown>)
    callback(null, rendered)
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)))
  }
})
app.set('view engine', 'eta')
app.set('views', viewsDir)

// 4. Page routes (Eta templates)
app.use(pagesRouter)

// 5. Serve static files from "public" dir
app.use(express.static(path.join(import.meta.dirname, '../public')))

// 6. Mount API routes
app.use('/api', apiRouter)

// 7. 404 handler, content-negotiated
app.use((_req, res) => {
  res.status(404).format({
    html: () => {
      res.render('404')
    },
    json: () => {
      res.json({ error: 'Not found' })
    },
    default: () => {
      res.json({ error: 'Not found' })
    },
  })
})
