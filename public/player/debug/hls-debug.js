/// <reference lib="dom" />
/* global Hls */

/**
 * HLS Debug Panel
 * Hooks into window.hlsDebug (set by index.js) to visualize HLS activity.
 * Press 'D' to toggle visibility.
 * Remove hls-debug.js, hls-debug.css, and the script/link tags to disable.
 */
;(function () {
  // Inject the debug panel HTML
  const panel = document.createElement('div')
  panel.id = 'hls-debug'
  panel.classList.add('hidden')
  panel.innerHTML =
    '<div id="hls-debug-header">' +
    '  <span>HLS Debug <kbd>D</kbd></span>' +
    '  <button id="hls-debug-clear">Clear</button>' +
    '</div>' +
    '<div id="hls-debug-timeline"></div>'
  document.body.appendChild(panel)

  const debugTimeline = document.getElementById('hls-debug-timeline')
  const debugClear = document.getElementById('hls-debug-clear')
  let currentSession = null

  // Toggle with D key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      // Ignore if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      panel.classList.toggle('hidden')
    }
  })

  function timestamp() {
    const d = new Date()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  function newSession(action) {
    const div = document.createElement('div')
    div.className = 'debug-session'

    const label = document.createElement('div')
    label.className = 'debug-session-label'
    label.innerHTML = `<span class="action ${action}">${action.toUpperCase()}</span> ${timestamp()}`
    div.appendChild(label)

    debugTimeline.appendChild(div)
    currentSession = div
    panel.scrollTop = panel.scrollHeight
  }

  function addToSession(html) {
    if (!currentSession) newSession('init')
    const row = document.createElement('div')
    row.className = 'debug-manifest'
    row.innerHTML = html
    currentSession.appendChild(row)
    panel.scrollTop = panel.scrollHeight
  }

  debugClear.addEventListener('click', () => {
    debugTimeline.innerHTML = ''
    currentSession = null
  })

  // Attach to the HLS debug hook from index.js
  function attach() {
    const ctx = window.hlsDebug
    if (!ctx) return setTimeout(attach, 50)

    const { audio, hls } = ctx
    let playStartedAt = null

    // HLS.js events (Chrome, Firefox, Edge)
    if (hls && typeof Hls !== 'undefined') {
      hls.on(Hls.Events.LEVEL_UPDATED, (event, data) => {
        const frags = data.details.fragments
        const segs = frags
          .map((f) => {
            const name = f.relurl.replace('segments/', '')
            const cls = name.startsWith('silence') ? 'silence' : 'in-window'
            return `<span class="debug-seg ${cls}">${name} (${f.duration.toFixed(1)}s)</span>`
          })
          .join(' ')
        addToSession(
          `<span class="debug-manifest-label">window seq=${data.details.startSN}</span> ${segs}`,
        )
      })

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const name = data.frag.relurl.replace('segments/', '')
        const ms = Math.round(data.frag.stats.loading.end - data.frag.stats.loading.start)
        addToSession(
          `<span class="debug-manifest-label">fetched</span>` +
            `<span class="debug-seg fetched">${name} (${data.frag.duration.toFixed(1)}s, ${ms}ms)</span>`,
        )
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        addToSession(
          `<span style="color:#f44336">ERROR: ${data.details} (fatal: ${data.fatal})</span>`,
        )
      })
    }

    // Play/pause tracking
    let hasPlayedBefore = false
    audio.addEventListener('play', () => {
      const label = hasPlayedBefore ? 'reload' : 'play'
      hasPlayedBefore = true
      playStartedAt = Date.now()
      newSession(label)
    })

    audio.addEventListener('pause', () => {
      const sessionDuration = playStartedAt
        ? ((Date.now() - playStartedAt) / 1000).toFixed(1) + 's'
        : '?'
      const bufferDepth =
        audio.buffered.length > 0
          ? (audio.buffered.end(0) - audio.currentTime).toFixed(1) + 's'
          : '0s'
      const currentTime = audio.currentTime.toFixed(1) + 's'
      const liveSyncPosition = hls ? (hls.liveSyncPosition?.toFixed(1) ?? '?') + 's' : 'n/a'
      const buffered =
        audio.buffered.length > 0
          ? `${audio.buffered.start(0).toFixed(1)}s-${audio.buffered.end(0).toFixed(1)}s`
          : 'empty'

      newSession('pause')
      addToSession(
        `<span class="debug-buffered">` +
          `session=${sessionDuration} ` +
          `bufferDepth=${bufferDepth} ` +
          `time=${currentTime} ` +
          `liveSync=${liveSyncPosition} ` +
          `buffered=${buffered}` +
          `</span>`,
      )
      playStartedAt = null
    })
  }

  attach()
})()
