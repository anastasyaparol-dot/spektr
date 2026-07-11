import jwt from 'jsonwebtoken'
import { sql, initDB } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' })

  let payload
  try {
    payload = jwt.verify(auth.slice(7), JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Токен недействителен' })
  }

  await initDB()

  const {
    name, avatar_url, bio, city, birth_year,
    weight, height, max_hr, resting_hr, vo2max,
    pr_5k, pr_10k, pr_half, pr_marathon, pr_backyard,
    goal_text, injuries, restrictions
  } = req.body

  if (name) {
    await sql`UPDATE users SET name = ${name} WHERE id = ${payload.id}`
  }

  await sql`
    UPDATE profiles SET
      avatar_url   = ${avatar_url ?? null},
      bio          = ${bio ?? null},
      city         = ${city ?? null},
      birth_year   = ${birth_year ?? null},
      weight       = ${weight ?? null},
      height       = ${height ?? null},
      max_hr       = ${max_hr ?? null},
      resting_hr   = ${resting_hr ?? null},
      vo2max       = ${vo2max ?? null},
      pr_5k        = ${pr_5k ?? null},
      pr_10k       = ${pr_10k ?? null},
      pr_half      = ${pr_half ?? null},
      pr_marathon  = ${pr_marathon ?? null},
      pr_backyard  = ${pr_backyard ?? null},
      goal_text    = ${goal_text ?? null},
      injuries     = ${injuries ?? null},
      restrictions = ${restrictions ?? null},
      updated_at   = NOW()
    WHERE user_id = ${payload.id}
  `

  res.json({ ok: true })
}
