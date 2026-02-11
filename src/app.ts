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
import { parseMp3MetadataToJson } from './media'
import { isDev } from './util'

export const app = express()

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

// 5. Player metadata route
app.get('/metadata', async (req, res, next) => {
  try {
    const filePath = path.join(
      import.meta.dirname,
      '../public/media/Lobo Loco - After Midnight Walk (ID 2412).mp3',
    )
    const data = await parseMp3MetadataToJson(filePath)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

// 6. App-level 404 (after routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})
