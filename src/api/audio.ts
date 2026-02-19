/**
 * @module api/audio
 */
import { Router } from 'express'
import path from 'path'

export const audioRouter = Router()

audioRouter.get('/audio', (req, res, next) => {
  const filePath = path.join(
    import.meta.dirname,
    '../../media/Lobo Loco - After Midnight Walk (ID 2412).mp3',
  )
  res.sendFile(filePath, (err) => {
    if (err) next(err)
  })
})
