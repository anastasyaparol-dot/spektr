function IconCalendar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconPace() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15.5 15.5"/>
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function IconShoe() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16s0-6 5-8l5 2 4-2 4 3v3H2z"/>
      <path d="M2 16h18v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z"/>
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

import logoImg from '../assets/logo.jpg'

export default function Home({ onNav, theme, onThemeToggle, user }) {
  return (
    <div className="home">
      <div className="home-topbar">
        <button className="theme-toggle" onClick={onThemeToggle} aria-label="Сменить тему" style={{marginLeft: 'auto'}}>
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="home-hero">
        <div className="home-logo-wrap">
          <img src={logoImg} alt="Спектр" className="home-logo-img" />
        </div>
        <p className="home-sub">Всё для бегуна — в одном месте</p>
      </div>

      <div className="home-actions">
        <button className="home-card" onClick={() => onNav('calendar')}>
          <span className="home-card-icon"><IconCalendar /></span>
          <span className="home-card-label">Календарь забегов</span>
          <span className="home-card-desc">Предстоящие старты в России</span>
        </button>

        <button className="home-card" onClick={() => onNav('pace')}>
          <span className="home-card-icon"><IconPace /></span>
          <span className="home-card-label">Калькулятор темпа</span>
          <span className="home-card-desc">Темп, время, дистанция</span>
        </button>

        <a
          className="home-card home-card-tg"
          href="https://t.me/maksromanovrun"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="home-card-icon"><IconTelegram /></span>
          <span className="home-card-label">Полезные статьи и информация</span>
          <span className="home-card-desc">Telegram-канал о беге</span>
        </a>

        <button className="home-card" onClick={() => onNav('gear')}>
          <span className="home-card-icon"><IconShoe /></span>
          <span className="home-card-label">ИИ помощник: экипировка</span>
          <span className="home-card-desc">Кроссовки и снаряжение для бега</span>
        </button>

        <button className="home-card" onClick={() => onNav(user?.role === 'admin' ? 'admin' : 'cabinet')}>
          <span className="home-card-icon"><IconUser /></span>
          <span className="home-card-label">{user ? `Привет, ${user.name.split(' ')[0]}` : 'Личный кабинет'}</span>
          <span className="home-card-desc">{user ? (user.role === 'admin' ? 'Админ-панель' : 'Профиль и личные рекорды') : 'Войти или зарегистрироваться'}</span>
        </button>
      </div>
    </div>
  )
}
