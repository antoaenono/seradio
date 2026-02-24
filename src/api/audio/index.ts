/**
 * @module api/audio
 * Mounts audio API routes under /audio prefix.
 */
import { Router } from 'express'

import { metadataRouter } from './metadata'

export const audioRouter = Router()

audioRouter.use('/audio/metadata', metadataRouter)
