/**
 * @module api/audio/metadata
 * Serves ID3 metadata (title, artist, album, etc.) for the current track.
 */
import { Router } from 'express'

import { parseMp3MetadataToJson } from '../../audio'
import { nowPlaying } from '../../playout'

export const metadataRouter = Router()

metadataRouter.get('/', async (req, res, next) => {
  try {
    const filePath = nowPlaying()
    if (!filePath) {
      res.json({ error: 'No track currently playing' })
      return
    }
    const data = await parseMp3MetadataToJson(filePath)
    res.json(data)
  } catch (error) {
    next(error)
  }
})
