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
const canvas = document.getElementById('visualizer')

// Audio visualizer - passive, does not touch the audio output path.
// Uses captureStream to read frequency data. Inits on first play (user gesture
// required for AudioContext). Pauses/resumes rAF loop with the audio element.
;(function setupVisualizer() {
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  function syncSize() {
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor((canvas.clientWidth || canvas.width) * ratio)
    canvas.height = Math.floor((canvas.clientHeight || canvas.height) * ratio)
  }

  function draw(analyser) {
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    let rafId = null

    // Build logarithmic bin edges so bass frequencies get more bars.
    // Only map up to ~75% of bins (~16kHz) since the top bins are
    // almost always silent and create a visible dead zone.
    const bars = 64
    const usableBins = Math.floor(bufferLength * 0.75)
    const binEdges = new Array(bars + 1)
    for (let i = 0; i <= bars; i++) {
      binEdges[i] = Math.round(Math.pow(usableBins, i / bars))
    }

    function render() {
      rafId = requestAnimationFrame(render)
      analyser.getByteFrequencyData(dataArray)

      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const minSize = Math.min(w, h)
      const innerRadius = minSize * 0.23
      const lineWidth = Math.max(2, minSize * 0.008)

      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'

      for (let i = 0; i < bars; i += 1) {
        // Average the frequency bins that fall within this visual bar
        const lo = binEdges[i]
        const hi = Math.max(lo + 1, binEdges[i + 1])
        let sum = 0
        for (let b = lo; b < hi; b++) sum += dataArray[b]
        const value = sum / ((hi - lo) * 255)

        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2
        const length = minSize * (0.035 + value * 0.14)
        const x1 = cx + Math.cos(angle) * innerRadius
        const y1 = cy + Math.sin(angle) * innerRadius
        const x2 = cx + Math.cos(angle) * (innerRadius + length)
        const y2 = cy + Math.sin(angle) * (innerRadius + length)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = `hsl(${138 - value * 18}, ${62 + value * 12}%, ${34 + value * 24}%)`
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(cx, cy, innerRadius * 0.82, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200, 240, 216, 0.20)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = 'rgba(8, 53, 31, 0.48)'
      ctx.stroke()
    }

    audio.addEventListener('playing', () => {
      if (rafId == null) render()
    })
    audio.addEventListener('pause', () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = null
    })
    render()
  }

  function init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const audioCtx = new AudioCtx()
      if (audioCtx.state === 'suspended') audioCtx.resume()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256

      // Re-capture the stream on each resume because reloadSource() tears
      // down the HLS session, invalidating the previous MediaStream.
      let source = null
      function reconnect() {
        if (source) source.disconnect()
        source = audioCtx.createMediaStreamSource(audio.captureStream())
        source.connect(analyser)
      }
      audio.addEventListener('playing', reconnect)
      reconnect()

      syncSize()
      draw(analyser)
    } catch {
      // visualizer is non-essential
    }
  }

  audio.addEventListener('playing', init, { once: true })
  window.addEventListener('resize', syncSize)
})()

// Helper functions

function isMissing(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Main functions

// HLS playback
// Each play flushes stale buffers and fetches a fresh manifest from the live edge.
// reloadSource is set per browser path; the click handler calls it before audio.play().
let reloadSource = () => {}

// hls.js path (Chrome, Firefox, Edge)
if (typeof Hls !== 'undefined' && Hls.isSupported()) {
  const hls = new Hls({ liveSyncDurationCount: 1 })
  hls.attachMedia(audio)

  // Stop fetching segments while paused to save bandwidth
  audio.addEventListener('pause', () => hls.stopLoad())

  reloadSource = () => {
    hls.loadSource('/api/audio/')
    hls.startLoad(-1) // -1 = default start position (live edge)
  }
  // Safari native HLS
} else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
  reloadSource = () => {
    audio.src = '/api/audio/'
  }
}

//Controls Player
play.addEventListener('click', () => {
  if (audio.paused) {
    playIcon.src = '../images/stop-button-svgrepo-com.svg'
    reloadSource()
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

// Volume preference js created with help from Github Copilot
// Apply saved preferences
if (window.seradioPrefs) {
  const prefs = window.seradioPrefs
  // Restore volume
  const savedVol = prefs.defaultVolume / 100
  audio.volume = savedVol
  volume.value = savedVol
  const percent = savedVol * 100
  volume.style.background = `linear-gradient(to right, #4CAF50 ${percent}%, #ddd ${percent}%)`
}
