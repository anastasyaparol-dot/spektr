import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql, initDB } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  await initDB()

  const { email, password, name } = req.body
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполни все поля' })
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Этот email уже зарегистрирован' })
  }

  const hash = await bcrypt.hash(password, 10)
  const [user] = await sql`
    INSERT INTO users (email, password, name) VALUES (${email}, ${hash}, ${name})
    RETURNING id, email, name, role
  `
  await sql`INSERT INTO profiles (user_id) VALUES (${user.id})`

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}
