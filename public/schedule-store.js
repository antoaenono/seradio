/// <reference lib="dom" />

;(function () {
  const STORAGE_KEY = 'seradio_schedule'
  const CHANGE_EVENT = 'seradio:schedule-change'

  const DEFAULT_SCHEDULE = [
    {
      id: 'monday-morning-funk',
      day: 'Monday',
      time: '8:00 AM - 10:00 AM',
      name: 'Morning Funk',
      host: 'DJ Ibouti',
      desc: "Start your week right with your favorite DJ that definitely isn't named after a country.",
    },
    {
      id: 'monday-indie-spotlight',
      day: 'Monday',
      time: '6:00 PM - 8:00 PM',
      name: 'Indie Spotlight',
      host: 'Literally any Portland DJ',
      desc: 'Showcasing the best independent artists from around the neighborhood.',
    },
    {
      id: 'tuesday-jazz-stuff',
      day: 'Tuesday',
      time: '10:00 AM - 12:00 PM',
      name: "Jazz 'n' stuff",
      host: 'Definitely Not KMHD',
      desc: 'We would never play the same 20 jazz standards on repeat, that would be crazy.',
    },
  ]

  function cloneSchedule(schedule) {
    return schedule.map((show) => ({ ...show }))
  }

  function sanitizeShow(show, fallbackId) {
    return {
      id: String(show.id || fallbackId),
      day: String(show.day || '').trim(),
      time: String(show.time || '').trim(),
      name: String(show.name || '').trim(),
      host: String(show.host || '').trim(),
      desc: String(show.desc || '').trim(),
    }
  }

  function dispatchChange(schedule) {
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, {
        detail: cloneSchedule(schedule),
      }),
    )
  }

  function getSchedule() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return cloneSchedule(DEFAULT_SCHEDULE)
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return cloneSchedule(DEFAULT_SCHEDULE)
      return parsed.map((show, index) => sanitizeShow(show, `show-${index + 1}`))
    } catch {
      return cloneSchedule(DEFAULT_SCHEDULE)
    }
  }

  function saveSchedule(schedule) {
    const sanitized = schedule.map((show, index) => sanitizeShow(show, `show-${index + 1}`))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized))
    dispatchChange(sanitized)
    return cloneSchedule(sanitized)
  }

  function resetSchedule() {
    window.localStorage.removeItem(STORAGE_KEY)
    const schedule = cloneSchedule(DEFAULT_SCHEDULE)
    dispatchChange(schedule)
    return schedule
  }

  function subscribe(listener) {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        listener(getSchedule())
      }
    }

    const handleChange = (event) => {
      listener(cloneSchedule(event.detail))
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(CHANGE_EVENT, handleChange)

    return function unsubscribe() {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(CHANGE_EVENT, handleChange)
    }
  }

  window.seradioScheduleStore = {
    getSchedule,
    saveSchedule,
    resetSchedule,
    defaults: cloneSchedule(DEFAULT_SCHEDULE),
    subscribe,
  }
})()
