/// <reference lib="dom" />

/* seradio-prefs.js created with help from Github Copilot */

/**
 * seradio-prefs.js — Shared preferences loader.
 * Include on any page to apply the user's saved dark-mode and accent color.
 * Also exposes `window.seradioPrefs` for page-specific code to read.
 */
;(function () {
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  }

  const DEFAULTS = {
    darkMode: false,
    accentColor: '#70d598',
    defaultVolume: 80,
    autoplay: false,
    genres: [],
    displayName: '',
    showNotifications: false,
  }

  let prefs = DEFAULTS
  try {
    const raw = getCookie('seradio_settings')
    if (raw) prefs = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* keep defaults */
  }

  // Apply dark mode
  if (prefs.darkMode) document.body.classList.add('dark')

  // Apply accent color as CSS variable
  document.documentElement.style.setProperty('--accent', prefs.accentColor)

  // Expose for other scripts
  window.seradioPrefs = prefs
})()
