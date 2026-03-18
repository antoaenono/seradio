/**
 * @module api/queue
 * Mounts queue API routes under /queue prefix.
 */
import { Router } from 'express'

import { queueRouter } from './routes'

export const queueApiRouter = Router()

queueApiRouter.use('/queue', queueRouter)
