/**
 * @module pages
 * This module defines the routes for the different pages of the application.
 */

import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.render('index')
})

router.get('/player', (_req, res) => {
  res.render('player')
})

router.get('/dj', (_req, res) => {
  res.render('dj')
})

router.get('/queue', (_req, res) => {
  res.render('queue')
})

router.get('/admin', (_req, res) => {
  res.render('admin')
})

export default router
