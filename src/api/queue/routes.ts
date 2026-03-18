/**
 * @module api/queue
 * Queue management, on-deck status, history, and media listing for the playout page.
 */
import { readdir } from 'node:fs/promises'

import { Router } from 'express'
import path from 'path'

import { isMp3File } from '../../audio'
import { logger } from '../../logger'
import { history, onDeck } from '../../playout'
import * as queue from '../../queue'

const AUDIO_DIR = path.join(import.meta.dirname, '../../../media')

/** Extract just the filename from an absolute path. */
const _basename = (p: string): string => p.split('/').pop() ?? p

export const queueRouter = Router()

/** GET /api/queue/on-deck - tracks already segmented, can't change. */
queueRouter.get('/on-deck', (req, res) => {
  const deck = onDeck()
  res.json({
    onDeck: deck.map((p) => _basename(p)),
  })
})

queueRouter.get('/history', async (req, res, next) => {
  try {
    const n = Number(req.query.n) || 1
    const entries = await history(n)
    const items = entries.map((e) => ({
      timestamp: e.timestamp,
      file: _basename(e.file),
    }))
    res.json({ history: items })
  } catch (error) {
    next(error)
  }
})

/** GET /api/queue/media - list available mp3 files. */
queueRouter.get('/media', async (req, res, next) => {
  try {
    const files = await readdir(AUDIO_DIR)
    const mp3s = files.filter(isMp3File).sort((a, b) => a.localeCompare(b))
    res.json({ files: mp3s })
  } catch (error) {
    next(error)
  }
})

/** GET /api/queue/queue - return the current queue as filenames. */
queueRouter.get('/queue', (req, res) => {
  const paths = queue.list()
  const items = paths.map((p) => _basename(p))
  res.json({ queue: items })
})

/** POST /api/queue/queue - append a track by filename. Body: { file: "song.mp3" } */
queueRouter.post('/queue', (req, res) => {
  const { file } = req.body ?? {}
  if (!file || typeof file !== 'string' || !isMp3File(file)) {
    logger.warn({ file }, 'queue append rejected, invalid file')
    res.status(400).json({ error: 'file must be an .mp3 filename' })
    return
  }

  if (file !== path.basename(file)) {
    logger.warn({ file }, 'queue append rejected, path traversal')
    res.status(400).json({ error: 'file must be a plain filename' })
    return
  }

  queue.append(path.join(AUDIO_DIR, file))
  logger.info({ file }, 'track queued')
  res.json({ ok: true })
})

/** DELETE /api/queue/queue/:index - remove a track by queue position. */
queueRouter.delete('/queue/:index', (req, res) => {
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
  const file = _basename(removed)
  logger.info({ index, file }, 'track removed from queue')
  res.json({ ok: true, removed: file })
})
