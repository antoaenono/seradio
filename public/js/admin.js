/// <reference lib="dom" />

// Admin Page js created with help from Github Copilot

// Cookie helpers

// Write a cookie that expires in 1 month.
function setCookie(name, value) {
  const d = new Date()
  d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

// Read a cookie by name, or return null. Assumes cookies are well-formed.
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

// Delete a cookie by setting expiry to unix epoch
function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`
}

// Default settings values

const DEFAULTS = {
  darkMode: false,
  accentColor: '#70d598',
  defaultVolume: 80,
  autoplay: false,
  genres: [],
  displayName: '',
  showNotifications: false,
}

// Placeholder for future functionality
const GENRES = ['Jazz', 'Rock', 'Pop', 'Hip-Hop', 'Electronic']

// Load settings from cookies, falling back to defaults if not set or on parse error

function loadSettings() {
  const raw = getCookie('seradio_settings')
  if (!raw) return { ...DEFAULTS }
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings) {
  setCookie('seradio_settings', JSON.stringify(settings))
}

// DOM refs

const darkModeEl = document.getElementById('dark-mode')
const accentColorEl = document.getElementById('accent-color')
const defaultVolumeEl = document.getElementById('default-volume')
const volumeLabelEl = document.getElementById('volume-label')
const displayNameEl = document.getElementById('display-name')
const showNotificationsEl = document.getElementById('show-notifications')
const genreGridEl = document.getElementById('genre-grid')
const resetBtn = document.getElementById('reset-btn')

// Toast feedback

let toastEl = null

function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'toast'
    document.body.appendChild(toastEl)
  }
  toastEl.textContent = message
  toastEl.classList.add('visible')
  clearTimeout(toastEl._timer)
  toastEl._timer = setTimeout(() => toastEl.classList.remove('visible'), 2000)
}

// Apply settings to the page

function applySettings(settings) {
  // Dark mode
  document.body.classList.toggle('dark', settings.darkMode)
  darkModeEl.checked = settings.darkMode

  // Accent color
  accentColorEl.value = settings.accentColor
  document.documentElement.style.setProperty('--accent', settings.accentColor)

  // Volume
  defaultVolumeEl.value = settings.defaultVolume
  volumeLabelEl.textContent = settings.defaultVolume + '%'

  // Display name
  displayNameEl.value = settings.displayName

  // Notifications
  showNotificationsEl.checked = settings.showNotifications

  // Genre chips
  renderGenres(settings.genres)
}

// Genre chip rendering

function renderGenres(selected) {
  genreGridEl.innerHTML = ''
  GENRES.forEach((genre) => {
    const chip = document.createElement('span')
    chip.className = 'genre-chip' + (selected.includes(genre) ? ' selected' : '')
    chip.textContent = genre
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected')
      persistAll()
    })
    genreGridEl.appendChild(chip)
  })
}

// Collect current UI state into a settings object

function collectSettings() {
  const selectedGenres = []
  genreGridEl.querySelectorAll('.genre-chip.selected').forEach((chip) => {
    selectedGenres.push(chip.textContent)
  })
  return {
    darkMode: darkModeEl.checked,
    accentColor: accentColorEl.value,
    defaultVolume: Number(defaultVolumeEl.value),
    genres: selectedGenres,
    displayName: displayNameEl.value.trim(),
    showNotifications: showNotificationsEl.checked,
  }
}

// Save everything and show feedback

function persistAll() {
  const settings = collectSettings()
  saveSettings(settings)
  // Live-apply dark mode & accent color
  document.body.classList.toggle('dark', settings.darkMode)
  document.documentElement.style.setProperty('--accent', settings.accentColor)
  toast('Settings saved')
}

// Event listeners (auto-save on every change)

darkModeEl.addEventListener('change', persistAll)

accentColorEl.addEventListener('input', persistAll)

defaultVolumeEl.addEventListener('input', () => {
  volumeLabelEl.textContent = defaultVolumeEl.value + '%'
  persistAll()
})

displayNameEl.addEventListener('input', persistAll)

showNotificationsEl.addEventListener('change', () => {
  // If enabling, request browser permission
  if (
    showNotificationsEl.checked &&
    'Notification' in window &&
    Notification.permission === 'default'
  ) {
    Notification.requestPermission()
  }
  persistAll()
})

// Reset

resetBtn.addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults?')) return
  deleteCookie('seradio_settings')
  applySettings({ ...DEFAULTS })
  saveSettings({ ...DEFAULTS })
  toast('Settings reset to defaults')
})

// Init

const settings = loadSettings()
applySettings(settings)
