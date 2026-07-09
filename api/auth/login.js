import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql, initDB } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  await initDB()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Заполни все поля' })

  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`
  if (!user) return res.status(401).json({ error: 'Неверный email или пароль' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' })

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}
