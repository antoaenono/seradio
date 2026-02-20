/**
 * @module api/audio
 */
import { Router } from 'express'

import { firstMp3 } from '../media'

export const audioRouter = Router()

audioRouter.get('/audio', async (req, res, next) => {
  try {
    const filePath = await firstMp3()
    res.sendFile(filePath, (err) => {
      if (err) next(err)
    })
  } catch (err) {
    next(err)
  }
})
