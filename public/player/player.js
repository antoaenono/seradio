/// <reference lib="dom" />

const details = document.querySelectorAll('#song-meta p')
const audio = document.getElementById('player')
const play = document.getElementById('play')
const volume = document.getElementById('volume')
const playIcon = document.getElementById('play-icon')

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
      deet.textContent = `${capitalizeFirst(key)}: Unknown`
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
    playIcon.src = '../images/stop-button-svgrepo-com.svg'
    audio.play()
  } else {
    playIcon.src = '../images/play-button-svgrepo-com.svg'
    audio.pause()
  }
})

audio.addEventListener('ended', () => {
  audio.play()
})

volume.addEventListener('input', () => {
  audio.volume = volume.value
})

volume.addEventListener('input', () => {
  audio.volume = volume.value
  const percent = volume.value * 100
  volume.style.background = `linear-gradient(to right, #4CAF50 ${percent}%, #ddd ${percent}%)`
})

// Run when page loads
loadMetadata()
