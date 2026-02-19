/**
 * @module api/metadata
 */

import express from 'express'
import { Router } from 'express'
import path from 'path'

import { parseMp3MetadataToJson } from '.././media'

export const metadataRouter = Router()
export const app = express()

//Player metadata route
metadataRouter.get('/metadata', async (req, res, next) => {
  try {
    const filePath = path.join(
      import.meta.dirname,
      '../../media/Lobo Loco - After Midnight Walk (ID 2412).mp3',
    )
    const data = await parseMp3MetadataToJson(filePath)
    res.json(data)
  } catch (error) {
    next(error)
  }
})
