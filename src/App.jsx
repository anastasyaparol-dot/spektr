import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/Home'
import PaceCalculator from './components/PaceCalculator'
import EventCalendar from './components/EventCalendar'
import AuthPage from './components/AuthPage'
import Cabinet from './components/Cabinet'
import AdminPanel from './components/AdminPanel'
import GearChat from './components/GearChat'
import Club from './components/Club'
import RunnerScale from './components/RunnerScale'

export default function App() {
  const [page, setPage] = useState('home')
  const [theme, setTheme] = useState('light')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUser(d.user) })
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  function handleAuth(u) {
    setUser(u)
    setPage(u.role === 'admin' ? 'admin' : 'cabinet')
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    setPage('home')
  }

  if (!authChecked) return null

  const isInner = page !== 'home'
  const isCabinet = page === 'cabinet' || page === 'admin' || page === 'auth' || page === 'gear' || page === 'club'

  return (
    <div className="app">
      <RunnerScale />
      {isInner && (
        <header className="header">
          <button className="back-btn" onClick={() => setPage('home')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            На главную
          </button>
          <div className="header-right">
            {!isCabinet && (
              <nav className="tabs">
                <button className={`tab ${page === 'calendar' ? 'active' : ''}`} onClick={() => setPage('calendar')}>Календарь</button>
                <button className={`tab ${page === 'pace' ? 'active' : ''}`} onClick={() => setPage('pace')}>Темп</button>
              </nav>
            )}
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Сменить тему">
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </header>
      )}

      <main>
        {page === 'home' && <Home onNav={setPage} theme={theme} onThemeToggle={toggleTheme} user={user} />}
        {page === 'calendar' && <EventCalendar />}
        {page === 'pace' && <PaceCalculator />}
        {page === 'gear' && <GearChat />}
        {page === 'club' && <Club />}
        {(page === 'auth' || page === 'cabinet' || page === 'admin') && (
          !user
            ? <AuthPage onAuth={handleAuth} />
            : user.role === 'admin'
              ? <AdminPanel onLogout={logout} />
              : <Cabinet user={user} onLogout={logout} onUpdate={setUser} />
        )}
      </main>
    </div>
  )
}
