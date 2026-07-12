import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Какие кроссовки выбрать для первого марафона?',
  'Лучшие трейловые кроссовки 2024-2025',
  'Кроссовки для бега по асфальту с пронацией',
  'Что надеть на зимнюю пробежку?',
  'Сравни Nike Vaporfly и Adidas Adizero',
  'Кроссовки для ежедневных тренировок до 10 000 ₽',
]

export default function GearChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Привет! Помогу подобрать экипировку для бега. Спроси про кроссовки, одежду или снаряжение — дам конкретные рекомендации.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')

    const next = [...messages, { role: 'user', text: q }]
    setMessages(next)
    setLoading(true)

    try {
      const apiMessages = next.map(m => ({ role: m.role, content: m.text }))
      const res = await fetch('/api/gear/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', text: data.reply || 'Ошибка ответа' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Ошибка сети. Попробуй ещё раз.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gear-chat">
      <div className="gear-chat-header">
        <div>
          <h2 className="cal-title">ИИ по экипировке</h2>
          <p className="cal-desc">Кроссовки, одежда, снаряжение — подберём под твои задачи</p>
        </div>
      </div>

      {messages.length === 1 && (
        <div className="gear-suggestions">
          {SUGGESTIONS.map(s => (
            <button key={s} className="gear-suggestion-btn" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="gear-messages">
        {messages.map((m, i) => (
          <div key={i} className={`gear-msg gear-msg--${m.role}`}>
            {m.role === 'assistant' && (
              <div className="gear-msg-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
              </div>
            )}
            <div className="gear-msg-bubble">
              {m.text.split('\n').map((line, j) => (
                <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br/>}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="gear-msg gear-msg--assistant">
            <div className="gear-msg-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
            </div>
            <div className="gear-msg-bubble gear-msg-bubble--loading">
              <span/><span/><span/>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="gear-input-row" onSubmit={e => { e.preventDefault(); send() }}>
        <input
          className="gear-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Спроси про кроссовки или экипировку..."
          disabled={loading}
        />
        <button type="submit" className="gear-send-btn" disabled={!input.trim() || loading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
