/**
 * Парсер беговых мероприятий
 * Источники:
 *   - marathonec.ru   — fetch (статика)
 *   - o-time.ru       — Playwright (динамика)
 *   - russiarunning.com — Playwright (динамика)
 *
 * Запуск: node scripts/scrape.mjs
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '../src/data/events-live.json')

// ── 1. MARATHONEC.RU (fetch) ──────────────────────────────
async function scrapeMarathonec() {
  console.log('📡 marathonec.ru...')
  const res = await fetch('https://marathonec.ru/calendar-beg/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
  const html = await res.text()
  const events = []
  let id = 1

  const rowPattern = /<tr[^>]+class="post-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g
  let rowMatch
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1]
    const dateMatch = row.match(/<td[^>]*>(\d{2})\/(\d{2})\/(\d{4})<\/td>/)
    if (!dateMatch) continue
    const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    const nameMatch = row.match(/<a\s+href="([^"]+)">([^<]+)<\/a>/)
    if (!nameMatch) continue
    const url  = nameMatch[1].trim()
    const name = nameMatch[2].trim()
    const distances = []
    const distCell = row.match(/<td>(<span[\s\S]*?)<\/td>/)
    if (distCell) {
      const spanPattern = /<span[^>]*>([^<]+)<\/span>/g
      let sp
      while ((sp = spanPattern.exec(distCell[1])) !== null) distances.push(sp[1].trim())
    }
    const cityMatch = row.match(/<td><span[^>]*>([^<]+)<\/span><\/td>/)
    const city = cityMatch ? cityMatch[1].trim() : 'Россия'
    events.push({ id: id++, name, date, city, distances, source: 'marathonec', url })
  }
  console.log(`  ✓ ${events.length} событий`)
  return events
}

// ── 2. O-TIME.RU (Playwright) ────────────────────────────
// Структура: ссылки вида /race/XXXXX, перед группой дат — заголовок "DD Mon WE"
async function scrapeOtime(browser) {
  console.log('📡 reg.o-time.ru...')
  const page = await browser.newPage()
  const events = []
  try {
    await page.goto('https://reg.o-time.ru/calendar', { waitUntil: 'load', timeout: 30000 })
    await page.waitForSelector('a[href*="/race/"]', { timeout: 10000 }).catch(() => {})

    // Берём все ссылки на забеги и весь текст страницы для извлечения дат
    const data = await page.evaluate(() => {
      const result = []
      // Ходим по DOM: ищем элементы с датой (содержат число + месяц), затем следующие ссылки
      const allEls = Array.from(document.querySelectorAll('*'))
      let currentDate = null

      for (const el of allEls) {
        // Элемент с датой типа "10 Jun WE" или "27.06.2026"
        const txt = (el.innerText || '').trim()
        const dateMatch = txt.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)
        const dateMatch2 = txt.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
        if (dateMatch && el.children.length === 0) {
          const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12}
          const m = months[dateMatch[2].toLowerCase()]
          const d = dateMatch[1].padStart(2,'0')
          const y = new Date().getFullYear()
          currentDate = `${y}-${String(m).padStart(2,'0')}-${d}`
        } else if (dateMatch2) {
          currentDate = `${dateMatch2[3]}-${dateMatch2[2]}-${dateMatch2[1]}`
        }

        // Ссылка на забег
        if (el.tagName === 'A' && el.href && el.href.includes('/race/') && currentDate) {
          const name = (el.innerText || '').trim().replace(/\s+/g, ' ')
          if (name.length < 3) continue
          // Город — следующий текстовый элемент
          const cityEl = el.nextElementSibling || el.parentElement?.nextElementSibling
          const cityText = (cityEl?.innerText || '').trim().split('\n')[0]
          result.push({ name, href: el.href, date: currentDate, cityText })
        }
      }
      return result
    })

    for (const item of data) {
      if (!item.name || item.name.length < 3) continue
      // Извлечь город из cityText (убрать область)
      const cityParts = item.cityText.split(' ')
      const city = cityParts.length > 1 ? cityParts.slice(1).join(' ').split(',')[0].trim() : item.cityText.split(',')[0].trim()

      events.push({
        id: 0,
        name: item.name,
        date: item.date,
        city: city || 'Россия',
        distances: [],
        source: 'o-time',
        url: item.href
      })
    }
  } catch(e) {
    console.log('  ⚠️  o-time ошибка:', e.message.slice(0, 80))
  } finally {
    await page.close()
  }
  console.log(`  ✓ ${events.length} событий`)
  return events
}

// ── 3. RUSSIARUNNING.COM (Playwright) ────────────────────
async function scrapeRussiaRunning(browser) {
  console.log('📡 reg.russiarunning.com...')
  const page = await browser.newPage()
  const events = []
  try {
    // domcontentloaded быстрее, потом ждём JS
    await page.goto('https://reg.russiarunning.com/events/future', {
      waitUntil: 'domcontentloaded',
      timeout: 40000
    })
    // Ждём пока появятся карточки событий
    await page.waitForFunction(
      () => document.querySelectorAll('a[href*="/event"]').length > 5,
      { timeout: 20000 }
    ).catch(() => {})
    await page.waitForTimeout(2000)

    const data = await page.evaluate(() => {
      const results = []
      // RussiaRunning использует ссылки вида /events/XXXXX или /event/XXXXX
      const links = Array.from(document.querySelectorAll('a[href*="/event"]'))
      for (const a of links.slice(0, 200)) {
        const card = a.closest('[class]') || a.parentElement
        const text = (card?.innerText || a.innerText || '').trim()
        if (!text || text.length < 5) continue
        results.push({ href: a.href, text })
      }
      return results
    }).catch(() => [])

    const seen = new Set()
    for (const item of data) {
      // Дата в формате DD.MM.YYYY или DD.MM.YY
      const dateMatch = item.text.match(/(\d{1,2})\.(\d{2})\.(\d{2,4})/)
      if (!dateMatch) continue
      const y = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]
      const date = `${y}-${dateMatch[2]}-${dateMatch[1].padStart(2,'0')}`

      const lines = item.text.split('\n').map(l => l.trim()).filter(l => l.length > 3)
      const name = lines.find(l => !/^\d/.test(l) && !/^[\d.,\s]+$/.test(l) && l.length > 4)
      if (!name || seen.has(name)) continue
      seen.add(name)

      const distances = []
      for (const dm of item.text.matchAll(/(\d+(?:[,.]\d+)?)\s*км/gi)) {
        distances.push(dm[0].trim())
      }

      const cityMatch = item.text.match(/[А-ЯЁ][а-яё]{2,}(?:-[А-ЯЁ][а-яё]+)?/)
      const city = cityMatch ? cityMatch[0] : 'Россия'

      events.push({
        id: 0,
        name,
        date,
        city,
        distances,
        source: 'russiarunning',
        url: item.href || 'https://reg.russiarunning.com/events/future'
      })
    }
  } catch(e) {
    console.log('  ⚠️  russiarunning ошибка:', e.message.slice(0, 80))
  } finally {
    await page.close()
  }
  console.log(`  ✓ ${events.length} событий`)
  return events
}

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: true })
  let allEvents = []

  try {
    // Запускаем все три парсера параллельно
    const [marathonec, otime, russiaRunning] = await Promise.all([
      scrapeMarathonec(),
      scrapeOtime(browser),
      scrapeRussiaRunning(browser),
    ])

    allEvents = [...marathonec, ...otime, ...russiaRunning]
  } finally {
    await browser.close()
  }

  // Нумеруем, фильтруем прошедшие, дедупликация по названию+дате
  const today = new Date().toISOString().split('T')[0]
  const seen = new Set()
  const future = allEvents
    .filter(e => e.date >= today)
    .filter(e => {
      const key = `${e.date}|${e.name.toLowerCase().slice(0, 30)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({ ...e, id: i + 1 }))

  const output = {
    updated: new Date().toISOString(),
    count: future.length,
    sources: {
      marathonec: future.filter(e => e.source === 'marathonec').length,
      otime:      future.filter(e => e.source === 'o-time').length,
      russiarunning: future.filter(e => e.source === 'russiarunning').length,
    },
    events: future
  }

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n✅ Итого: ${future.length} мероприятий`)
  console.log(`   marathonec: ${output.sources.marathonec}`)
  console.log(`   o-time:     ${output.sources.otime}`)
  console.log(`   russiarunning: ${output.sources.russiarunning}`)
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
