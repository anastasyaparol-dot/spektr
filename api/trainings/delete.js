import jwt from 'jsonwebtoken'
import { sql } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' })

  let payload
  try { payload = jwt.verify(auth.slice(7), JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Токен недействителен' }) }

  const { id } = req.body
  await sql`DELETE FROM trainings WHERE id = ${id} AND user_id = ${payload.id}`
  res.json({ ok: true })
}
