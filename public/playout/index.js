/// <reference lib="dom" />

const onDeckListEl = document.getElementById('on-deck-list')
const historyListEl = document.getElementById('history-list')
const mediaListEl = document.getElementById('media-list')
const queueListEl = document.getElementById('queue-list')

// Render

function renderHistory(items) {
  const atBottom =
    historyListEl.scrollTop + historyListEl.clientHeight >= historyListEl.scrollHeight - 4
  historyListEl.innerHTML = ''
  if (items.length === 0) {
    historyListEl.innerHTML = '<li class="empty-msg">No history yet</li>'
    return
  }
  for (const entry of items) {
    const li = document.createElement('li')
    li.className = 'track-item history-item'

    const time = document.createElement('span')
    time.className = 'track-time'
    time.textContent = new Date(entry.timestamp).toLocaleTimeString()

    const name = document.createElement('span')
    name.className = 'track-name'
    name.textContent = entry.file
    name.title = entry.file

    li.appendChild(time)
    li.appendChild(name)
    historyListEl.appendChild(li)
  }
  if (atBottom) historyListEl.scrollTop = historyListEl.scrollHeight
}

function renderMedia(files) {
  mediaListEl.innerHTML = ''
  if (files.length === 0) {
    mediaListEl.innerHTML = '<li class="empty-msg">No mp3 files found in /media</li>'
    return
  }
  for (const file of files) {
    const li = document.createElement('li')
    li.className = 'track-item'

    const name = document.createElement('span')
    name.className = 'track-name'
    name.textContent = file
    name.title = file

    const btn = document.createElement('button')
    btn.className = 'track-btn add'
    btn.textContent = '+ Queue'
    btn.addEventListener('click', () => addToQueue(file))

    li.appendChild(name)
    li.appendChild(btn)
    mediaListEl.appendChild(li)
  }
}

function renderQueue(items) {
  queueListEl.innerHTML = ''
  if (items.length === 0) {
    queueListEl.innerHTML = '<li class="empty-msg">Queue is empty</li>'
    return
  }
  items.forEach((file, i) => {
    const li = document.createElement('li')
    li.className = 'track-item'

    const idx = document.createElement('span')
    idx.className = 'track-index'
    idx.textContent = i + 1

    const name = document.createElement('span')
    name.className = 'track-name'
    name.textContent = file
    name.title = file

    const btn = document.createElement('button')
    btn.className = 'track-btn remove'
    btn.textContent = 'Remove'
    btn.addEventListener('click', () => removeFromQueue(i))

    li.appendChild(idx)
    li.appendChild(name)
    li.appendChild(btn)
    queueListEl.appendChild(li)
  })
}

// API calls

async function fetchOnDeck() {
  try {
    const res = await fetch('/api/playout/on-deck')
    const data = await res.json()
    renderOnDeck(data.onDeck || [])
  } catch {
    onDeckListEl.innerHTML = '<li class="empty-msg">Failed to load</li>'
  }
}

function renderOnDeck(items) {
  onDeckListEl.innerHTML = ''
  if (items.length === 0) {
    onDeckListEl.innerHTML = '<li class="empty-msg">Nothing on deck</li>'
    return
  }
  for (const file of items) {
    const li = document.createElement('li')
    li.className = 'track-item'

    const name = document.createElement('span')
    name.className = 'track-name'
    name.textContent = file
    name.title = file

    li.appendChild(name)
    onDeckListEl.appendChild(li)
  }
}

async function fetchHistory() {
  try {
    const res = await fetch('/api/playout/history?n=100')
    const data = await res.json()
    renderHistory(data.history || [])
  } catch {
    historyListEl.innerHTML = '<li class="empty-msg">Failed to load history</li>'
  }
}

async function fetchMedia() {
  try {
    const res = await fetch('/api/playout/media')
    const data = await res.json()
    renderMedia(data.files || [])
  } catch {
    mediaListEl.innerHTML = '<li class="empty-msg">Failed to load media</li>'
  }
}

async function fetchQueue() {
  try {
    const res = await fetch('/api/playout/schedule')
    const data = await res.json()
    renderQueue(data.schedule || [])
  } catch {
    queueListEl.innerHTML = '<li class="empty-msg">Failed to load queue</li>'
  }
}

async function addToQueue(file) {
  try {
    const res = await fetch('/api/playout/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    })
    if (!res.ok) return
    fetchQueue()
  } catch {
    // ignore
  }
}

async function removeFromQueue(index) {
  try {
    const res = await fetch('/api/playout/schedule/' + index, { method: 'DELETE' })
    if (!res.ok) return
    fetchQueue()
  } catch {
    // ignore
  }
}

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

// Init

fetchOnDeck()
fetchHistory()
fetchMedia()
fetchQueue()

// No server-push mechanism, so we poll to detect tracks that start playing
// or get consumed from the queue without user action on this page.
setInterval(fetchOnDeck, 3000)
setInterval(fetchHistory, 3000)
setInterval(fetchQueue, 3000)
