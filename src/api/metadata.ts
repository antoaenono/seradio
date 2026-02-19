/**
 * @module api/metadata
 */

import express from 'express'
import { Router } from 'express'

import { firstMp3, parseMp3MetadataToJson } from '.././media'

export const metadataRouter = Router()
export const app = express()

//Player metadata route
metadataRouter.get('/metadata', async (req, res, next) => {
  try {
    const filePath = await firstMp3()
    const data = await parseMp3MetadataToJson(filePath)
    res.json(data)
  } catch (error) {
    next(error)
  }
})
