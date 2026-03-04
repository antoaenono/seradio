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

// Static placeholder schedule – Could replace with a fetch() call if we decide we want
// to implement a schedule API endpoint.
const shows = [
  {
    day: 'Monday',
    time: '8:00 AM - 10:00 AM',
    name: 'Morning Funk',
    host: 'DJ Ibouti',
    desc: "Start your week right with your favorite DJ that definitely isn't named after a country.",
  },
  {
    day: 'Monday',
    time: '6:00 PM - 8:00 PM',
    name: 'Indie Spotlight',
    host: 'Literally any Portland DJ',
    desc: 'Showcasing the best independent artists from around the neighborhood.',
  },
  {
    day: 'Tuesday',
    time: '10:00 AM - 12:00 PM',
    name: "Jazz 'n' stuff",
    host: 'Definitely Not KMHD',
    desc: 'We would never play the same 20 jazz standards on repeat, that would be crazy.',
  },
]

// Create grid for schedule cards
const grid = document.getElementById('schedule-grid')

// Populate schedule cards from shows array
function renderSchedule(schedule) {
  grid.innerHTML = ''
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

// Render schedule cards
renderSchedule(shows)
