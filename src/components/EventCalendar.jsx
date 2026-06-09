import { useState } from 'react'
import { EVENTS, DISTANCE_FILTERS, SOURCES, UPDATED } from '../data/events'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatUpdated(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function EventCalendar() {
  const [filter, setFilter] = useState('Все')
  const [search, setSearch] = useState('')

  const now = new Date()

  const filtered = EVENTS
    .filter(e => filter === 'Все' || e.distances.includes(filter))
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.city.toLowerCase().includes(search.toLowerCase()))
    .filter(e => parseDate(e.date) >= now)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date))

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div>
          <h2 className="cal-title">Календарь забегов</h2>
          <p className="cal-desc">
            {EVENTS.length} мероприятий · обновлено {formatUpdated(UPDATED)}
          </p>
        </div>
      </div>

      <div className="sources-grid">
        <a href="https://marathonec.ru/calendar-beg/" target="_blank" rel="noopener noreferrer" className="source-card source-card--auto">
          <div className="source-card-top">
            <span className="source-card-name">Marathon.ru</span>
            <span className="source-badge source-badge--auto">автообновление</span>
          </div>
          <div className="source-card-desc">Всероссийский календарь забегов</div>
        </a>
        <a href="https://reg.o-time.ru/calendar" target="_blank" rel="noopener noreferrer" className="source-card source-card--auto">
          <div className="source-card-top">
            <span className="source-card-name">O-time</span>
            <span className="source-badge source-badge--auto">автообновление</span>
          </div>
          <div className="source-card-desc">Северо-Западный регион</div>
        </a>
        <a href="https://reg.russiarunning.com/events/future" target="_blank" rel="noopener noreferrer" className="source-card source-card--manual">
          <div className="source-card-top">
            <span className="source-card-name">RussiaRunning</span>
            <span className="source-badge source-badge--manual">перейти на сайт</span>
          </div>
          <div className="source-card-desc">Для поиска забегов перейди на сайт</div>
        </a>
      </div>

      <input
        className="cal-search"
        type="search"
        placeholder="Поиск по названию или городу..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="filters">
        {DISTANCE_FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="events-list">
        {filtered.length === 0 ? (
          <p className="no-events">Нет предстоящих забегов по выбранному фильтру</p>
        ) : (
          filtered.map(event => {
            const d = parseDate(event.date)
            return (
              <a
                className="event-card"
                key={event.id}
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="event-date">
                  <div className="event-date-day">{d.getDate()}</div>
                  <div className="event-date-month">{MONTHS[d.getMonth()]}</div>
                </div>
                <div className="event-info">
                  <div className="event-name">{event.name}</div>
                  <div className="event-meta">
                    <span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4,verticalAlign:'middle'}}>
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {event.city}
                    </span>
                  </div>
                </div>
                <div className="event-distances">
                  {event.distances.slice(0, 4).map(dist => (
                    <span key={dist} className="dist-badge">{dist}</span>
                  ))}
                  {event.distances.length > 4 && (
                    <span className="dist-badge">+{event.distances.length - 4}</span>
                  )}
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
