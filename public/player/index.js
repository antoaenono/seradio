/// <reference lib="dom" />
/* global Hls */

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle')
const navLinks = document.querySelector('.nav-links')

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open')
})

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open')
  })
})

const details = document.querySelectorAll('#song-meta p')
const audio = document.getElementById('player')
const play = document.getElementById('play')
const volume = document.getElementById('volume')
const playIcon = document.getElementById('play-icon')

// Helper functions

function isMissing(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Main functions

// HLS playback

if (typeof Hls !== 'undefined' && Hls.isSupported()) {
  const hls = new Hls({ liveSyncDurationCount: 1 })
  hls.loadSource('/api/audio/')
  hls.attachMedia(audio)

  // Stop fetching on pause, resume from live on play
  audio.addEventListener('pause', () => hls.stopLoad())
  audio.addEventListener('play', () => {
    hls.startLoad()
    if (hls.liveSyncPosition != null) {
      audio.currentTime = hls.liveSyncPosition
    }
  })
} else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
  audio.src = '/api/audio/'
}

//Controls Player
play.addEventListener('click', () => {
  if (audio.paused) {
    playIcon.src = '../images/stop-button-svgrepo-com.svg'
    audio.play()
  } else {
    playIcon.src = '../images/play-button-svgrepo-com.svg'
    audio.pause()
  }
})

// Volume control
volume.addEventListener('input', () => {
  audio.volume = volume.value
})

volume.addEventListener('input', () => {
  audio.volume = volume.value
  const percent = volume.value * 100
  volume.style.background = `linear-gradient(to right, #4CAF50 ${percent}%, #ddd ${percent}%)`
})

// Metadata display
function displayMetadata(meta) {
  details.forEach((deet) => {
    const key = deet.id
    const value = meta[key]

    if (isMissing(value)) {
      deet.textContent = `${capitalizeFirst(key)}: Unknown`
      return
    }

    deet.textContent = `${capitalizeFirst(key)}: ${value}`
  })
}

async function loadMetadata() {
  const res = await fetch('/api/audio/metadata')
  const meta = await res.json()

  if (!meta.error) {
    displayMetadata(meta)
  }
}

// Run when page loads, then refresh every 1 second
loadMetadata()
setInterval(loadMetadata, 1000)

// Volume and autoplay preference js created with help from Github Copilot
// Apply saved preferences
if (window.seradioPrefs) {
  const prefs = window.seradioPrefs
  // Restore volume
  const savedVol = prefs.defaultVolume / 100
  audio.volume = savedVol
  volume.value = savedVol
  const percent = savedVol * 100
  volume.style.background = `linear-gradient(to right, #4CAF50 ${percent}%, #ddd ${percent}%)`

  // Autoplay (browsers may block, but we try)
  if (prefs.autoplay) {
    audio
      .play()
      .then(() => {
        playIcon.src = '../images/stop-button-svgrepo-com.svg'
      })
      .catch(() => {
        // Autoplay blocked by browser — user needs to click play
      })
  }
}
