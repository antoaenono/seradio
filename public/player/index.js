/// <reference lib="dom" />

function displayMetadata(meta) {
  Object.entries(meta).forEach(([key, value]) => {
    const el = document.getElementById(key)
    if (!el) return

    el.textContent = `${key}: ${value ?? 'Unknown'}`
  })
}

async function loadMetadata() {
  const res = await fetch('/metadata')
  const meta = await res.json()

  displayMetadata(meta)
}

// Run when page loads
loadMetadata()
