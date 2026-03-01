/**
 * @module api/audio/stream
 * Serves the live HLS window and segment files.
 */
import express, { Router } from 'express'

import { SEGMENT_DIR, WINDOW_PATH } from '../../playout'

export const streamRouter = Router()

streamRouter.get('/', (req, res, next) => {
  res.set('Content-Type', 'application/vnd.apple.mpegurl')
  res.sendFile(WINDOW_PATH, (err) => {
    if (err) next(err)
  })
})

streamRouter.use('/segments', express.static(SEGMENT_DIR))
