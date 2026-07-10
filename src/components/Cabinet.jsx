import { useState, useEffect } from 'react'
import { EVENTS } from '../data/events'

const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function isPast(dateStr) {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

// ── Форма добавления / редактирования забега ─────────────────
function RaceForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: '', date: '', distance: '', url: '', goal_time: '', result_time: '', notes: '',
    ...initial
  })
  const [mode, setMode] = useState('manual') // 'manual' | 'calendar'
  const [calSearch, setCalSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Предстоящие забеги из общего календаря
  const suggestions = EVENTS
    .filter(e => e.date >= today)
    .filter(e => !calSearch || e.name.toLowerCase().includes(calSearch.toLowerCase()) || e.city.toLowerCase().includes(calSearch.toLowerCase()))
    .slice(0, 20)

  function pickEvent(ev) {
    setForm(f => ({
      ...f,
      name: ev.name,
      date: ev.date,
      distance: ev.distances[0] || '',
      url: ev.url
    }))
    setMode('manual')
    setCalSearch('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name || !form.date) { setErr('Заполни название и дату'); return }
    setSaving(true)
    const res = await fetch('/api/races/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) onSave({ ...form, id: data.id })
    else setErr(data.error || 'Ошибка')
  }

  return (
    <div className="race-form-wrap">
      <div className="race-form-tabs">
        <button className={`race-form-tab ${mode === 'calendar' ? 'active' : ''}`} type="button" onClick={() => setMode('calendar')}>
          Выбрать из календаря
        </button>
        <button className={`race-form-tab ${mode === 'manual' ? 'active' : ''}`} type="button" onClick={() => setMode('manual')}>
          Ввести вручную
        </button>
      </div>

      {mode === 'calendar' && (
        <div className="race-cal-picker">
          <input
            className="cal-search"
            placeholder="Поиск по названию или городу..."
            value={calSearch}
            onChange={e => setCalSearch(e.target.value)}
            autoFocus
          />
          <div className="race-cal-list">
            {suggestions.length === 0 && <p className="no-events">Нет забегов</p>}
            {suggestions.map(ev => (
              <button key={ev.id} className="race-cal-item" type="button" onClick={() => pickEvent(ev)}>
                <span className="race-cal-date">{fmtDate(ev.date)}</span>
                <span className="race-cal-name">{ev.name}</span>
                <span className="race-cal-city">{ev.city}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <form onSubmit={submit} className="cabinet-form">
          {form.url && (
            <p className="race-source-hint">
              Выбрано из календаря: <a href={form.url} target="_blank" rel="noopener noreferrer">{form.name}</a>
            </p>
          )}
          <div className="calc-grid">
            <div className="field">
              <label>Название забега</label>
              <input value={form.name} onChange={set('name')} placeholder="Moscow Marathon" required />
            </div>
            <div className="field">
              <label>Дата</label>
              <input type="date" value={form.date} onChange={set('date')} required />
            </div>
          </div>
          <div className="calc-grid">
            <div className="field">
              <label>Дистанция</label>
              <input value={form.distance} onChange={set('distance')} placeholder="42 км" />
            </div>
            <div className="field">
              <label>Цель (время)</label>
              <input value={form.goal_time} onChange={set('goal_time')} placeholder="3:45:00" />
            </div>
          </div>
          {isPast(form.date) && (
            <div className="field">
              <label>Результат (фактическое время)</label>
              <input value={form.result_time} onChange={set('result_time')} placeholder="3:52:10" />
            </div>
          )}
          <div className="field">
            <label>Заметки</label>
            <input value={form.notes} onChange={set('notes')} placeholder="Целевой темп 5:20, стартовый блок B..." />
          </div>
          {err && <p className="auth-error">{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="auth-submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Сохранение...' : initial?.id ? 'Сохранить изменения' : 'Добавить забег'}
            </button>
            <button type="button" className="cab-btn" onClick={onCancel} style={{ padding: '12px 20px' }}>
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Карточка забега ──────────────────────────────────────────
function RaceCard({ race, onEdit, onDelete }) {
  const past = isPast(race.date)
  return (
    <div className={`race-card ${past ? 'race-card--past' : ''}`}>
      <div className="race-card-date">
        <div className="event-date-day">{new Date(race.date).getUTCDate()}</div>
        <div className="event-date-month">{MONTHS[new Date(race.date).getUTCMonth()]}</div>
      </div>
      <div className="race-card-info">
        <div className="race-card-name">
          {race.url
            ? <a href={race.url} target="_blank" rel="noopener noreferrer">{race.name}</a>
            : race.name}
        </div>
        <div className="race-card-meta">
          {race.distance && <span className="dist-badge">{race.distance}</span>}
          {race.goal_time && (
            <span className="race-tag race-tag--goal">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Цель: {race.goal_time}
            </span>
          )}
          {race.result_time && (
            <span className="race-tag race-tag--result">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Результат: {race.result_time}
            </span>
          )}
          {race.notes && <span className="race-notes">{race.notes}</span>}
        </div>
      </div>
      <div className="race-card-actions">
        <button className="race-action-btn" onClick={() => onEdit(race)} title="Редактировать">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className="race-action-btn race-action-btn--del" onClick={() => onDelete(race.id)} title="Удалить">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────
export default function Cabinet({ user, onLogout, onUpdate }) {
  const [tab, setTab] = useState('races')
  const [races, setRaces] = useState([])
  const [racesLoaded, setRacesLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [profileEditing, setProfileEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: user.name || '', bio: user.bio || '', city: user.city || '',
    birth_year: user.birth_year || '',
    pr_5k: user.pr_5k || '', pr_10k: user.pr_10k || '',
    pr_half: user.pr_half || '', pr_marathon: user.pr_marathon || '',
  })
  const [saving, setSaving] = useState(false)
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (tab === 'races' && !racesLoaded) {
      fetch('/api/races/list', { headers: authHeader() })
        .then(r => r.json())
        .then(d => { setRaces(d.races || []); setRacesLoaded(true) })
    }
  }, [tab, racesLoaded])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(form)
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true); setProfileEditing(false)
      onUpdate({ ...user, ...form })
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function deleteRace(id) {
    await fetch('/api/races/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ id })
    })
    setRaces(r => r.filter(x => x.id !== id))
  }

  function onRaceSaved(race) {
    if (race.id && races.find(r => r.id === race.id)) {
      setRaces(rs => rs.map(r => r.id === race.id ? race : r).sort((a,b) => a.date.localeCompare(b.date)))
    } else {
      setRaces(rs => [...rs, race].sort((a,b) => a.date.localeCompare(b.date)))
    }
    setAdding(false)
    setEditing(null)
  }

  const upcoming = races.filter(r => !isPast(r.date))
  const past = races.filter(r => isPast(r.date))

  const prs = [
    { key: 'pr_5k', label: '5 км' }, { key: 'pr_10k', label: '10 км' },
    { key: 'pr_half', label: 'Полумарафон' }, { key: 'pr_marathon', label: 'Марафон' },
  ]

  return (
    <div className="cabinet">
      <div className="cabinet-header">
        <div>
          <h2 className="cabinet-name">{user.name}</h2>
          <p className="cabinet-email">{user.email}{user.city ? ` · ${user.city}` : ''}</p>
        </div>
        <div className="cabinet-actions">
          {saved && <span className="cabinet-saved">Сохранено ✓</span>}
          <button className="cab-btn cab-btn--logout" onClick={onLogout}>Выйти</button>
        </div>
      </div>

      <div className="cabinet-nav">
        <button className={`cabinet-nav-btn ${tab === 'races' ? 'active' : ''}`} onClick={() => setTab('races')}>Мои забеги</button>
        <button className={`cabinet-nav-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Профиль</button>
      </div>

      {/* ── МОИ ЗАБЕГИ ── */}
      {tab === 'races' && (
        <div>
          {(adding || editing) ? (
            <RaceForm
              initial={editing}
              onSave={onRaceSaved}
              onCancel={() => { setAdding(false); setEditing(null) }}
            />
          ) : (
            <>
              <button className="add-race-btn" onClick={() => setAdding(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Добавить забег
              </button>

              {!racesLoaded && <p className="no-events">Загрузка...</p>}

              {racesLoaded && races.length === 0 && (
                <p className="no-events">Пока нет добавленных забегов.<br/>Добавь предстоящий старт или прошедший результат.</p>
              )}

              {upcoming.length > 0 && (
                <div className="races-section">
                  <p className="cabinet-section-title">Предстоящие · {upcoming.length}</p>
                  {upcoming.map(r => (
                    <RaceCard key={r.id} race={r} onEdit={setEditing} onDelete={deleteRace} />
                  ))}
                </div>
              )}

              {past.length > 0 && (
                <div className="races-section">
                  <p className="cabinet-section-title">Прошедшие · {past.length}</p>
                  {past.map(r => (
                    <RaceCard key={r.id} race={r} onEdit={setEditing} onDelete={deleteRace} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ПРОФИЛЬ ── */}
      {tab === 'profile' && (
        <div>
          {!profileEditing ? (
            <div className="cabinet-view">
              {user.bio && <p className="cabinet-bio">{user.bio}</p>}
              <div className="pr-grid">
                {prs.map(({ key, label }) => (
                  <div key={key} className="pr-card">
                    <div className="pr-label">{label}</div>
                    <div className="pr-value">{user[key] || '—'}</div>
                  </div>
                ))}
              </div>
              <button className="cab-btn" style={{ marginTop: 8 }} onClick={() => setProfileEditing(true)}>
                Редактировать профиль
              </button>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="cabinet-form">
              <div className="field"><label>Имя</label><input value={form.name} onChange={setF('name')} required /></div>
              <div className="field"><label>О себе</label><input value={form.bio} onChange={setF('bio')} placeholder="Бегаю с 2020 года..." /></div>
              <div className="calc-grid">
                <div className="field"><label>Город</label><input value={form.city} onChange={setF('city')} placeholder="Москва" /></div>
                <div className="field"><label>Год рождения</label><input type="number" value={form.birth_year} onChange={setF('birth_year')} placeholder="1990" /></div>
              </div>
              <p className="cabinet-section-title">Личные рекорды</p>
              <div className="calc-grid">
                {prs.map(({ key, label }) => (
                  <div key={key} className="field">
                    <label>{label}</label>
                    <input value={form[key]} onChange={setF(key)} placeholder="0:00:00" />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="auth-submit" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button type="button" className="cab-btn" onClick={() => setProfileEditing(false)} style={{ padding: '12px 20px' }}>
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
