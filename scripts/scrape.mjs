/**
 * Парсер беговых мероприятий с marathonec.ru
 * Запуск: node scripts/scrape.mjs
 * Результат → src/data/events-live.json
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/events-live.json')

async function scrapeMarathonec() {
  console.log('📡 Загружаю marathonec.ru...')
  const res = await fetch('https://marathonec.ru/calendar-beg/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
  const html = await res.text()

  const events = []
  let id = 1

  // Структура строки:
  // <tr id="post-row-XXXXX" class="post-row ...">
  //   <td data-sort="...">DD/MM/YYYY</td>
  //   <td><a href="URL">Название</a></td>
  //   <td><span data-slug="...">Дистанция</span>, ...</td>
  //   <td><span data-slug="...">Город</span></td>
  // </tr>

  const rowPattern = /<tr[^>]+class="post-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g
  let rowMatch

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1]

    // Дата
    const dateMatch = row.match(/<td[^>]*>(\d{2})\/(\d{2})\/(\d{4})<\/td>/)
    if (!dateMatch) continue
    const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`

    // Название + URL
    const nameMatch = row.match(/<a\s+href="([^"]+)">([^<]+)<\/a>/)
    if (!nameMatch) continue
    const url  = nameMatch[1].trim()
    const name = nameMatch[2].trim()

    // Дистанции — все span внутри третьего td
    const distances = []
    const distCell = row.match(/<td>(<span[\s\S]*?)<\/td>/)
    if (distCell) {
      const spanPattern = /<span[^>]*>([^<]+)<\/span>/g
      let sp
      while ((sp = spanPattern.exec(distCell[1])) !== null) {
        distances.push(sp[1].trim())
      }
    }

    // Город — последний span в строке
    const cityMatch = row.match(/<td><span[^>]*>([^<]+)<\/span><\/td>/)
    const city = cityMatch ? cityMatch[1].trim() : 'Россия'

    events.push({ id: id++, name, date, city, distances, source: 'marathonec', url })
  }

  return events
}

async function main() {
  try {
    const events = await scrapeMarathonec()
    const today = new Date().toISOString().split('T')[0]
    const future = events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))

    const output = {
      updated: new Date().toISOString(),
      count: future.length,
      events: future
    }

    writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8')
    console.log(`✅ Сохранено ${future.length} мероприятий → src/data/events-live.json`)
    future.slice(0, 8).forEach(e =>
      console.log(`  ${e.date} | ${e.name} | ${e.city} | [${e.distances.join(', ')}]`)
    )
  } catch (err) {
    console.error('❌ Ошибка:', err.message)
    writeFileSync(OUT_PATH, JSON.stringify({ updated: new Date().toISOString(), count: 0, events: [] }, null, 2))
    process.exit(1)
  }
}

main()
