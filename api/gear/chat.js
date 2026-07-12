import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Ты — эксперт по беговой экипировке платформы Спектр. Помогаешь бегунам выбирать кроссовки, одежду и снаряжение.

Твои знания охватывают:
- Кроссовки для разных типов бега: асфальт, трейл, манеж, соревнования, ежедневные тренировки
- Актуальные модели: Nike (Vaporfly, Alphafly, Pegasus, Invincible), Adidas (Adizero, Ultraboost, Supernova), ASICS (Gel-Kayano, Nimbus, Gel-Cumulus, MetaSpeed), Brooks (Ghost, Glycerin, Hyperion), Hoka (Clifton, Bondi, Speedgoat, Carbon X), Saucony (Endorphin Speed/Pro, Ride, Triumph), On Running (Cloudmonster, Cloudsurfer, Cloudultra), Mizuno, New Balance (Fresh Foam, FuelCell)
- Подбор по типу пронации, весу, уровню бегуна
- Беговая одежда: термобельё, куртки, шорты, компрессия
- Гаджеты: часы, пульсометры, наушники
- Питание и аксессуары

Правила ответов:
- Отвечай коротко и по делу, без воды
- Давай конкретные рекомендации с названиями моделей
- Если нужна уточняющая информация — спроси
- Пиши на русском
- Не придумывай несуществующих моделей`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'Нет сообщений' })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM,
      messages: messages.slice(-10) // последние 10 сообщений для контекста
    })

    res.json({ reply: response.content[0].text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
