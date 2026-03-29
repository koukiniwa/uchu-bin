// 宇宙ニュース自動記事生成スクリプト
// 使い方: ANTHROPIC_API_KEY=xxx node scripts/generate-news.js

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 地域別RSSフィード（日本20% / 米国50% / 中国20% / 欧州10% / その他）
const RSS_FEEDS_BY_REGION = {
  japan: [
    { url: 'https://www.jaxa.jp/rss/press.rss', label: '日本（JAXA）' },
  ],
  usa: [
    { url: 'https://www.nasaspaceflight.com/feed/', label: '米国（NASASpaceFlight）' },
    { url: 'https://feeds.arstechnica.com/arstechnica/space', label: '米国（Ars Technica）' },
    { url: 'https://spaceflightnow.com/feed/', label: '米国（SpaceFlightNow）' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', label: '米国（NASA公式）' },
  ],
  china: [
    { url: 'https://spacenews.com/section/china/feed/', label: '中国（SpaceNews China）' },
  ],
  europe: [
    { url: 'https://www.esa.int/rssfeed/ESA_top_News', label: '欧州（ESA）' },
  ],
  global: [
    { url: 'https://spacenews.com/feed/', label: 'グローバル（SpaceNews）' },
    { url: 'https://www.planetary.org/rss/articles', label: 'グローバル（Planetary Society）' },
  ],
}

// 地域ごとの取得件数（合計で約15件）
const REGION_COUNTS = { japan: 3, usa: 5, china: 3, europe: 2, global: 2 }

async function fetchUrl(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  return await res.text()
}

function parseRSS(xml, region) {
  const items = []
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = match[1]
    const get = (tag) =>
      raw.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))?.[1]?.trim()
    const title = get('title')
    const desc = get('description')?.replace(/<[^>]+>/g, '').slice(0, 400)
    const link = get('link')
    const pubDate = get('pubDate')
    const date = pubDate ? new Date(pubDate) : new Date(0)
    if (title) items.push({ title, description: desc || '', link, date, region })
  }
  // 新しい順にソートして上位5件
  return items.sort((a, b) => b.date - a.date).slice(0, 5)
}

// 直近14日の記事タイトルを取得（重複防止用）
function getRecentTitles(days = 14) {
  const postsDir = path.join(__dirname, '..', 'posts')
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const titles = []
  try {
    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(postsDir, file), 'utf-8')
      const dateMatch = content.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/)
      if (dateMatch && new Date(dateMatch[1]) >= cutoff) {
        const titleMatch = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
        if (titleMatch) titles.push(titleMatch[1])
      }
    }
  } catch {}
  return titles
}

// NASA画像のcollection.jsonから実在するURLと出典を取得
async function resolveNASAImage(nasaId, center) {
  try {
    const res = await fetch(
      `https://images-assets.nasa.gov/image/${nasaId}/collection.json`,
      { signal: AbortSignal.timeout(8000) }
    )
    const urls = await res.json()
    for (const suffix of ['~large.jpg', '~medium.jpg', '~small.jpg', '~thumb.jpg']) {
      const found = urls.find((u) => u.endsWith(suffix))
      if (found) {
        const credit = center ? `NASA/${center}` : 'NASA'
        return { url: found, credit }
      }
    }
    const jpg = urls.find((u) => u.endsWith('.jpg'))
    if (jpg) return { url: jpg, credit: center ? `NASA/${center}` : 'NASA' }
  } catch {}
  return null
}

// Wikimedia Commonsから宇宙関連画像を取得（無料・登録不要）
async function fetchWikimediaImages(query, count = 2) {
  const images = []
  try {
    const encoded = encodeURIComponent(query)
    const searchRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=6&format=json&srlimit=20&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    )
    const searchData = await searchRes.json()
    const results = searchData?.query?.search || []

    for (const result of results) {
      if (images.length >= count) break
      const title = result.title
      try {
        const infoRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`,
          { signal: AbortSignal.timeout(8000) }
        )
        const infoData = await infoRes.json()
        const page = Object.values(infoData?.query?.pages || {})[0]
        const info = page?.imageinfo?.[0]
        if (!info?.url) continue
        if (!/\.(jpg|jpeg|png)$/i.test(info.url)) continue
        const artist = (info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons'
        const license = info.extmetadata?.LicenseShortName?.value || 'CC'
        images.push({ url: info.url, credit: `${artist} / ${license} via Wikimedia Commons` })
      } catch {}
    }
    console.log(`  ✓ Wikimedia Commons「${query}」で ${images.length} 枚取得`)
  } catch (e) {
    console.error('  Wikimedia Commons検索失敗:', e.message)
  }
  return images
}

// 記事に関連したNASA画像を検索して取得（出典付き）
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

    // 人物写真・ポートレートを除外するキーワード
    const PORTRAIT_WORDS = ['portrait', 'headshot', 'official photo', 'biography', 'crew photo', 'group photo', 'smiling', 'poses', 'seated']

    for (const item of items) {
      if (images.length >= count) break
      const nasaId = item?.data?.[0]?.nasa_id
      const center = item?.data?.[0]?.center || ''
      const title = (item?.data?.[0]?.title || '').toLowerCase()
      const desc = (item?.data?.[0]?.description || '').toLowerCase().slice(0, 200)
      if (!nasaId) continue
      // 人物写真・ポートレートをスキップ
      if (PORTRAIT_WORDS.some(w => title.includes(w) || desc.includes(w))) continue
      const result = await resolveNASAImage(nasaId, center)
      if (result) images.push(result)
    }
    console.log(`  ✓ NASA画像ライブラリ「${query}」で ${images.length} 枚取得`)
  } catch (e) {
    console.error('  NASA画像検索失敗:', e.message)
  }

  // 不足分をWikimedia Commonsで補完
  if (images.length < count) {
    const wiki = await fetchWikimediaImages(query, count - images.length)
    images.push(...wiki)
  }

  // それでも不足分はAPODで補完
  if (images.length < count) {
    try {
      const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY'
      const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`, {
        signal: AbortSignal.timeout(8000),
      })
      const apod = await res.json()
      const url = apod.media_type === 'image' ? apod.url : apod.thumbnail_url
      if (url) {
        const credit = apod.copyright ? apod.copyright.replace(/\n/g, ' ').trim() : 'NASA'
        while (images.length < count) images.push({ url, credit })
        console.log(`  ✓ APOD画像で補完`)
      }
    } catch (e) {
      console.error('  APOD取得失敗:', e.message)
    }
  }

  return images
}

async function generateArticle(newsByRegion, recentTitles) {
  // 地域ラベル付きのニュースリスト作成
  const newsText = Object.entries(newsByRegion)
    .flatMap(([region, items]) =>
      items.map((item) => `[${region.toUpperCase()}] ${item.title}\n${item.description}`)
    )
    .join('\n\n')

  const recentText =
    recentTitles.length > 0
      ? `\n【直近14日間に生成済みの記事タイトル（これらと同じテーマは避けること）】\n${recentTitles.map((t) => `- ${t}`).join('\n')}\n`
      : ''

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `あなたは宇宙開発専門のニュースライターです。
「ミリレポ」のような軍事・専門系ニュースサイトのスタイルを参考に、
宇宙開発ニュースをわかりやすく、しかし報道として正確に伝える記事を書いてください。

以下のニュース一覧から**1つだけ**選び、そのニュースに絞って深く解説してください。
複数のニュースを混ぜないこと。
${recentText}
ニュース一覧（地域タグ付き）:
${newsText}

地域バランスの目安: 米国50% / 日本20% / 中国20% / 欧州10%
毎日異なる地域・テーマになるよう、直近記事と被らないものを選ぶこと。

文体・スタイルの基準（ミリレポ風）:
- 「です・ます」調のジャーナリスティックな文体。硬すぎず、崩しすぎない
- 冒頭の第一段落でニュースの核心を端的に伝える（何が起きたか・誰が・どこで）
- 具体的な数字・日付・固有名詞を積極的に使う（「大きな」ではなく「約120m」）
- 技術用語は初出時のみ自然に補足。以降はそのまま使う
- 見出しは事実ベースで具体的に（「〜の全容」「〜の現状」「〜が意味すること」など）
- 煽り・誇張・「驚き」演出は不要。事実が面白い
- 「まとめると」「〜と言えるでしょう」「〜かもしれません」などAI文体は使わない
- 本文中の1つ目の ## 見出しの直後に {{IMAGE_1}}、2つ目の ## 見出しの直後に {{IMAGE_2}} を入れる

以下のJSON形式のみで返してください:
{
  "title": "記事タイトル（日本語、35文字以内・事実ベース）",
  "description": "記事の要約（90文字以内）",
  "category": "ロケット・衛星・通信・有人宇宙飛行・月探査・火星探査 のいずれか1つ",
  "imageQuery": "NASA画像検索用の英語キーワード（必ずロケット・宇宙船・惑星・月面・基地などのハードウェアや天体を指定。人物・宇宙飛行士のポートレートは避ける。例: Artemis SLS rocket launch pad, SpaceX Starship vehicle, Mars surface landscape, lunar surface crater, ISS exterior, satellite deployment）",
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
  console.log('📡 地域別に宇宙ニュースを取得中...')

  const newsByRegion = {}
  for (const [region, feeds] of Object.entries(RSS_FEEDS_BY_REGION)) {
    newsByRegion[region] = []
    for (const { url, label } of feeds) {
      try {
        const xml = await fetchUrl(url)
        const items = parseRSS(xml, region)
        newsByRegion[region].push(...items)
        console.log(`  ✓ ${label} から ${items.length} 件`)
      } catch (e) {
        console.error(`  ✗ ${label}: ${e.message}`)
      }
    }
    // 地域ごとの上限件数に絞る（新しい順）
    newsByRegion[region] = newsByRegion[region]
      .sort((a, b) => b.date - a.date)
      .slice(0, REGION_COUNTS[region] || 2)
  }

  const totalNews = Object.values(newsByRegion).flat()
  if (totalNews.length === 0) {
    console.error('ニュースを1件も取得できませんでした')
    process.exit(1)
  }

  console.log('\n📋 直近の記事タイトルを確認中（重複防止）...')
  const recentTitles = getRecentTitles(14)
  console.log(`  直近14日: ${recentTitles.length} 件`)

  console.log(`\n🤖 Claude APIで記事を生成中...`)
  const article = await generateArticle(newsByRegion, recentTitles)
  console.log(`  タイトル: ${article.title}`)
  console.log(`  カテゴリ: ${article.category}`)
  console.log(`  画像検索ワード: ${article.imageQuery}`)

  console.log('\n🌌 関連NASA画像を取得中...')
  const images = await fetchNASAImages(article.imageQuery || article.title, 3)

  // 本文の {{IMAGE_1}} {{IMAGE_2}} を画像＋出典付きで置き換え
  let body = article.body
  if (images[1]) {
    body = body.replace(
      '{{IMAGE_1}}',
      `\n![${article.title}](${images[1].url})\n*出典: ${images[1].credit}*\n`
    )
  } else {
    body = body.replace('{{IMAGE_1}}', '')
  }
  if (images[2]) {
    body = body.replace(
      '{{IMAGE_2}}',
      `\n![${article.title}](${images[2].url})\n*出典: ${images[2].credit}*\n`
    )
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
  if (images[0]) {
    lines.push(`image: '${images[0].url}'`)
    lines.push(`imageCredit: '${images[0].credit}'`)
  }
  lines.push(`---`, ``, body)

  const postsDir = path.join(__dirname, '..', 'posts')
  const filePath = path.join(postsDir, `${slug}.md`)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')

  console.log(`\n✅ 記事を生成しました: posts/${slug}.md`)
  console.log(`  カバー画像: ${images[0] ? `✓ (${images[0].credit})` : '✗'}`)
  console.log(`  本文内画像1: ${images[1] ? `✓ (${images[1].credit})` : '✗'}`)
  console.log(`  本文内画像2: ${images[2] ? `✓ (${images[2].credit})` : '✗'}`)
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
