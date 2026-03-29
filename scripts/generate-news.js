// 宇宙ニュース自動記事生成スクリプト
// 使い方: ANTHROPIC_API_KEY=xxx node scripts/generate-news.js

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 宇宙開発ニュースのRSSフィード
const RSS_FEEDS = [
  // 日本
  'https://www.jaxa.jp/rss/press.rss',          // JAXA プレスリリース
  // 海外
  'https://www.nasa.gov/rss/dyn/breaking_news.rss',
  'https://spaceflightnow.com/feed/',
  'https://spacenews.com/feed/',
  'https://www.space.com/feeds/all',
]

async function fetchUrl(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  return await res.text()
}

function parseRSS(xml) {
  const items = []
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = match[1]
    const get = (tag) =>
      raw.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))?.[1]?.trim()
    const title = get('title')
    const desc = get('description')?.replace(/<[^>]+>/g, '').slice(0, 400)
    const link = get('link')
    if (title) items.push({ title, description: desc || '', link })
  }
  return items.slice(0, 5)
}

async function fetchNASAImage() {
  try {
    // NASA天文写真(APOD) - DEMO_KEYは1日50リクエスト無料
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY'
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    })
    const apod = await res.json()
    if (apod.media_type === 'image' && apod.url) {
      return apod.url
    }
    // APODが動画の日は高解像度サムネを使う
    if (apod.thumbnail_url) return apod.thumbnail_url
  } catch (e) {
    console.error('NASA APOD取得失敗:', e.message)
  }

  try {
    // フォールバック: NASA画像ライブラリ（キー不要）
    const res = await fetch(
      'https://images-api.nasa.gov/search?q=space+launch&media_type=image&page_size=1',
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()
    const thumb = data?.collection?.items?.[0]?.links?.[0]?.href
    if (thumb) return thumb
  } catch (e) {
    console.error('NASA画像ライブラリ取得失敗:', e.message)
  }

  return null
}

async function generateArticle(newsItems) {
  const newsText = newsItems
    .map((item, i) => `${i + 1}. ${item.title}\n${item.description}`)
    .join('\n\n')

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1800,
    messages: [
      {
        role: 'user',
        content: `以下の英語の宇宙開発ニュースをもとに、日本語のブログ記事を作成してください。

ニュース一覧:
${newsText}

以下のJSON形式のみで返してください（説明文は不要）:
{
  "title": "記事タイトル（日本語、35文字以内）",
  "description": "記事の要約（90文字以内）",
  "category": "ロケット・衛星・通信・有人宇宙飛行・月探査・火星探査 のいずれか1つ",
  "body": "記事本文（マークダウン形式。## 見出しを2〜3つ使い、500〜700文字程度。事実に基づいて書く）"
}`,
      },
    ],
  })

  const text = message.content[0].text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSONが見つかりません: ' + text.slice(0, 200))
  return JSON.parse(jsonMatch[0])
}

async function main() {
  console.log('📡 宇宙ニュースを取得中...')

  const allNews = []
  for (const feed of RSS_FEEDS) {
    try {
      const xml = await fetchUrl(feed)
      const items = parseRSS(xml)
      allNews.push(...items)
      console.log(`  ✓ ${new URL(feed).hostname} から ${items.length} 件`)
    } catch (e) {
      console.error(`  ✗ ${feed}: ${e.message}`)
    }
  }

  if (allNews.length === 0) {
    console.error('ニュースを1件も取得できませんでした')
    process.exit(1)
  }

  console.log(`\n🤖 Claude APIで記事を生成中... (${allNews.length} 件のニュースをもとに)`)
  const article = await generateArticle(allNews.slice(0, 6))
  console.log(`  タイトル: ${article.title}`)
  console.log(`  カテゴリ: ${article.category}`)

  console.log('\n🌌 NASA画像を取得中...')
  const imageUrl = await fetchNASAImage()
  if (imageUrl) {
    console.log(`  ✓ 画像URL取得: ${imageUrl.slice(0, 60)}...`)
  } else {
    console.log('  画像は取得できませんでした（テキストのみで生成）')
  }

  const date = new Date().toISOString().slice(0, 10)
  const slug = `${date}-${Date.now()}`

  const lines = [
    `---`,
    `title: '${article.title.replace(/'/g, "''")}'`,
    `description: '${article.description.replace(/'/g, "''")}'`,
    `date: '${date}'`,
    `category: '${article.category}'`,
  ]
  if (imageUrl) lines.push(`image: '${imageUrl}'`)
  lines.push(`---`, ``, article.body)

  const postsDir = path.join(__dirname, '..', 'posts')
  const filePath = path.join(postsDir, `${slug}.md`)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')

  console.log(`\n✅ 記事を生成しました: posts/${slug}.md`)
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
