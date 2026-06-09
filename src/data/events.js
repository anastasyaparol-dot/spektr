import liveData from './events-live.json'

export const EVENTS = liveData.events
export const UPDATED = liveData.updated
export const SOURCES = [
  { name: ' Marathon.ru', url: 'https://marathonec.ru/calendar-beg/' },
  { name: 'O-time', url: 'https://reg.o-time.ru/calendar' },
  { name: 'RussiaRunning', url: 'https://reg.russiarunning.com/events/future' },
]

// Все уникальные дистанции из реальных данных (топ-5 популярных + прочее)
const POPULAR = ['5 км', '10 км', '21 км', '21,1 км', '42 км', '42,2 км']
const allDist = [...new Set(EVENTS.flatMap(e => e.distances))]
const popular = POPULAR.filter(d => allDist.includes(d))

export const DISTANCE_FILTERS = ['Все', ...popular]
