import { useState, useEffect } from 'react'

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
    { key: 'pr_5k', label: '5 км' },
    { key: 'pr_10k', label: '10 км' },
    { key: 'pr_half', label: 'Полумарафон' },
    { key: 'pr_marathon', label: 'Марафон' },
  ]

  return (
    <div className="cabinet">
      <div className="cabinet-header">
        <div>
          <h2 className="cabinet-name">Админ-панель</h2>
          <p className="cabinet-email">{athletes.length} атлетов зарегистрировано</p>
        </div>
        <button className="cab-btn cab-btn--logout" onClick={onLogout}>Выйти</button>
      </div>

      {loading ? (
        <p className="no-events">Загрузка...</p>
      ) : athletes.length === 0 ? (
        <p className="no-events">Пока нет зарегистрированных атлетов</p>
      ) : (
        <div className="athletes-list">
          {athletes.map(a => (
            <div key={a.id} className={`athlete-row ${selected === a.id ? 'athlete-row--open' : ''}`}>
              <button className="athlete-row-header" onClick={() => setSelected(selected === a.id ? null : a.id)}>
                <div>
                  <span className="athlete-name">{a.name}</span>
                  {a.city && <span className="athlete-city">, {a.city}</span>}
                </div>
                <div className="athlete-meta">
                  <span className="athlete-email">{a.email}</span>
                  <span className="athlete-date">{new Date(a.created_at).toLocaleDateString('ru-RU')}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: selected === a.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {selected === a.id && (
                <div className="athlete-detail">
                  {a.bio && <p className="cabinet-bio">{a.bio}</p>}
                  {a.birth_year && <p className="cabinet-email">Год рождения: {a.birth_year}</p>}
                  <div className="pr-grid">
                    {prs.map(({ key, label }) => (
                      <div key={key} className="pr-card">
                        <div className="pr-label">{label}</div>
                        <div className="pr-value">{a[key] || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
