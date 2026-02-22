/// <reference lib="dom" />

const details = document.querySelectorAll('#song-meta p')
const audio = document.getElementById('player')
const play = document.getElementById('play')
const seek = document.getElementById('seek')
const volume = document.getElementById('volume')
const currentTime = document.getElementById('currentTime')
const duration = document.getElementById('duration')

function isMissing(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function displayMetadata(meta) {
  details.forEach((deet) => {
    const key = deet.id
    const value = meta[key]

    if (isMissing(value)) {
      deet.style.display = 'none'
      return
    }
    deet.style.display = 'block'
    deet.textContent = `${capitalizeFirst(key)}: ${value}`
  })
}

async function loadMetadata() {
  const res = await fetch('/api/metadata')
  const meta = await res.json()

  displayMetadata(meta)
}

play.addEventListener('click', () => {
  if (audio.paused) {
    audio.play()
  } else {
    audio.pause()
  }
})

audio.addEventListener('ended', () => {
  audio.play()
})

audio.addEventListener('timeupdate', () => {
  seek.value = (audio.currentTime / audio.duration) * 100
  const minutes = Math.floor(audio.currentTime / 60)
  const seconds = Math.floor(audio.currentTime % 60)
  currentTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
})

audio.addEventListener('loadedmetadata', () => {
  const minutes = Math.floor(audio.duration / 60)
  const seconds = Math.floor(audio.duration % 60)
  duration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
})

seek.addEventListener('input', () => {
  audio.currentTime = (seek.value / 100) * audio.duration
})

volume.addEventListener('input', () => {
  audio.volume = volume.value
})

// Run when page loads
loadMetadata()
