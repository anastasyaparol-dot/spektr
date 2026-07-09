import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL)

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      email     TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      name      TEXT NOT NULL,
      role      TEXT NOT NULL DEFAULT 'athlete',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      bio       TEXT,
      city      TEXT,
      birth_year INTEGER,
      pr_5k     TEXT,
      pr_10k    TEXT,
      pr_half   TEXT,
      pr_marathon TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}
