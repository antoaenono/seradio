/**
 * @module api/audio/metadata
 * Serves ID3 metadata (title, artist, album, etc.) for the current track.
 */
import { Router } from 'express'

import { getRandomMp3, parseMp3MetadataToJson } from '../../audio'

export const metadataRouter = Router()

metadataRouter.get('/', async (req, res, next) => {
  try {
    const filePath: string = await getRandomMp3()
    const data = await parseMp3MetadataToJson(filePath)
    res.json(data)
  } catch (error) {
    next(error)
  }
})
