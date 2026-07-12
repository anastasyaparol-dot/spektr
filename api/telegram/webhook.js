import Anthropic from '@anthropic-ai/sdk'
import { sql, initDB } from '../_db.js'

const TOKEN = process.env.TELEGRAM_TOKEN
const API = `https://api.telegram.org/bot${TOKEN}`
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DIFFICULTY_LABELS = ['', '😌 Лёгкая', '🙂 Средняя', '😤 Тяжёлая', '🥵 Очень тяжёлая', '💀 Предельная']

// ── Telegram helpers ──────────────────────────────────────────
async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

function mainMenu() {
  return {
    keyboard: [
      [{ text: '🏃 Калькулятор темпа' }, { text: '📊 Отправить тренировку' }],
      [{ text: '📢 Канал Максима Романова' }, { text: '🌐 Перейти на сайт' }],
    ],
    resize_keyboard: true,
    persistent: true
  }
}

async function send(chat_id, text, extra = {}) {
  await tg('sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra })
}

// ── Сессия ────────────────────────────────────────────────────
async function getSession(telegramId) {
  const [row] = await sql`SELECT state, data FROM bot_sessions WHERE telegram_id = ${telegramId}`
  return row || { state: null, data: {} }
}

async function setSession(telegramId, state, data = {}) {
  await sql`
    INSERT INTO bot_sessions (telegram_id, state, data, updated_at)
    VALUES (${telegramId}, ${state}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (telegram_id) DO UPDATE SET state = ${state}, data = ${JSON.stringify(data)}, updated_at = NOW()
  `
}

async function clearSession(telegramId) {
  await setSession(telegramId, null, {})
}

// ── Калькулятор темпа ─────────────────────────────────────────
function parseDuration(s) {
  // принимает: 3:45:00 или 45:00 или 45m или 2h30m
  if (!s) return null
  const hms = s.match(/^(\d+):(\d+):(\d+)$/)
  if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3])
  const ms = s.match(/^(\d+):(\d+)$/)
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2])
  const h = s.match(/(\d+(?:\.\d+)?)h/i)
  const m = s.match(/(\d+(?:\.\d+)?)m/i)
  return (h ? parseFloat(h[1]) * 3600 : 0) + (m ? parseFloat(m[1]) * 60 : 0) || null
}

function fmtTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

function fmtPace(secPerKm) {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2,'0')}`
}

function calcPace(data) {
  const { field1, val1, field2, val2 } = data
  const vals = { [field1]: val1, [field2]: val2 }

  let dist = vals.dist ? parseFloat(String(vals.dist).replace(',', '.')) : null
  let timeSec = vals.time ? parseDuration(String(vals.time)) : null
  let paceSecPerKm = vals.pace ? parseDuration(String(vals.pace)) : null
  let speed = vals.speed ? parseFloat(String(vals.speed).replace(',', '.')) : null

  // Рассчитываем недостающие
  if (dist && timeSec && !paceSecPerKm) paceSecPerKm = timeSec / dist
  if (dist && paceSecPerKm && !timeSec) timeSec = dist * paceSecPerKm
  if (timeSec && paceSecPerKm && !dist) dist = timeSec / paceSecPerKm
  if (speed) {
    if (!dist && timeSec) dist = speed * timeSec / 3600
    if (!timeSec && dist) timeSec = dist / speed * 3600
    if (!paceSecPerKm) paceSecPerKm = 3600 / speed
  }
  if (paceSecPerKm && !speed) speed = 3600 / paceSecPerKm

  const lines = ['📊 <b>Результат:</b>']
  if (dist) lines.push(`🏃 Дистанция: <b>${dist.toFixed(2)} км</b>`)
  if (timeSec) lines.push(`⏱ Время: <b>${fmtTime(timeSec)}</b>`)
  if (paceSecPerKm) lines.push(`📈 Темп: <b>${fmtPace(paceSecPerKm)} мин/км</b>`)
  if (speed) lines.push(`⚡ Скорость: <b>${speed.toFixed(2)} км/ч</b>`)
  return lines.join('\n')
}

// ── Имена полей ───────────────────────────────────────────────
const FIELD_NAMES = {
  dist:  'дистанцию (км), например: <b>10</b> или <b>42.2</b>',
  time:  'время, например: <b>3:45:00</b> или <b>50:30</b>',
  pace:  'темп (мин/км), например: <b>5:30</b>',
  speed: 'скорость (км/ч), например: <b>10.5</b>',
}

const FIELD_LABELS = { dist: 'Дистанция', time: 'Время', pace: 'Темп', speed: 'Скорость' }

// ── Распознавание скриншота ───────────────────────────────────
async function getFileUrl(file_id) {
  const data = await tg('getFile', { file_id })
  return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`
}

async function analyzeImage(imageUrl) {
  const imageRes = await fetch(imageUrl)
  const buffer = await imageRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: `Извлеки данные тренировки. Верни ТОЛЬКО JSON:
{"date":"YYYY-MM-DD","distance_km":число,"duration":"ЧЧ:ММ:СС","pace":"М:СС","avg_hr":число,"max_hr":число,"elevation":число,"calories":число,"notes":"тип активности"}
Если поле не найдено — null.` }
      ]
    }]
  })

  try {
    const match = response.content[0].text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}

function difficultyKeyboard(trainingId) {
  return {
    inline_keyboard: [[
      { text: '😌 1', callback_data: `diff:${trainingId}:1` },
      { text: '🙂 2', callback_data: `diff:${trainingId}:2` },
      { text: '😤 3', callback_data: `diff:${trainingId}:3` },
      { text: '🥵 4', callback_data: `diff:${trainingId}:4` },
      { text: '💀 5', callback_data: `diff:${trainingId}:5` },
    ]]
  }
}

// ── Handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end()
  const update = req.body
  if (!update) return res.status(200).end()

  await initDB()

  // Callbacks
  if (update.callback_query) {
    const cb = update.callback_query
    const chatId2 = cb.message.chat.id
    const telegramId2 = cb.from.id
    await tg('answerCallbackQuery', { callback_query_id: cb.id })

    if (cb.data.startsWith('calc:f1:')) {
      const field1 = cb.data.split(':')[2]
      await setSession(telegramId2, 'calc_val1', { field1 })
      await send(chatId2, `Введи ${FIELD_NAMES[field1]}:`)
      return res.status(200).end()
    }

    if (cb.data.startsWith('calc:f2:')) {
      const field2 = cb.data.split(':')[2]
      const session2 = await getSession(telegramId2)
      const data2 = { ...session2.data, field2 }
      await setSession(telegramId2, 'calc_val2', data2)
      await send(chatId2, `Введи ${FIELD_NAMES[field2]}:`)
      return res.status(200).end()
    }

    if (cb.data.startsWith('diff:')) {
      const [, trainingId, level] = cb.data.split(':')
      const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId2}`
      if (user) {
        await sql`UPDATE trainings SET difficulty = ${parseInt(level)} WHERE id = ${parseInt(trainingId)} AND user_id = ${user.id}`
        await send(chatId2, `${DIFFICULTY_LABELS[level]} — сложность сохранена!`, { reply_markup: mainMenu() })
      }
      return res.status(200).end()
    }

    return res.status(200).end()
  }

  const msg = update.message
  if (!msg) return res.status(200).end()

  const chatId = msg.chat.id
  const telegramId = msg.from.id
  const text = (msg.text || '').trim()

  try {
    const session = await getSession(telegramId)

    // ── /start ──
    if (text === '/start' || text === '🌐 Перейти на сайт' || text === '📢 Канал Максима Романова') {
      if (text === '📢 Канал Максима Романова') {
        await send(chatId, `📢 Канал Максима Романова о беге:\nt.me/maksromanovrun`, { reply_markup: mainMenu() })
        return res.status(200).end()
      }
      if (text === '🌐 Перейти на сайт') {
        await send(chatId, `🌐 Сайт Спектра:\nspektr-ebon.vercel.app`, { reply_markup: mainMenu() })
        return res.status(200).end()
      }
      const [user] = await sql`SELECT name FROM users WHERE telegram_id = ${telegramId}`
      const greeting = user
        ? `👋 Привет, <b>${user.name}</b>! Выбери что хочешь сделать:`
        : `👋 Привет! Я бот Спектра — помогаю считать темп и записывать тренировки.\n\nВыбери что хочешь сделать:`
      await clearSession(telegramId)
      await send(chatId, greeting, { reply_markup: mainMenu() })
      return res.status(200).end()
    }

    // ── Калькулятор темпа ──
    if (text === '🏃 Калькулятор темпа') {
      await clearSession(telegramId)
      await send(chatId, `📊 <b>Калькулятор темпа</b>\n\nВыбери первую величину:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Дистанция', callback_data: 'calc:f1:dist' }, { text: '⏱ Время', callback_data: 'calc:f1:time' }],
            [{ text: '📈 Темп', callback_data: 'calc:f1:pace' }, { text: '⚡ Скорость', callback_data: 'calc:f1:speed' }],
          ]
        }
      })
      return res.status(200).end()
    }

    // ── Отправить тренировку ──
    if (text === '📊 Отправить тренировку') {
      const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`
      if (!user) {
        await send(chatId, `❌ Для загрузки тренировок нужно привязать аккаунт.\n\nОтправь свой <b>email</b> от spektr-ebon.vercel.app`, { reply_markup: mainMenu() })
      } else {
        await send(chatId, `📸 Отправь скриншот тренировки из Garmin, Strava, Apple Watch или другого приложения — распознаю и внесу в кабинет.`, { reply_markup: mainMenu() })
      }
      return res.status(200).end()
    }

    // ── Калькулятор: шаги через inline callback ──
    if (update.callback_query) return // уже обработан выше

    // ── Привязка по email ──
    if (text.includes('@') && !msg.photo) {
      const email = text.toLowerCase()
      const [user] = await sql`SELECT id, name FROM users WHERE email = ${email}`
      if (!user) {
        await send(chatId, `❌ Email <b>${email}</b> не найден.\nСначала зарегистрируйся на spektr-ebon.vercel.app`, { reply_markup: mainMenu() })
      } else {
        await sql`UPDATE users SET telegram_id = ${telegramId} WHERE id = ${user.id}`
        await send(chatId, `✅ Готово, <b>${user.name}</b>! Аккаунт привязан.\n\nТеперь отправляй скриншоты тренировок 📸`, { reply_markup: mainMenu() })
      }
      return res.status(200).end()
    }

    // ── Калькулятор: ввод первого значения → выбор второй величины ──
    if (session.state === 'calc_val1') {
      const data = { ...session.data, val1: text }
      await setSession(telegramId, 'calc_pick2', data)
      await send(chatId, `Выбери <b>вторую</b> величину:`, {
        reply_markup: {
          inline_keyboard: [
            Object.entries(FIELD_LABELS)
              .filter(([k]) => k !== data.field1)
              .map(([k, v]) => ({ text: v, callback_data: `calc:f2:${k}` }))
          ]
        }
      })
      return res.status(200).end()
    }

    // ── Калькулятор: ввод второго значения → результат ──
    if (session.state === 'calc_val2') {
      const data = { ...session.data, val2: text }
      const result = calcPace(data)
      await clearSession(telegramId)
      await send(chatId, result + '\n\n🔄 Хочешь посчитать ещё? Нажми <b>🏃 Калькулятор темпа</b>', { reply_markup: mainMenu() })
      return res.status(200).end()
    }

    // ── Скриншот тренировки ──
    if (msg.photo) {
      const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`
      if (!user) {
        await send(chatId, `❌ Сначала привяжи аккаунт — отправь свой email от Спектра.`, { reply_markup: mainMenu() })
        return res.status(200).end()
      }
      await send(chatId, `⏳ Анализирую...`)
      const photo = msg.photo[msg.photo.length - 1]
      const imageUrl = await getFileUrl(photo.file_id)
      const data = await analyzeImage(imageUrl)
      if (!data) {
        await send(chatId, `❌ Не смог распознать. Попробуй другой скриншот.`, { reply_markup: mainMenu() })
        return res.status(200).end()
      }
      const date = data.date || new Date().toISOString().split('T')[0]
      const [row] = await sql`
        INSERT INTO trainings (user_id, date, distance_km, duration, pace, avg_hr, max_hr, elevation, calories, notes, source)
        VALUES (${user.id}, ${date}, ${data.distance_km ?? null}, ${data.duration ?? null},
                ${data.pace ?? null}, ${data.avg_hr ?? null}, ${data.max_hr ?? null},
                ${data.elevation ?? null}, ${data.calories ?? null}, ${data.notes ?? null}, 'telegram')
        RETURNING id
      `
      const lines = [
        `✅ <b>Тренировка сохранена!</b>`,
        data.date ? `📅 ${data.date}` : '',
        data.distance_km ? `🏃 ${data.distance_km} км` : '',
        data.duration ? `⏱ ${data.duration}` : '',
        data.pace ? `📈 Темп: ${data.pace}/км` : '',
        data.avg_hr ? `❤️ Пульс: ${data.avg_hr}` : '',
        data.elevation ? `⛰ Набор: ${data.elevation} м` : '',
        data.calories ? `🔥 ${data.calories} ккал` : '',
        '', '<b>Оцени сложность:</b>'
      ].filter(l => l !== undefined).join('\n')
      await send(chatId, lines, { reply_markup: difficultyKeyboard(row.id) })
      return res.status(200).end()
    }

    // ── Дефолт ──
    await send(chatId, `Выбери действие:`, { reply_markup: mainMenu() })

  } catch (e) {
    console.error('webhook error:', e.message)
    try { await send(chatId, `❌ Ошибка: ${e.message.slice(0, 100)}`) } catch {}
  }

  res.status(200).end()
}
