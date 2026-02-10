/**
 * @module logger
 * Pino logger instance.
 * - dev: sane stdout
 * - prod: raw JSON
 */
import pino from 'pino'

import { isDev } from './util'

// dev: pretty-print, hide pid/hostname
// prod: raw JSON (undefined = no transport -> pino defaults to JSON)
const devTransport = { target: 'pino-pretty', options: { ignore: 'pid,hostname' } }

export const logger = pino({
  transport: isDev ? devTransport : undefined,
})
