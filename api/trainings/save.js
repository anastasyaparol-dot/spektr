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

  const { id, date, distance_km, duration, pace, avg_hr, max_hr, elevation, calories, notes, difficulty } = req.body
  if (!date) return res.status(400).json({ error: 'Дата обязательна' })

  if (id) {
    const [existing] = await sql`SELECT id FROM trainings WHERE id = ${id} AND user_id = ${payload.id}`
    if (!existing) return res.status(403).json({ error: 'Нет доступа' })
    await sql`
      UPDATE trainings SET
        date = ${date}, distance_km = ${distance_km ?? null}, duration = ${duration ?? null},
        pace = ${pace ?? null}, avg_hr = ${avg_hr ?? null}, max_hr = ${max_hr ?? null},
        elevation = ${elevation ?? null}, calories = ${calories ?? null},
        notes = ${notes ?? null}, difficulty = ${difficulty ?? null}
      WHERE id = ${id}
    `
    return res.json({ ok: true, id })
  }

  const [row] = await sql`
    INSERT INTO trainings (user_id, date, distance_km, duration, pace, avg_hr, max_hr, elevation, calories, notes, difficulty, source)
    VALUES (${payload.id}, ${date}, ${distance_km ?? null}, ${duration ?? null},
            ${pace ?? null}, ${avg_hr ?? null}, ${max_hr ?? null},
            ${elevation ?? null}, ${calories ?? null}, ${notes ?? null},
            ${difficulty ?? null}, 'manual')
    RETURNING id
  `
  res.json({ ok: true, id: row.id })
}
