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
      user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      avatar_url   TEXT,
      bio          TEXT,
      city         TEXT,
      birth_year   INTEGER,
      weight       NUMERIC,
      height       INTEGER,
      max_hr       INTEGER,
      resting_hr   INTEGER,
      vo2max       NUMERIC,
      pr_5k        TEXT,
      pr_10k       TEXT,
      pr_half      TEXT,
      pr_marathon  TEXT,
      pr_backyard  INTEGER,
      goal_text    TEXT,
      injuries     TEXT,
      restrictions TEXT,
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // миграция: добавляем новые колонки если таблица уже существует
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight NUMERIC`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height INTEGER`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_hr INTEGER`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resting_hr INTEGER`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vo2max NUMERIC`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pr_backyard INTEGER`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_text TEXT`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS injuries TEXT`
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restrictions TEXT`
  await sql`
    CREATE TABLE IF NOT EXISTS races (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      date        DATE NOT NULL,
      distance    TEXT,
      url         TEXT,
      goal_time   TEXT,
      result_time TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
}
