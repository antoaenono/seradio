/**
 * @module api
 * Mounts all API routers.
 * If you create a new route file, import it here and add it to apiRouter.
 * The apiRouter is already mounted on /api in app.ts.
 */
import { Router } from 'express'

import { audioRouter } from './audio'
import { healthRouter } from './health'

export const apiRouter = Router()

apiRouter.use(audioRouter)
apiRouter.use(healthRouter)
