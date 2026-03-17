/// <reference lib="dom" />

// Landing Page JavaScript created with help from Github Copilot

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle')
const navLinks = document.querySelector('.nav-links')

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open')
})

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open')
  })
})

// Create grid for schedule cards
const grid = document.getElementById('schedule-grid')

// Populate schedule cards from the shared schedule store
function renderSchedule(schedule) {
  grid.innerHTML = ''

  if (!schedule.length) {
    const emptyState = document.createElement('div')
    emptyState.className = 'schedule-empty'
    emptyState.textContent = 'No shows scheduled right now. Visit the DJ page to build the lineup.'
    grid.appendChild(emptyState)
    return
  }

  schedule.forEach((show) => {
    const card = document.createElement('div')
    card.className = 'schedule-card'
    card.innerHTML = `
      <p class="show-day">${show.day}</p>
      <p class="show-time">${show.time}</p>
      <p class="show-name">${show.name}</p>
      <p class="show-host">Hosted by ${show.host}</p>
      <p class="show-desc">${show.desc}</p>
    `
    grid.appendChild(card)
  })
}

renderSchedule(window.seradioScheduleStore.getSchedule())
window.seradioScheduleStore.subscribe(renderSchedule)
