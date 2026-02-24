/**
 * @module api/audio
 * Mounts audio API routes under /audio prefix.
 */
import { Router } from 'express'

import { metadataRouter } from './metadata'
import { streamRouter } from './stream'

export const audioRouter = Router()

audioRouter.use('/audio', streamRouter)
audioRouter.use('/audio/metadata', metadataRouter)
