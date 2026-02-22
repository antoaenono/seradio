/// <reference lib="dom" />

function isMissing(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function displayMetadata(meta) {
  const details = document.querySelectorAll('#song-meta p')

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

// Run when page loads
loadMetadata()
