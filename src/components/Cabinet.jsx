import { useState } from 'react'

export default function Cabinet({ user, onLogout, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    city: user.city || '',
    birth_year: user.birth_year || '',
    pr_5k: user.pr_5k || '',
    pr_10k: user.pr_10k || '',
    pr_half: user.pr_half || '',
    pr_marathon: user.pr_marathon || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const token = localStorage.getItem('token')
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setEditing(false)
      onUpdate({ ...user, ...form })
      setTimeout(() => setSaved(false), 2000)
    }
  }

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
          <h2 className="cabinet-name">{user.name}</h2>
          <p className="cabinet-email">{user.email}</p>
          {user.city && <p className="cabinet-city">{user.city}</p>}
        </div>
        <div className="cabinet-actions">
          {saved && <span className="cabinet-saved">Сохранено ✓</span>}
          <button className="cab-btn" onClick={() => setEditing(e => !e)}>
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
          <button className="cab-btn cab-btn--logout" onClick={onLogout}>Выйти</button>
        </div>
      </div>

      {!editing ? (
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
        </div>
      ) : (
        <form onSubmit={save} className="cabinet-form">
          <div className="field">
            <label>Имя</label>
            <input value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label>О себе</label>
            <input value={form.bio} onChange={set('bio')} placeholder="Бегаю с 2020 года..." />
          </div>
          <div className="calc-grid">
            <div className="field">
              <label>Город</label>
              <input value={form.city} onChange={set('city')} placeholder="Москва" />
            </div>
            <div className="field">
              <label>Год рождения</label>
              <input type="number" value={form.birth_year} onChange={set('birth_year')} placeholder="1990" />
            </div>
          </div>

          <p className="cabinet-section-title">Личные рекорды</p>
          <div className="calc-grid">
            {prs.map(({ key, label }) => (
              <div key={key} className="field">
                <label>{label}</label>
                <input value={form[key]} onChange={set(key)} placeholder="0:00:00" />
              </div>
            ))}
          </div>

          <button type="submit" className="auth-submit" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      )}
    </div>
  )
}
