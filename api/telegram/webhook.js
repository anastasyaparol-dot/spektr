import Anthropic from '@anthropic-ai/sdk'
import { sql, initDB } from '../_db.js'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DIFFICULTY = ['', '😌 Лёгкая', '🙂 Средняя', '😤 Тяжёлая', '🥵 Очень тяжёлая', '💀 Предельная']

async function sendMessage(chat_id, text, extra = {}) {
  await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', ...extra })
  })
}

async function answerCallback(callback_query_id) {
  await fetch(`${API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id })
  })
}

async function getFileUrl(file_id) {
  const res = await fetch(`${API_URL}/getFile?file_id=${file_id}`)
  const data = await res.json()
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${data.result.file_path}`
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end()

  const update = req.body
  if (!update) return res.status(200).end()

  await initDB()

  // Inline-кнопка оценки сложности
  if (update.callback_query) {
    const cb = update.callback_query
    const chatId = cb.message.chat.id
    const telegramId = cb.from.id
    const [, trainingId, level] = cb.data.split(':')

    await answerCallback(cb.id)

    const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`
    if (user) {
      await sql`UPDATE trainings SET difficulty = ${parseInt(level)} WHERE id = ${parseInt(trainingId)} AND user_id = ${user.id}`
      await sendMessage(chatId, `${DIFFICULTY[level]} — сложность сохранена!`)
    }
    return res.status(200).end()
  }

  const msg = update.message
  if (!msg) return res.status(200).end()

  const chatId = msg.chat.id
  const telegramId = msg.from.id
  const text = msg.text || ''

  try {
    // /start
    if (text.startsWith('/start')) {
      const [user] = await sql`SELECT name FROM users WHERE telegram_id = ${telegramId}`
      if (user) {
        await sendMessage(chatId, `👋 Привет, <b>${user.name}</b>!\n\nОтправь скриншот тренировки — внесу в кабинет.`)
      } else {
        await sendMessage(chatId, `👋 Привет! Я бот Спектра.\n\nОтправь свой <b>email</b> от spektr-ebon.vercel.app — привяжу аккаунт.`)
      }
      return res.status(200).end()
    }

    // Привязка по email
    if (text.includes('@') && !msg.photo) {
      const email = text.trim().toLowerCase()
      const [user] = await sql`SELECT id, name FROM users WHERE email = ${email}`
      if (!user) {
        await sendMessage(chatId, `❌ Email <b>${email}</b> не найден.\n\nСначала зарегистрируйся на spektr-ebon.vercel.app`)
      } else {
        await sql`UPDATE users SET telegram_id = ${telegramId} WHERE id = ${user.id}`
        await sendMessage(chatId, `✅ Готово, <b>${user.name}</b>! Аккаунт привязан.\n\nТеперь отправляй скриншоты тренировок 📸`)
      }
      return res.status(200).end()
    }

    // Скриншот
    if (msg.photo) {
      const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`
      if (!user) {
        await sendMessage(chatId, `❌ Сначала отправь свой email от Спектра.`)
        return res.status(200).end()
      }

      await sendMessage(chatId, `⏳ Анализирую...`)

      const photo = msg.photo[msg.photo.length - 1]
      const imageUrl = await getFileUrl(photo.file_id)
      const data = await analyzeImage(imageUrl)

      if (!data) {
        await sendMessage(chatId, `❌ Не смог распознать. Попробуй другой скриншот.`)
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
      ].filter(Boolean).join('\n')

      await sendMessage(chatId, lines + '\n\n<b>Оцени сложность тренировки:</b>', {
        reply_markup: difficultyKeyboard(row.id)
      })
      return res.status(200).end()
    }

    // Всё остальное
    const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`
    await sendMessage(chatId, user
      ? `Отправь скриншот тренировки 📸`
      : `Отправь свой <b>email</b> от Спектра, чтобы привязать аккаунт.`)

  } catch (e) {
    console.error('webhook error:', e.message)
    try { await sendMessage(chatId, `❌ Ошибка: ${e.message.slice(0, 100)}`) } catch {}
  }

  res.status(200).end()
}
