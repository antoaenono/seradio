/**
 * @module server
 * Entry point. Starts the Express server on the configured port.
 */
import { app } from './app'
import { logger } from './logger'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`)
})
