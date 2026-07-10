import jwt from 'jsonwebtoken'
import { sql, initDB } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' })

  let payload
  try { payload = jwt.verify(auth.slice(7), JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Токен недействителен' }) }

  await initDB()

  const { id, name, date, distance, url, goal_time, result_time, notes } = req.body
  if (!name || !date) return res.status(400).json({ error: 'Название и дата обязательны' })

  if (id) {
    // обновить существующий
    const [existing] = await sql`SELECT id FROM races WHERE id = ${id} AND user_id = ${payload.id}`
    if (!existing) return res.status(403).json({ error: 'Нет доступа' })

    await sql`
      UPDATE races SET
        name = ${name}, date = ${date}, distance = ${distance ?? null},
        url = ${url ?? null}, goal_time = ${goal_time ?? null},
        result_time = ${result_time ?? null}, notes = ${notes ?? null}
      WHERE id = ${id}
    `
    res.json({ ok: true, id })
  } else {
    const [race] = await sql`
      INSERT INTO races (user_id, name, date, distance, url, goal_time, result_time, notes)
      VALUES (${payload.id}, ${name}, ${date}, ${distance ?? null}, ${url ?? null},
              ${goal_time ?? null}, ${result_time ?? null}, ${notes ?? null})
      RETURNING id
    `
    res.json({ ok: true, id: race.id })
  }
}
