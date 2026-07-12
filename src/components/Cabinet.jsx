import { useState, useEffect } from 'react'
import { EVENTS } from '../data/events'

const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function isPast(dateStr) {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function calcAge(birthYear) {
  return birthYear ? new Date().getFullYear() - birthYear : null
}

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

// ── Аватар ───────────────────────────────────────────────────
function Avatar({ url, name, size = 64 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt={name} className="avatar-img" style={{ width: size, height: size }} />
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

// ── Форма добавления / редактирования забега ─────────────────
function RaceForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: '', date: '', distance: '', url: '', goal_time: '', result_time: '', notes: '',
    ...initial
  })
  const [mode, setMode] = useState('manual')
  const [calSearch, setCalSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const suggestions = EVENTS
    .filter(e => e.date >= today)
    .filter(e => !calSearch || e.name.toLowerCase().includes(calSearch.toLowerCase()) || e.city.toLowerCase().includes(calSearch.toLowerCase()))
    .slice(0, 20)

  function pickEvent(ev) {
    setForm(f => ({ ...f, name: ev.name, date: ev.date, distance: ev.distances[0] || '', url: ev.url }))
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
    if (res.ok) onSave({ ...form, id: initial?.id || data.id })
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
          <input className="cal-search" placeholder="Поиск по названию или городу..." value={calSearch} onChange={e => setCalSearch(e.target.value)} autoFocus />
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
              Из календаря: <a href={form.url} target="_blank" rel="noopener noreferrer">{form.name}</a>
            </p>
          )}
          <div className="calc-grid">
            <div className="field"><label>Название забега</label><input value={form.name} onChange={set('name')} placeholder="Moscow Marathon" required /></div>
            <div className="field"><label>Дата</label><input type="date" value={form.date} onChange={set('date')} required /></div>
          </div>
          <div className="calc-grid">
            <div className="field"><label>Дистанция</label><input value={form.distance} onChange={set('distance')} placeholder="42 км" /></div>
            <div className="field"><label>Цель (время)</label><input value={form.goal_time} onChange={set('goal_time')} placeholder="3:45:00" /></div>
          </div>
          <div className="field"><label>Результат (фактическое время)</label><input value={form.result_time} onChange={set('result_time')} placeholder="3:52:10" /></div>
          <div className="field"><label>Заметки</label><input value={form.notes} onChange={set('notes')} placeholder="Целевой темп 5:20..." /></div>
          {err && <p className="auth-error">{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="auth-submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Сохранение...' : initial?.id ? 'Сохранить' : 'Добавить забег'}
            </button>
            <button type="button" className="cab-btn" onClick={onCancel} style={{ padding: '12px 20px' }}>Отмена</button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Карточка забега ──────────────────────────────────────────
function RaceCard({ race, onEdit, onDelete }) {
  const past = isPast(race.date)
  const hasGoal = race.goal_time
  const hasResult = race.result_time

  return (
    <div className={`race-card ${past ? 'race-card--past' : ''}`}>
      <div className="race-card-date">
        <div className="event-date-day">{new Date(race.date).getUTCDate()}</div>
        <div className="event-date-month">{MONTHS[new Date(race.date).getUTCMonth()]}</div>
      </div>
      <div className="race-card-info">
        <div className="race-card-name">
          {race.url ? <a href={race.url} target="_blank" rel="noopener noreferrer">{race.name}</a> : race.name}
        </div>
        <div className="race-card-meta">
          {race.distance && <span className="dist-badge">{race.distance}</span>}
          {hasGoal && (
            <span className="race-tag race-tag--goal">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              цель {race.goal_time}
            </span>
          )}
          {hasResult && (
            <span className="race-tag race-tag--result">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}><polyline points="20 6 9 17 4 12"/></svg>
              факт {race.result_time}
            </span>
          )}
        </div>
        {hasGoal && hasResult && (
          <div className="race-compare">
            план → факт
          </div>
        )}
        {race.notes && <div className="race-notes">{race.notes}</div>}
      </div>
      <div className="race-card-actions">
        <button className="race-action-btn" onClick={() => onEdit(race)} title="Редактировать">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className="race-action-btn race-action-btn--del" onClick={() => onDelete(race.id)} title="Удалить">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>
  )
}

// ── Карточка тренировки ──────────────────────────────────────
function TrainingCard({ t }) {
  return (
    <div className="training-card">
      <div className="race-card-date">
        <div className="event-date-day">{new Date(t.date).getUTCDate()}</div>
        <div className="event-date-month">{MONTHS[new Date(t.date).getUTCMonth()]}</div>
      </div>
      <div className="training-stats">
        {t.distance_km && <div className="training-stat"><span className="training-val">{t.distance_km}</span><span className="training-unit">км</span></div>}
        {t.duration && <div className="training-stat"><span className="training-val">{t.duration}</span><span className="training-unit">время</span></div>}
        {t.pace && <div className="training-stat"><span className="training-val">{t.pace}</span><span className="training-unit">мин/км</span></div>}
        {t.avg_hr && <div className="training-stat"><span className="training-val">{t.avg_hr}</span><span className="training-unit">пульс</span></div>}
        {t.elevation && <div className="training-stat"><span className="training-val">{t.elevation}</span><span className="training-unit">м↑</span></div>}
        {t.calories && <div className="training-stat"><span className="training-val">{t.calories}</span><span className="training-unit">ккал</span></div>}
      </div>
      {t.notes && <div className="training-notes">{t.notes}</div>}
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────
export default function Cabinet({ user, onLogout, onUpdate }) {
  const [tab, setTab] = useState('races')
  const [races, setRaces] = useState([])
  const [racesLoaded, setRacesLoaded] = useState(false)
  const [trainings, setTrainings] = useState([])
  const [trainingsLoaded, setTrainingsLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [profileEditing, setProfileEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: user.name || '',
    avatar_url: user.avatar_url || '',
    bio: user.bio || '',
    city: user.city || '',
    birth_year: user.birth_year || '',
    weight: user.weight || '',
    height: user.height || '',
    max_hr: user.max_hr || '',
    resting_hr: user.resting_hr || '',
    vo2max: user.vo2max || '',
    pr_5k: user.pr_5k || '',
    pr_10k: user.pr_10k || '',
    pr_half: user.pr_half || '',
    pr_marathon: user.pr_marathon || '',
    pr_backyard: user.pr_backyard || '',
    goal_text: user.goal_text || '',
    injuries: user.injuries || '',
    restrictions: user.restrictions || '',
  })
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (tab === 'races' && !racesLoaded) {
      fetch('/api/races/list', { headers: authHeader() })
        .then(r => r.json())
        .then(d => { setRaces(d.races || []); setRacesLoaded(true) })
    }
    if (tab === 'trainings' && !trainingsLoaded) {
      fetch('/api/trainings/list', { headers: authHeader() })
        .then(r => r.json())
        .then(d => { setTrainings(d.trainings || []); setTrainingsLoaded(true) })
    }
  }, [tab, racesLoaded, trainingsLoaded])

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
    setAdding(false); setEditing(null)
  }

  const upcoming = races.filter(r => !isPast(r.date))
  const past = races.filter(r => isPast(r.date))
  const age = calcAge(user.birth_year)

  const prs = [
    { key: 'pr_5k', label: '5 км' }, { key: 'pr_10k', label: '10 км' },
    { key: 'pr_half', label: 'Полумарафон' }, { key: 'pr_marathon', label: 'Марафон' },
    { key: 'pr_backyard', label: 'Backyard Ultra', unit: 'ярдов' },
  ]

  return (
    <div className="cabinet">
      {/* Шапка */}
      <div className="cabinet-header">
        <div className="cabinet-header-left">
          <Avatar url={user.avatar_url} name={user.name} size={56} />
          <div>
            <h2 className="cabinet-name">{user.name}{age ? `, ${age}` : ''}</h2>
            <p className="cabinet-email">{user.email}{user.city ? ` · ${user.city}` : ''}</p>
            {user.goal_text && <p className="cabinet-goal-hint">🎯 {user.goal_text}</p>}
          </div>
        </div>
        <div className="cabinet-actions">
          {saved && <span className="cabinet-saved">Сохранено ✓</span>}
          <button className="cab-btn cab-btn--logout" onClick={onLogout}>Выйти</button>
        </div>
      </div>

      {/* Навигация */}
      <div className="cabinet-nav">
        <button className={`cabinet-nav-btn ${tab === 'trainings' ? 'active' : ''}`} onClick={() => setTab('trainings')}>Тренировки</button>
        <button className={`cabinet-nav-btn ${tab === 'races' ? 'active' : ''}`} onClick={() => setTab('races')}>Забеги</button>
        <button className={`cabinet-nav-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Профиль</button>
        <button className={`cabinet-nav-btn ${tab === 'health' ? 'active' : ''}`} onClick={() => setTab('health')}>Здоровье</button>
      </div>

      {/* ── ТРЕНИРОВКИ ── */}
      {tab === 'trainings' && (
        <div>
          <div className="training-hint">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
            Отправь скриншот тренировки боту <b>@spektr_run_bot</b> в Telegram — данные появятся здесь автоматически
          </div>

          {!trainingsLoaded && <p className="no-events">Загрузка...</p>}
          {trainingsLoaded && trainings.length === 0 && (
            <p className="no-events">Тренировок пока нет.<br/>Отправь скриншот боту в Telegram.</p>
          )}
          {trainings.map(t => <TrainingCard key={t.id} t={t} />)}
        </div>
      )}

      {/* ── МОИ ЗАБЕГИ ── */}
      {tab === 'races' && (
        <div>
          {(adding || editing) ? (
            <RaceForm initial={editing} onSave={onRaceSaved} onCancel={() => { setAdding(false); setEditing(null) }} />
          ) : (
            <>
              <button className="add-race-btn" onClick={() => setAdding(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Добавить забег
              </button>
              {!racesLoaded && <p className="no-events">Загрузка...</p>}
              {racesLoaded && races.length === 0 && (
                <p className="no-events">Пока нет добавленных забегов.<br/>Добавь предстоящий старт или прошедший результат.</p>
              )}
              {upcoming.length > 0 && (
                <div className="races-section">
                  <p className="cabinet-section-title">Предстоящие · {upcoming.length}</p>
                  {upcoming.map(r => <RaceCard key={r.id} race={r} onEdit={setEditing} onDelete={deleteRace} />)}
                </div>
              )}
              {past.length > 0 && (
                <div className="races-section">
                  <p className="cabinet-section-title">Прошедшие · {past.length}</p>
                  {past.map(r => <RaceCard key={r.id} race={r} onEdit={setEditing} onDelete={deleteRace} />)}
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

              {/* Физические данные */}
              {(user.weight || user.height || user.max_hr || user.resting_hr || user.vo2max) && (
                <>
                  <p className="cabinet-section-title">Физические данные</p>
                  <div className="stats-row">
                    {user.height && <div className="stat-chip"><span className="stat-val">{user.height}</span><span className="stat-unit">см</span></div>}
                    {user.weight && <div className="stat-chip"><span className="stat-val">{user.weight}</span><span className="stat-unit">кг</span></div>}
                    {user.max_hr && <div className="stat-chip"><span className="stat-val">{user.max_hr}</span><span className="stat-unit">ЧСС макс</span></div>}
                    {user.resting_hr && <div className="stat-chip"><span className="stat-val">{user.resting_hr}</span><span className="stat-unit">ЧСС покоя</span></div>}
                    {user.vo2max && <div className="stat-chip"><span className="stat-val">{user.vo2max}</span><span className="stat-unit">VO₂max</span></div>}
                  </div>
                </>
              )}

              {/* Личные рекорды */}
              <p className="cabinet-section-title">Личные рекорды</p>
              <div className="pr-grid">
                {prs.map(({ key, label, unit }) => (
                  <div key={key} className="pr-card">
                    <div className="pr-label">{label}</div>
                    <div className="pr-value">{user[key] ? `${user[key]}${unit ? ' ' + unit : ''}` : '—'}</div>
                  </div>
                ))}
              </div>

              {/* Долгосрочная цель */}
              {user.goal_text && (
                <>
                  <p className="cabinet-section-title">Цель</p>
                  <div className="goal-block">{user.goal_text}</div>
                </>
              )}

              <button className="cab-btn" style={{ marginTop: 8 }} onClick={() => setProfileEditing(true)}>
                Редактировать профиль
              </button>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="cabinet-form">
              <div className="field"><label>Имя</label><input value={form.name} onChange={setF('name')} required /></div>
              <div className="field"><label>Фото (ссылка на изображение)</label><input value={form.avatar_url} onChange={setF('avatar_url')} placeholder="https://..." /></div>
              <div className="field"><label>О себе</label><input value={form.bio} onChange={setF('bio')} placeholder="Бегаю с 2020 года..." /></div>
              <div className="calc-grid">
                <div className="field"><label>Город</label><input value={form.city} onChange={setF('city')} placeholder="Москва" /></div>
                <div className="field"><label>Год рождения</label><input type="number" value={form.birth_year} onChange={setF('birth_year')} placeholder="1990" /></div>
              </div>

              <p className="cabinet-section-title">Физические данные</p>
              <div className="calc-grid">
                <div className="field"><label>Рост (см)</label><input type="number" value={form.height} onChange={setF('height')} placeholder="175" /></div>
                <div className="field"><label>Вес (кг)</label><input type="number" value={form.weight} onChange={setF('weight')} placeholder="70" /></div>
                <div className="field"><label>ЧСС макс</label><input type="number" value={form.max_hr} onChange={setF('max_hr')} placeholder="185" /></div>
                <div className="field"><label>ЧСС покоя</label><input type="number" value={form.resting_hr} onChange={setF('resting_hr')} placeholder="52" /></div>
              </div>
              <div className="field"><label>VO₂max (мл/кг/мин)</label><input type="number" step="0.1" value={form.vo2max} onChange={setF('vo2max')} placeholder="48.5" /></div>

              <p className="cabinet-section-title">Личные рекорды</p>
              <div className="calc-grid">
                <div className="field"><label>5 км</label><input value={form.pr_5k} onChange={setF('pr_5k')} placeholder="0:22:00" /></div>
                <div className="field"><label>10 км</label><input value={form.pr_10k} onChange={setF('pr_10k')} placeholder="0:46:00" /></div>
                <div className="field"><label>Полумарафон</label><input value={form.pr_half} onChange={setF('pr_half')} placeholder="1:42:00" /></div>
                <div className="field"><label>Марафон</label><input value={form.pr_marathon} onChange={setF('pr_marathon')} placeholder="3:45:00" /></div>
              </div>
              <div className="field"><label>Backyard Ultra (кол-во ярдов)</label><input type="number" value={form.pr_backyard} onChange={setF('pr_backyard')} placeholder="8" /></div>

              <p className="cabinet-section-title">Долгосрочная цель</p>
              <div className="field"><label>Цель</label><input value={form.goal_text} onChange={setF('goal_text')} placeholder="Пробежать марафон из 3:30 в 2026 году" /></div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="auth-submit" disabled={saving} style={{ flex: 1 }}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
                <button type="button" className="cab-btn" onClick={() => setProfileEditing(false)} style={{ padding: '12px 20px' }}>Отмена</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── ЗДОРОВЬЕ ── */}
      {tab === 'health' && (
        <div>
          {!profileEditing ? (
            <div className="cabinet-view">
              <div className="health-block">
                <p className="cabinet-section-title">Травмы</p>
                <p className="health-text">{user.injuries || '—'}</p>
              </div>
              <div className="health-block">
                <p className="cabinet-section-title">Ограничения по нагрузке</p>
                <p className="health-text">{user.restrictions || '—'}</p>
              </div>
              <button className="cab-btn" style={{ marginTop: 8 }} onClick={() => setProfileEditing(true)}>
                Редактировать
              </button>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="cabinet-form">
              <div className="field">
                <label>Травмы</label>
                <textarea className="cab-textarea" value={form.injuries} onChange={setF('injuries')} placeholder="Колено (2023), пяточная шпора..." rows={3} />
              </div>
              <div className="field">
                <label>Ограничения по нагрузке</label>
                <textarea className="cab-textarea" value={form.restrictions} onChange={setF('restrictions')} placeholder="Не более 60 км в неделю, исключить горки..." rows={3} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="auth-submit" disabled={saving} style={{ flex: 1 }}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
                <button type="button" className="cab-btn" onClick={() => setProfileEditing(false)} style={{ padding: '12px 20px' }}>Отмена</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
