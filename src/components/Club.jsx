export default function Club() {
  return (
    <div className="club">
      <div className="club-hero">
        <h1 className="club-title">Беговой клуб СПЕКТР</h1>
        <p className="club-subtitle">Индивидуальное тренерское ведение для тех, кто хочет результата</p>
      </div>

      <div className="club-section">
        <h2 className="club-section-title">Что такое индивидуальное ведение</h2>
        <div className="club-cards">
          <div className="club-card">
            <span className="club-card-icon">📋</span>
            <h3>Персональный план</h3>
            <p>Тренировочный план составляется под тебя: твой уровень, цели, расписание и физические особенности.</p>
          </div>
          <div className="club-card">
            <span className="club-card-icon">💬</span>
            <h3>Постоянная связь с тренером</h3>
            <p>Обратная связь по каждой тренировке, ответы на вопросы, корректировка плана в реальном времени.</p>
          </div>
          <div className="club-card">
            <span className="club-card-icon">📊</span>
            <h3>Анализ показателей</h3>
            <p>Разбор твоих данных: пульс, темп, динамика прогресса. Видим, что работает — и усиливаем.</p>
          </div>
          <div className="club-card">
            <span className="club-card-icon">🎯</span>
            <h3>Подготовка к соревнованиям</h3>
            <p>Выбираем цель-забег, строим подводку, разрабатываем тактику гонки. От 5 км до ультра.</p>
          </div>
        </div>
      </div>

      <div className="club-section">
        <h2 className="club-section-title">Что ты можешь достичь</h2>
        <div className="club-results">
          <div className="club-result">
            <span className="club-result-num">−15 мин</span>
            <span className="club-result-desc">на марафоне за сезон подготовки</span>
          </div>
          <div className="club-result">
            <span className="club-result-num">первый старт</span>
            <span className="club-result-desc">с нуля до финиша полумарафона за 3 месяца</span>
          </div>
          <div className="club-result">
            <span className="club-result-num">без травм</span>
            <span className="club-result-desc">грамотное планирование нагрузки и восстановления</span>
          </div>
          <div className="club-result">
            <span className="club-result-num">личный рекорд</span>
            <span className="club-result-desc">на любой дистанции — 5 км, 10 км, 21 км, 42 км</span>
          </div>
        </div>
      </div>

      <div className="club-section">
        <h2 className="club-section-title">Для кого</h2>
        <ul className="club-list">
          <li>🏃 Только начинаешь бегать и хочешь сделать всё правильно</li>
          <li>🏅 Уже бегаешь, но застрял на одном уровне</li>
          <li>🎽 Готовишься к конкретному забегу и хочешь показать лучший результат</li>
          <li>💪 Хочешь бегать больше без травм и перетренированности</li>
          <li>🌲 Интересует трейл, ультра или Backyard Ultra</li>
        </ul>
      </div>

      <div className="club-cta">
        <h2 className="club-cta-title">Готов начать?</h2>
        <p className="club-cta-desc">Напиши нам — обсудим твои цели и подберём формат работы</p>
        <a
          className="club-cta-btn"
          href="https://t.me/maksromanovrun"
          target="_blank"
          rel="noopener noreferrer"
        >
          Написать тренеру
        </a>
      </div>
    </div>
  )
}
