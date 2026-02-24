/// <reference lib="dom" />
/* global Hls */

function displayMetadata(meta) {
  Object.entries(meta).forEach(([key, value]) => {
    const el = document.getElementById(key)
    if (!el) return

    el.textContent = `${key}: ${value ?? 'Unknown'}`
  })
}

async function loadMetadata() {
  const res = await fetch('/api/audio/metadata')
  const meta = await res.json()

  displayMetadata(meta)
}

// HLS playback
const audio = document.getElementById('player')

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

// Run when page loads
loadMetadata()
