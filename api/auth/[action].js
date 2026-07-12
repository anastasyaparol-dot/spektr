import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql, initDB } from '../_db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spektr-secret-key'

export default async function handler(req, res) {
  const { action } = req.query
  await initDB()

  // POST /api/auth/register
  if (action === 'register') {
    if (req.method !== 'POST') return res.status(405).end()
    const { email, password, name } = req.body
    if (!email || !password || !name) return res.status(400).json({ error: 'Заполни все поля' })
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) return res.status(400).json({ error: 'Этот email уже зарегистрирован' })
    const hash = await bcrypt.hash(password, 10)
    const [user] = await sql`
      INSERT INTO users (email, password, name) VALUES (${email}, ${hash}, ${name})
      RETURNING id, email, name, role
    `
    await sql`INSERT INTO profiles (user_id) VALUES (${user.id})`
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  }

  // POST /api/auth/login
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).end()
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Заполни все поля' })
    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' })
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  }

  // GET /api/auth/me
  if (action === 'me') {
    if (req.method !== 'GET') return res.status(405).end()
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' })
    let payload
    try { payload = jwt.verify(auth.slice(7), JWT_SECRET) }
    catch { return res.status(401).json({ error: 'Токен недействителен' }) }
    const [user] = await sql`
      SELECT u.id, u.email, u.name, u.role, u.created_at,
             p.avatar_url, p.bio, p.city, p.birth_year,
             p.weight, p.height, p.max_hr, p.resting_hr, p.vo2max,
             p.pr_5k, p.pr_10k, p.pr_half, p.pr_marathon, p.pr_backyard,
             p.goal_text, p.injuries, p.restrictions
      FROM users u LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ${payload.id}
    `
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
    return res.json({ user })
  }

  res.status(404).end()
}
