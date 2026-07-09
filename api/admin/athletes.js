import jwt from 'jsonwebtoken'
import { sql } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' })

  let payload
  try {
    payload = jwt.verify(auth.slice(7), JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Токен недействителен' })
  }

  if (payload.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' })

  const athletes = await sql`
    SELECT u.id, u.email, u.name, u.role, u.created_at,
           p.bio, p.city, p.birth_year, p.pr_5k, p.pr_10k, p.pr_half, p.pr_marathon
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `

  res.json({ athletes })
}
