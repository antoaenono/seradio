/**
 * @module app
 * Express application setup: logging, static files, API routes, and 404 handling.
 * Imported by server.ts to start listening and by tests directly.
 */
import { readFileSync } from 'node:fs'

import { Eta } from 'eta'
import express from 'express'
import path from 'path'
import pinoHttp from 'pino-http'

import { apiRouter } from './api'
import { logger } from './logger'
import * as playout from './playout'
import * as queue from './queue'
import { isDev } from './util'

export const app = express()

type NavPage = 'home' | 'queue' | 'player' | 'dj' | 'admin'

const eta = new Eta()
const viewsDir = path.join(import.meta.dirname, './views')
const pageLayoutPath = path.join(viewsDir, 'layouts/page.eta')

type PageConfig = {
  title: string
  stylesheetHref: string
  scripts: string[]
  headExtra?: string
}

const navItems: { key: NavPage; label: string; href: string }[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'queue', label: 'Queue', href: '/queue/' },
  { key: 'player', label: 'Player', href: '/player/' },
  { key: 'dj', label: 'DJ', href: '/DJ/' },
  { key: 'admin', label: 'Admin', href: '/admin/' },
]

function renderNavbar(activePage: NavPage): string {
  const links = navItems
    .map((item) => {
      const activeClass = item.key === activePage ? ' class="active"' : ''
      return `<li><a href="${item.href}"${activeClass}>${item.label}</a></li>`
    })
    .join('')

  return [
    '<nav id="navbar">',
    '<div class="nav-brand"><a href="/">SeRadio</a></div>',
    `<ul class="nav-links">${links}</ul>`,
    '<button id="nav-toggle" aria-label="Toggle navigation">&#9776;</button>',
    '</nav>',
  ].join('')
}

function renderScripts(srcs: string[]): string {
  return srcs.map((src) => `<script src="${src}"></script>`).join('\n    ')
}

function renderPage(
  view: string,
  activePage: NavPage,
  pageConfig: PageConfig,
): express.RequestHandler {
  return (req, res, next) => {
    try {
      const pageTemplatePath = path.join(viewsDir, `${view}.eta`)
      const pageTemplate = readFileSync(pageTemplatePath, 'utf-8')
      const layoutTemplate = readFileSync(pageLayoutPath, 'utf-8')

      const pageBody = eta.renderString(pageTemplate, {}) ?? ''
      const rendered =
        eta.renderString(layoutTemplate, {
          title: pageConfig.title,
          stylesheetHref: pageConfig.stylesheetHref,
          headExtra: pageConfig.headExtra ?? '',
          navbar: renderNavbar(activePage),
          body: pageBody,
          scripts: renderScripts(pageConfig.scripts),
        }) ?? ''

      res.send(rendered)
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Wire up the queue and playout, then start the tick loop.
 * Call before app.listen().
 * This is in a function so tests can avoid `ffmpeg` making audio segments.
 */
export async function init(): Promise<void> {
  await playout.init(() => queue.next())
  await playout.start()
}

// 1. HTTP Logging (first, so it sees all requests)
// dev: minimal output
// prod: full pino-http defaults for observability
app.use(
  pinoHttp({
    logger,
    // Silence successful requests in dev to reduce noise; keep warnings/errors
    customLogLevel: isDev
      ? (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error'
          if (res.statusCode >= 400) return 'warn'
          return 'silent'
        }
      : undefined,
    serializers: isDev
      ? {
          req: (req) => ({ method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        }
      : undefined,
  }),
)

// 2. Parse JSON bodies (without this, req.body is undefined)
app.use(express.json())

// 3. Template engine + page routes
app.engine('eta', (filePath, options, callback) => {
  try {
    const template = readFileSync(filePath, 'utf-8')
    const rendered = eta.renderString(template, options)
    callback(null, rendered)
  } catch (error) {
    callback(error as Error)
  }
})

app.set('view engine', 'eta')
app.set('views', viewsDir)

app.get(
  '/',
  renderPage('pages/index', 'home', {
    title: 'SeRadio',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', '/schedule-store.js', 'index.js'],
  }),
)
app.get(
  '/queue',
  renderPage('pages/queue', 'queue', {
    title: 'SeRadio - Queue',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', 'index.js'],
  }),
)
app.get(
  '/queue/',
  renderPage('pages/queue', 'queue', {
    title: 'SeRadio - Queue',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', 'index.js'],
  }),
)
app.get(
  '/player',
  renderPage('pages/player', 'player', {
    title: 'SeRadio Player',
    stylesheetHref: 'index.css',
    headExtra: '<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>',
    scripts: ['/seradio-prefs.js', 'index.js'],
  }),
)
app.get(
  '/player/',
  renderPage('pages/player', 'player', {
    title: 'SeRadio Player',
    stylesheetHref: 'index.css',
    headExtra: '<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>',
    scripts: ['/seradio-prefs.js', 'index.js'],
  }),
)
app.get(
  '/DJ',
  renderPage('pages/dj', 'dj', {
    title: 'SeRadio &mdash; DJ',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', '/schedule-store.js', 'index.js'],
  }),
)
app.get(
  '/DJ/',
  renderPage('pages/dj', 'dj', {
    title: 'SeRadio &mdash; DJ',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', '/schedule-store.js', 'index.js'],
  }),
)
app.get(
  '/admin',
  renderPage('pages/admin', 'admin', {
    title: 'SeRadio &mdash; Admin',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', 'index.js'],
  }),
)
app.get(
  '/admin/',
  renderPage('pages/admin', 'admin', {
    title: 'SeRadio &mdash; Admin',
    stylesheetHref: 'index.css',
    scripts: ['/seradio-prefs.js', 'index.js'],
  }),
)

// 4. Serve static files from "public" dir
app.use(express.static(path.join(import.meta.dirname, '../public')))

// 5. Mount API routes
app.use('/api', apiRouter)

// 6. App-level 404 (after routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})
