import Anthropic from '@anthropic-ai/sdk'
import { sql, initDB } from '../_db.js'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function sendMessage(chat_id, text, extra = {}) {
  await fetch(`${API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', ...extra })
  })
}

async function getFileUrl(file_id) {
  const res = await fetch(`${API_URL}/getFile?file_id=${file_id}`)
  const data = await res.json()
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${data.result.file_path}`
}

async function analyzeTrainingImage(imageUrl) {
  const imageRes = await fetch(imageUrl)
  const buffer = await imageRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: contentType, data: base64 }
        },
        {
          type: 'text',
          text: `Это скриншот тренировки из спортивного приложения (Garmin, Strava, Apple Watch и т.д.).
Извлеки данные и верни ТОЛЬКО JSON без пояснений:
{
  "date": "YYYY-MM-DD или null",
  "distance_km": число или null,
  "duration": "ЧЧ:ММ:СС или null",
  "pace": "М:СС/км или null",
  "avg_hr": число или null,
  "max_hr": число или null,
  "elevation": число в метрах или null,
  "calories": число или null,
  "notes": "тип активности (бег/велосипед/и т.д.) или null"
}`
        }
      ]
    }]
  })

  try {
    const text = response.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end()

  await initDB()

  const update = req.body
  const msg = update.message
  if (!msg) return res.status(200).end()

  const chatId = msg.chat.id
  const telegramId = msg.from.id
  const text = msg.text || ''

  // /start — приветствие
  if (text.startsWith('/start')) {
    const [user] = await sql`SELECT id, name FROM users WHERE telegram_id = ${telegramId}`
    if (user) {
      await sendMessage(chatId, `👋 Привет, <b>${user.name}</b>! Отправь скриншот тренировки — я внесу данные в твой кабинет.`)
    } else {
      await sendMessage(chatId, `👋 Привет! Я бот Спектра — вношу тренировки в твой кабинет автоматически.\n\nОтправь свой <b>email</b>, которым ты зарегистрирован(а) на spektr-ebon.vercel.app`)
    }
    return res.status(200).end()
  }

  // Привязка по email
  if (text.includes('@') && !msg.photo) {
    const email = text.trim().toLowerCase()
    const [user] = await sql`SELECT id, name FROM users WHERE email = ${email}`
    if (!user) {
      await sendMessage(chatId, `❌ Пользователь с email <b>${email}</b> не найден.\n\nСначала зарегистрируйся на сайте spektr-ebon.vercel.app`)
    } else {
      await sql`UPDATE users SET telegram_id = ${telegramId} WHERE id = ${user.id}`
      await sendMessage(chatId, `✅ Аккаунт привязан! Привет, <b>${user.name}</b>!\n\nТеперь отправляй скриншоты тренировок — я буду автоматически вносить их в твой кабинет.`)
    }
    return res.status(200).end()
  }

  // Скриншот тренировки
  if (msg.photo) {
    const [user] = await sql`SELECT id, name FROM users WHERE telegram_id = ${telegramId}`
    if (!user) {
      await sendMessage(chatId, `❌ Сначала привяжи аккаунт — отправь свой email от Спектра.`)
      return res.status(200).end()
    }

    await sendMessage(chatId, `⏳ Анализирую тренировку...`)

    const photo = msg.photo[msg.photo.length - 1]
    const imageUrl = await getFileUrl(photo.file_id)
    const data = await analyzeTrainingImage(imageUrl)

    if (!data) {
      await sendMessage(chatId, `❌ Не удалось распознать тренировку. Попробуй другой скриншот.`)
      return res.status(200).end()
    }

    const date = data.date || new Date().toISOString().split('T')[0]

    await sql`
      INSERT INTO trainings (user_id, date, distance_km, duration, pace, avg_hr, max_hr, elevation, calories, notes)
      VALUES (
        ${user.id}, ${date},
        ${data.distance_km ?? null}, ${data.duration ?? null},
        ${data.pace ?? null}, ${data.avg_hr ?? null}, ${data.max_hr ?? null},
        ${data.elevation ?? null}, ${data.calories ?? null}, ${data.notes ?? null}
      )
    `

    const lines = [
      `✅ <b>Тренировка добавлена!</b>`,
      ``,
      data.date ? `📅 ${data.date}` : '',
      data.distance_km ? `🏃 ${data.distance_km} км` : '',
      data.duration ? `⏱ ${data.duration}` : '',
      data.pace ? `📈 Темп: ${data.pace}/км` : '',
      data.avg_hr ? `❤️ Пульс: ${data.avg_hr} уд/мин` : '',
      data.elevation ? `⛰ Набор: ${data.elevation} м` : '',
      data.calories ? `🔥 ${data.calories} ккал` : '',
    ].filter(Boolean).join('\n')

    await sendMessage(chatId, lines)
    return res.status(200).end()
  }

  // Остальные сообщения
  const [user] = await sql`SELECT id FROM users WHERE telegram_id = ${telegramId}`
  if (!user) {
    await sendMessage(chatId, `Отправь свой <b>email</b> от Спектра, чтобы привязать аккаунт.`)
  } else {
    await sendMessage(chatId, `Отправь скриншот тренировки — внесу в кабинет 📊`)
  }

  res.status(200).end()
}
