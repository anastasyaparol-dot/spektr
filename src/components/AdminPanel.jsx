import { useState, useEffect } from 'react'

function Avatar({ url, name, size = 40 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt={name} className="avatar-img" style={{ width: size, height: size }} />
  return <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</div>
}

function calcAge(birthYear) {
  return birthYear ? new Date().getFullYear() - birthYear : null
}

export default function AdminPanel({ onLogout }) {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/admin/athletes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setAthletes(d.athletes || []); setLoading(false) })
  }, [])

  const prs = [
    { key: 'pr_5k', label: '5 км' }, { key: 'pr_10k', label: '10 км' },
    { key: 'pr_half', label: 'Полу' }, { key: 'pr_marathon', label: 'Марафон' },
    { key: 'pr_backyard', label: 'Backyard', unit: 'ярд.' },
  ]

  return (
    <div className="cabinet">
      <div className="cabinet-header">
        <div>
          <h2 className="cabinet-name">Атлеты</h2>
          <p className="cabinet-email">{athletes.length} зарегистрировано</p>
        </div>
        <button className="cab-btn cab-btn--logout" onClick={onLogout}>Выйти</button>
      </div>

      {loading ? (
        <p className="no-events">Загрузка...</p>
      ) : athletes.length === 0 ? (
        <p className="no-events">Пока нет зарегистрированных атлетов</p>
      ) : (
        <div className="athletes-list">
          {athletes.map(a => {
            const age = calcAge(a.birth_year)
            const isOpen = selected === a.id
            return (
              <div key={a.id} className={`athlete-row ${isOpen ? 'athlete-row--open' : ''}`}>
                <button className="athlete-row-header" onClick={() => setSelected(isOpen ? null : a.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar url={a.avatar_url} name={a.name} size={36} />
                    <div>
                      <span className="athlete-name">{a.name}</span>
                      {age && <span className="athlete-city">, {age} лет</span>}
                      {a.city && <span className="athlete-city"> · {a.city}</span>}
                    </div>
                  </div>
                  <div className="athlete-meta">
                    <span className="athlete-date">{new Date(a.created_at).toLocaleDateString('ru-RU')}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="athlete-detail">
                    {a.bio && <p className="cabinet-bio">{a.bio}</p>}
                    <p className="cabinet-email">{a.email}</p>

                    {/* Физические данные */}
                    {(a.height || a.weight || a.max_hr || a.resting_hr || a.vo2max) && (
                      <>
                        <p className="cabinet-section-title">Физические данные</p>
                        <div className="stats-row">
                          {a.height && <div className="stat-chip"><span className="stat-val">{a.height}</span><span className="stat-unit">см</span></div>}
                          {a.weight && <div className="stat-chip"><span className="stat-val">{a.weight}</span><span className="stat-unit">кг</span></div>}
                          {a.max_hr && <div className="stat-chip"><span className="stat-val">{a.max_hr}</span><span className="stat-unit">ЧСС макс</span></div>}
                          {a.resting_hr && <div className="stat-chip"><span className="stat-val">{a.resting_hr}</span><span className="stat-unit">ЧСС покоя</span></div>}
                          {a.vo2max && <div className="stat-chip"><span className="stat-val">{a.vo2max}</span><span className="stat-unit">VO₂max</span></div>}
                        </div>
                      </>
                    )}

                    {/* Личные рекорды */}
                    <p className="cabinet-section-title">Личные рекорды</p>
                    <div className="pr-grid">
                      {prs.map(({ key, label, unit }) => (
                        <div key={key} className="pr-card">
                          <div className="pr-label">{label}</div>
                          <div className="pr-value">{a[key] ? `${a[key]}${unit ? ' ' + unit : ''}` : '—'}</div>
                        </div>
                      ))}
                    </div>

                    {/* Цель */}
                    {a.goal_text && (
                      <>
                        <p className="cabinet-section-title">Цель</p>
                        <div className="goal-block">{a.goal_text}</div>
                      </>
                    )}

                    {/* Здоровье */}
                    {(a.injuries || a.restrictions) && (
                      <>
                        <p className="cabinet-section-title">Здоровье</p>
                        {a.injuries && <div className="health-block"><p className="cabinet-section-title" style={{fontSize:11}}>Травмы</p><p className="health-text">{a.injuries}</p></div>}
                        {a.restrictions && <div className="health-block"><p className="cabinet-section-title" style={{fontSize:11}}>Ограничения</p><p className="health-text">{a.restrictions}</p></div>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
