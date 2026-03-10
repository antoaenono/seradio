/// <reference lib="dom" />
/* global Hls */

// DOM elements
const navToggle = document.getElementById('nav-toggle')
const navLinks = document.querySelector('.nav-links')
const details = document.querySelectorAll('#song-meta p')
const audio = document.getElementById('player')
const play = document.getElementById('play')
const volume = document.getElementById('volume')
const playIcon = document.getElementById('play-icon')
const canvas = document.getElementById('visualizer')
const canvasCtx = canvas?.getContext('2d')

// Helper functions

function isMissing(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Main functions

// Audio Visualizer
let audioCtx
let analyser
let sourceNode
let visualizerGain
let visualizerRunning = false
let needsVisualizerSourceRefresh = true

function syncVisualizerGain() {
  if (!audioCtx || !visualizerGain) return
  visualizerGain.gain.setValueAtTime(audio.volume, audioCtx.currentTime)
}

function syncCanvasResolution() {
  if (!canvas) return
  const ratio = window.devicePixelRatio || 1
  const displayWidth = canvas.clientWidth || canvas.width
  const displayHeight = canvas.clientHeight || canvas.height
  canvas.width = Math.floor(displayWidth * ratio)
  canvas.height = Math.floor(displayHeight * ratio)
}

function visualize() {
  if (!canvas || !canvasCtx || !analyser || visualizerRunning) return
  visualizerRunning = true
  syncCanvasResolution()

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  const bars = 96

  const nyquist = (audioCtx?.sampleRate || 44100) / 2
  const minFreq = 40
  const maxFreq = Math.min(12000, nyquist)
  const barRanges = Array.from({ length: bars }, (_, i) => {
    const startRatio = i / bars
    const endRatio = (i + 1) / bars
    const startFreq = minFreq * (maxFreq / minFreq) ** startRatio
    const endFreq = minFreq * (maxFreq / minFreq) ** endRatio
    const startIdx = Math.max(1, Math.floor((startFreq / nyquist) * bufferLength))
    const endIdx = Math.max(startIdx + 1, Math.ceil((endFreq / nyquist) * bufferLength))
    return [startIdx, Math.min(endIdx, bufferLength)] // end is exclusive
  })

  function renderFrame() {
    if (audio.paused) {
      visualizerRunning = false
      return
    }

    requestAnimationFrame(renderFrame)
    analyser.getByteFrequencyData(dataArray)

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const minSize = Math.min(width, height)
    const innerRadius = minSize * 0.23
    const lineWidth = Math.max(2, minSize * 0.008)

    canvasCtx.clearRect(0, 0, width, height)
    canvasCtx.lineCap = 'round'

    for (let i = 0; i < bars; i += 1) {
      const [startIdx, endIdx] = barRanges[i]
      let peak = 0
      for (let j = startIdx; j < endIdx; j += 1) {
        peak = Math.max(peak, dataArray[j])
      }
      const value = peak / 255
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2
      const length = minSize * (0.035 + value * 0.14)
      const x1 = cx + Math.cos(angle) * innerRadius
      const y1 = cy + Math.sin(angle) * innerRadius
      const x2 = cx + Math.cos(angle) * (innerRadius + length)
      const y2 = cy + Math.sin(angle) * (innerRadius + length)

      canvasCtx.beginPath()
      canvasCtx.moveTo(x1, y1)
      canvasCtx.lineTo(x2, y2)
      canvasCtx.lineWidth = lineWidth
      canvasCtx.strokeStyle = `hsl(${138 - value * 18}, ${62 + value * 12}%, ${34 + value * 24}%)`
      canvasCtx.stroke()
    }

    canvasCtx.beginPath()
    canvasCtx.arc(cx, cy, innerRadius * 0.82, 0, Math.PI * 2)
    canvasCtx.fillStyle = 'rgba(200, 240, 216, 0.20)'
    canvasCtx.fill()

    canvasCtx.beginPath()
    canvasCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
    canvasCtx.lineWidth = lineWidth
    canvasCtx.strokeStyle = 'rgba(8, 53, 31, 0.48)'
    canvasCtx.stroke()
  }

  renderFrame()
}

async function initVisualizerFromGesture() {
  if (!canvas || !canvasCtx) return

  try {
    if (!audioCtx) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      if (!AudioContextCtor) return
      audioCtx = new AudioContextCtor()
    }

    if (!analyser) {
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.8
    }

    if (!visualizerGain) {
      visualizerGain = audioCtx.createGain()
      visualizerGain.connect(analyser)
      syncVisualizerGain()
    }

    if (typeof audio.captureStream === 'function') {
      if (!sourceNode || needsVisualizerSourceRefresh) {
        const stream = audio.captureStream()
        if (sourceNode) {
          sourceNode.disconnect()
        }
        sourceNode = audioCtx.createMediaStreamSource(stream)
        sourceNode.connect(visualizerGain)
        needsVisualizerSourceRefresh = false
      }
    } else if (!sourceNode) {
      // Fallback path when captureStream is unavailable.
      sourceNode = audioCtx.createMediaElementSource(audio)
      sourceNode.connect(audioCtx.destination)
      sourceNode.connect(visualizerGain)
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }

    visualize()
  } catch {
    // Visualizer failures should never block playback
  }
}

window.addEventListener('resize', () => {
  syncCanvasResolution()
})

//Mobile Nav Toggle
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open')
})

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open')
  })
})

// HLS playback
// Each play flushes stale buffers and fetches a fresh manifest from the live edge.
// reloadSource is set per browser path; the click handler calls it before audio.play().
let reloadSource = () => {}
let stopLoading = () => {}

// hls.js path (Chrome, Firefox, Edge)
if (typeof Hls !== 'undefined' && Hls.isSupported()) {
  const hls = new Hls({
    // Keep a small but safer distance from the live edge to avoid startup underruns.
    liveSyncDurationCount: 2,
    liveMaxLatencyDurationCount: 6,
  })
  hls.attachMedia(audio)
  let hasLoadedSource = false

  // First play loads the manifest; subsequent resumes just continue loading.
  reloadSource = () => {
    if (!hasLoadedSource) {
      hls.loadSource('/api/audio/')
      hasLoadedSource = true
    }
    hls.startLoad(-1) // -1 = default start position (live edge)
  }
  stopLoading = () => hls.stopLoad()
  // Safari native HLS
} else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
  let hasLoadedSource = false
  reloadSource = () => {
    if (!hasLoadedSource) {
      audio.src = '/api/audio/'
      hasLoadedSource = true
    }
  }
}

//Controls Player
play.addEventListener('click', () => {
  if (audio.paused) {
    playIcon.src = '../images/stop-button-svgrepo-com.svg'
    void initVisualizerFromGesture()
    needsVisualizerSourceRefresh = true
    reloadSource()
    audio.play().catch(() => {
      playIcon.src = '../images/play-button-svgrepo-com.svg'
    })
  } else {
    playIcon.src = '../images/play-button-svgrepo-com.svg'
    audio.pause()
    stopLoading()
  }
})

// Re-capture stream on each playback start; reloadSource can invalidate old stream tracks.
audio.addEventListener('playing', () => {
  void initVisualizerFromGesture()
})

volume.addEventListener('input', () => {
  audio.volume = volume.value
  syncVisualizerGain()
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
  syncVisualizerGain()
  volume.value = savedVol
  const percent = savedVol * 100
  volume.style.background = `linear-gradient(to right, #4CAF50 ${percent}%, #ddd ${percent}%)`
}
