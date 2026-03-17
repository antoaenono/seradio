/// <reference lib="dom" />

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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const store = window.seradioScheduleStore
const showForm = document.getElementById('show-form')
const formTitle = document.getElementById('form-title')
const showIdEl = document.getElementById('show-id')
const showDayEl = document.getElementById('show-day')
const showTimeEl = document.getElementById('show-time')
const showNameEl = document.getElementById('show-name')
const showHostEl = document.getElementById('show-host')
const showDescEl = document.getElementById('show-desc')
const submitBtn = document.getElementById('submit-btn')
const cancelBtn = document.getElementById('cancel-btn')
const resetBtn = document.getElementById('reset-btn')
const scheduleList = document.getElementById('schedule-list')
const scheduleCount = document.getElementById('schedule-count')

let editingId = null
let toastEl = null

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createId(show) {
  const seed = `${show.day}-${show.name}-${show.time}`
  const slug = slugify(seed) || 'show'
  return `${slug}-${Date.now()}`
}

function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'toast'
    document.body.appendChild(toastEl)
  }

  toastEl.textContent = message
  toastEl.classList.add('visible')
  clearTimeout(toastEl._timer)
  toastEl._timer = setTimeout(() => toastEl.classList.remove('visible'), 2200)
}

function resetForm() {
  editingId = null
  showForm.reset()
  showIdEl.value = ''
  formTitle.textContent = 'Add a show'
  submitBtn.textContent = 'Add show'
  cancelBtn.hidden = true
}

function getFormShow() {
  return {
    id: showIdEl.value.trim(),
    day: showDayEl.value.trim(),
    time: showTimeEl.value.trim(),
    name: showNameEl.value.trim(),
    host: showHostEl.value.trim(),
    desc: showDescEl.value.trim(),
  }
}

function startEdit(show) {
  editingId = show.id
  formTitle.textContent = 'Edit show'
  submitBtn.textContent = 'Save changes'
  cancelBtn.hidden = false
  showIdEl.value = show.id
  showDayEl.value = show.day
  showTimeEl.value = show.time
  showNameEl.value = show.name
  showHostEl.value = show.host
  showDescEl.value = show.desc
  showNameEl.focus()
}

function renderSchedule(schedule) {
  scheduleCount.textContent = `${schedule.length} ${schedule.length === 1 ? 'show' : 'shows'}`
  scheduleList.innerHTML = ''

  if (!schedule.length) {
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.textContent =
      'No shows are scheduled yet. Add one from the form to populate the homepage grid.'
    scheduleList.appendChild(empty)
    return
  }

  schedule
    .slice()
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
    .forEach((show) => {
      const item = document.createElement('article')
      item.className = 'schedule-item'
      item.innerHTML = `
        <div class="schedule-meta">
          <div>
            <p class="show-day">${show.day}</p>
            <p class="show-name">${show.name}</p>
          </div>
          <p class="show-time">${show.time}</p>
        </div>
        <p class="show-host">Hosted by ${show.host}</p>
        <p class="show-desc">${show.desc}</p>
        <div class="item-actions">
          <button class="action-link" type="button" data-action="edit" data-id="${show.id}">Edit</button>
          <button class="action-link delete" type="button" data-action="delete" data-id="${show.id}">Remove</button>
        </div>
      `
      scheduleList.appendChild(item)
    })
}

showForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const nextShow = getFormShow()
  const schedule = store.getSchedule()

  if (editingId) {
    const updated = schedule.map((show) =>
      show.id === editingId ? { ...nextShow, id: editingId } : show,
    )
    store.saveSchedule(updated)
    toast('Show updated')
  } else {
    store.saveSchedule([...schedule, { ...nextShow, id: createId(nextShow) }])
    toast('Show added')
  }

  resetForm()
})

cancelBtn.addEventListener('click', () => {
  resetForm()
})

resetBtn.addEventListener('click', () => {
  if (!window.confirm('Restore the default schedule for this browser?')) return
  store.resetSchedule()
  resetForm()
  toast('Default schedule restored')
})

scheduleList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]')
  if (!button) return

  const action = button.dataset.action
  const id = button.dataset.id
  const schedule = store.getSchedule()
  const selectedShow = schedule.find((show) => show.id === id)

  if (!selectedShow) return

  if (action === 'edit') {
    startEdit(selectedShow)
    return
  }

  if (!window.confirm(`Remove "${selectedShow.name}" from the schedule?`)) return

  store.saveSchedule(schedule.filter((show) => show.id !== id))
  if (editingId === id) resetForm()
  toast('Show removed')
})

store.subscribe(renderSchedule)
renderSchedule(store.getSchedule())
resetForm()
