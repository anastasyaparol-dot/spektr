import jwt from 'jsonwebtoken'
import { sql, initDB } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' })

  let payload
  try { payload = jwt.verify(auth.slice(7), JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Токен недействителен' }) }

  await initDB()

  const races = await sql`
    SELECT * FROM races WHERE user_id = ${payload.id} ORDER BY date ASC
  `
  res.json({ races })
}
