// 宇宙ニュース自動記事生成スクリプト
// 使い方: ANTHROPIC_API_KEY=xxx node scripts/generate-news.js

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 宇宙開発ニュースのRSSフィード
// SpaceX・Blue Origin・Rocket Lab・NASA・JAXA等を幅広くカバー
const RSS_FEEDS = [
  // 日本
  'https://www.jaxa.jp/rss/press.rss',
  // 総合（SpaceX/Blue Origin/Rocket Lab等を広くカバー）
  'https://www.nasaspaceflight.com/feed/',        // NASASpaceFlight.com（民間企業に強い）
  'https://feeds.arstechnica.com/arstechnica/space', // Ars Technica宇宙面（技術解説が豊富）
  'https://spaceflightnow.com/feed/',
  'https://spacenews.com/feed/',
  // NASA公式
  'https://www.nasa.gov/rss/dyn/breaking_news.rss',
  // 宇宙探査・科学
  'https://www.planetary.org/rss/articles',       // 惑星協会（探査機・科学）
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

// NASA画像のcollection.jsonから実在するURLを取得
async function resolveNASAImageUrl(nasaId) {
  try {
    const res = await fetch(
      `https://images-assets.nasa.gov/image/${nasaId}/collection.json`,
      { signal: AbortSignal.timeout(8000) }
    )
    const urls = await res.json()
    // large → medium → small → thumb の優先順で探す
    for (const suffix of ['~large.jpg', '~medium.jpg', '~small.jpg', '~thumb.jpg']) {
      const found = urls.find((u) => u.endsWith(suffix))
      if (found) return found
    }
    return urls.find((u) => u.endsWith('.jpg')) || null
  } catch {
    return null
  }
}

// 記事内容に関連したNASA画像を検索して取得
async function fetchNASAImages(query, count = 3) {
  const images = []

  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://images-api.nasa.gov/search?q=${encoded}&media_type=image&page_size=20`,
      { signal: AbortSignal.timeout(10000) }
    )
    const data = await res.json()
    const items = data?.collection?.items || []

    for (const item of items) {
      if (images.length >= count) break
      const nasaId = item?.data?.[0]?.nasa_id
      if (!nasaId) continue
      const url = await resolveNASAImageUrl(nasaId)
      if (url) images.push(url)
    }
    console.log(`  ✓ NASA画像ライブラリ「${query}」で ${images.length} 枚取得`)
  } catch (e) {
    console.error('  NASA画像検索失敗:', e.message)
  }

  // 取得できなかった分はAPODで補完
  if (images.length < count) {
    try {
      const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY'
      const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`, {
        signal: AbortSignal.timeout(8000),
      })
      const apod = await res.json()
      const url = apod.media_type === 'image' ? apod.url : apod.thumbnail_url
      if (url) {
        while (images.length < count) images.push(url)
        console.log(`  ✓ APOD画像で補完`)
      }
    } catch (e) {
      console.error('  APOD取得失敗:', e.message)
    }
  }

  return images
}

async function generateArticle(newsItems) {
  const newsText = newsItems
    .map((item, i) => `${i + 1}. ${item.title}\n${item.description}`)
    .join('\n\n')

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `宇宙開発が好きで、自分のブログに記事を書いている人物として振る舞ってください。
専門家ではないが宇宙ニュースをよく追っていて、面白いと思ったことを自分の言葉で友人に話すように書くスタイルです。

以下のニュース一覧から**1つだけ**選び、そのニュースについて日本語ブログ記事を書いてください。
複数のニュースを混ぜないこと。1トピックを深く掘り下げます。

ニュース一覧:
${newsText}

書き方のルール:
- 「です・ます」調だが硬くない。友人に話すような自然な口語に近い文体
- AI感・レポート感が出る表現を避ける。「〜と言えるでしょう」「〜と感じるかもしれません」「まとめると」などは使わない
- 見出しは体言止めや疑問形にしない。「なぜ火星に原子炉が必要なのか？」ではなく「火星で太陽光パネルが使えない理由」のように具体的に
- 専門用語は自然な流れで一言補足（カッコ書き多用はNG）
- 例え話は1〜2個まで。多用しない
- 「なぜこれが重要か」は書くが、大げさに煽らない
- 本文中の1つ目の ## 見出しの直後に {{IMAGE_1}}、2つ目の ## 見出しの直後に {{IMAGE_2}} を入れる

以下のJSON形式のみで返してください:
{
  "title": "記事タイトル（日本語、35文字以内）",
  "description": "記事の要約（90文字以内）",
  "category": "ロケット・衛星・通信・有人宇宙飛行・月探査・火星探査 のいずれか1つ",
  "imageQuery": "NASA画像検索用の英語キーワード（例: SpaceX Falcon 9 launch, Mars rover, Moon surface）",
  "body": "記事本文（マークダウン形式。## 見出しを3〜4つ、{{IMAGE_1}}と{{IMAGE_2}}を含め、1200〜1800文字）"
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
  console.log(`  画像検索ワード: ${article.imageQuery}`)

  console.log('\n🌌 関連NASA画像を取得中...')
  const images = await fetchNASAImages(article.imageQuery || article.title, 3)

  // 本文の {{IMAGE_1}} {{IMAGE_2}} を実際の画像に置き換え
  let body = article.body
  if (images[1]) {
    body = body.replace('{{IMAGE_1}}', `\n![${article.title}](${images[1]})\n`)
  } else {
    body = body.replace('{{IMAGE_1}}', '')
  }
  if (images[2]) {
    body = body.replace('{{IMAGE_2}}', `\n![${article.title}](${images[2]})\n`)
  } else {
    body = body.replace('{{IMAGE_2}}', '')
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
  // カバー画像（1枚目）
  if (images[0]) lines.push(`image: '${images[0]}'`)
  lines.push(`---`, ``, body)

  const postsDir = path.join(__dirname, '..', 'posts')
  const filePath = path.join(postsDir, `${slug}.md`)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')

  console.log(`\n✅ 記事を生成しました: posts/${slug}.md`)
  console.log(`  カバー画像: ${images[0] ? '✓' : '✗'}`)
  console.log(`  本文内画像1: ${images[1] ? '✓' : '✗'}`)
  console.log(`  本文内画像2: ${images[2] ? '✓' : '✗'}`)
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
