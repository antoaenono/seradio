/**
 * @module api/playout
 * Queue management and media listing for the playout page.
 */
import { readdir } from 'node:fs/promises'

import { Router } from 'express'
import path from 'path'

import { isMp3File } from '../audio'
import { logger } from '../logger'
import { history, onDeck } from '../playout'
import * as queue from '../queue'

const AUDIO_DIR = path.join(import.meta.dirname, '../../media')

export const playoutRouter = Router()

/** GET /api/playout/status - on deck tracks (already segmented, can't change). */
playoutRouter.get('/status', (req, res) => {
  const deck = onDeck()
  res.json({
    onDeck: deck.map((p) => p.split('/').pop() ?? p),
  })
})

/** GET /api/playout/history - last N played tracks (default 2). */
playoutRouter.get('/history', async (req, res, next) => {
  try {
    const n = Math.max(1, Number(req.query.n) || 2)
    const entries = await history(n)
    const items = entries.map((e) => ({
      timestamp: e.timestamp,
      file: e.file.split('/').pop() ?? e.file,
    }))
    res.json({ history: items })
  } catch (error) {
    next(error)
  }
})

/** GET /api/playout/media - list available mp3 files. */
playoutRouter.get('/media', async (req, res, next) => {
  try {
    const files = await readdir(AUDIO_DIR)
    const mp3s = files.filter(isMp3File).sort((a, b) => a.localeCompare(b))
    res.json({ files: mp3s })
  } catch (error) {
    next(error)
  }
})

/** GET /api/playout/schedule - return the current queue as filenames. */
playoutRouter.get('/schedule', (req, res) => {
  const paths = queue.list()
  const items = paths.map((p) => p.split('/').pop() ?? p)
  res.json({ schedule: items })
})

/** POST /api/playout/schedule - append a track by filename. Body: { file: "song.mp3" } */
playoutRouter.post('/schedule', (req, res) => {
  const { file } = req.body ?? {}
  if (!file || typeof file !== 'string' || !isMp3File(file)) {
    logger.warn({ file }, 'queue append rejected, invalid file')
    res.status(400).json({ error: 'file must be an .mp3 filename' })
    return
  }

  queue.append(path.join(AUDIO_DIR, file))
  logger.info({ file }, 'track queued')
  res.json({ ok: true })
})

/** DELETE /api/playout/schedule/:index - remove a track by queue position. */
playoutRouter.delete('/schedule/:index', (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    logger.warn({ index: req.params.index }, 'queue remove rejected, bad index')
    res.status(400).json({ error: 'index must be a non-negative integer' })
    return
  }

  const removed = queue.remove(index)
  if (removed === undefined) {
    logger.warn({ index }, 'queue remove rejected, index out of range')
    res.status(404).json({ error: 'index out of range' })
    return
  }
  const file = removed.split('/').pop()
  logger.info({ index, file }, 'track removed from queue')
  res.json({ ok: true, removed: file })
})
