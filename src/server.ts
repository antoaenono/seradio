/**
 * @module server
 * Entry point. Initializes the app and starts listening.
 */
import { app, init } from './app'
import { logger } from './logger'

const PORT = process.env.PORT || 3000

/**
 * Run initialization before exposing the Express server.
 */
async function start(): Promise<void> {
  await init()

  app.listen(PORT, () => {
    logger.info(`Server running at http://localhost:${PORT}`)
  })
}

await start()
