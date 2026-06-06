// 宇宙ニュース自動記事生成スクリプト
// 使い方: ANTHROPIC_API_KEY=xxx node scripts/generate-news.js
// 実行曜日: 月・火・木・土のみ（--forceオプションで強制実行）

const Anthropic = require('@anthropic-ai/sdk')
const { execSync } = require('child_process')

// 曜日チェック（月=1, 火=2, 木=4, 土=6）
if (!process.argv.includes('--force') && !process.argv.includes('--suggest')) {
  const jstDay = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay()
  const allowedDays = [1, 2, 4, 6] // 月・火・木・土
  if (!allowedDays.includes(jstDay)) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    console.log(`⏭️  今日は${dayNames[jstDay]}曜日のため生成をスキップします（月・火・木・土のみ）`)
    console.log('   強制実行する場合は --force オプションをつけてください')
    process.exit(0)
  }
}
const fs = require('fs')
const path = require('path')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })


// 地域別RSSフィード（日本20% / 米国50% / 中国20% / 欧州10% / その他）
const RSS_FEEDS_BY_REGION = {
  japan: [
    { url: 'https://www.jaxa.jp/rss/press.rss', label: '日本（JAXA）' },
    { url: 'https://sorae.info/feed', label: '日本（sorae.info）' },
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
const REGION_COUNTS = { japan: 5, usa: 5, china: 3, europe: 2, global: 2 }

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

// 画像が記事に関連しているかHaikuで判定
async function validateImageRelevance(imageUrl, title, category) {
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: `この画像は「${title}」（カテゴリ:${category}）という宇宙ニュース記事のカバー画像として適切ですか？記事のトピックに直接関連する内容の画像であれば「yes」、記事と無関係・テーマが異なる場合は「no」と答えてください。「yes」か「no」だけで答えてください。` }
        ]
      }]
    })
    return response.content[0].text.toLowerCase().trim().startsWith('yes')
  } catch (e) {
    console.error('  画像バリデーション失敗:', e.message)
    return true
  }
}

// 画像をpublic/imagesにダウンロード保存
async function downloadImage(imageUrl, filename) {
  const publicImagesDir = path.join(__dirname, '..', 'public', 'images')
  if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true })
  const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1]?.toLowerCase() || 'jpg'
  const localFilename = `${filename}.${ext}`
  const localPath = path.join(publicImagesDir, localFilename)
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(localPath, buffer)
    console.log(`  ✓ 画像をローカル保存: public/images/${localFilename}`)
    return `/images/${localFilename}`
  } catch (e) {
    console.error('  画像ダウンロード失敗:', e.message)
    return null
  }
}

// ソース記事のOG画像を取得（リトライ付き）
async function fetchOGImage(url) {
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
  ]
  for (let attempt = 0; attempt < USER_AGENTS.length; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENTS[attempt],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const html = await res.text()
      const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)
        || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/)
      const imageUrl = match?.[1]
      if (!imageUrl || imageUrl.startsWith('data:')) continue
      if (imageUrl.startsWith('http')) return imageUrl
      if (imageUrl.startsWith('/')) {
        const base = new URL(url)
        return `${base.protocol}//${base.host}${imageUrl}`
      }
    } catch (e) {
      console.error(`  OG画像取得失敗（試行${attempt + 1}）:`, e.message)
    }
  }
  return null
}

// タイトルから意味のあるキーワードを抽出
function extractKeywords(title) {
  // 英数字トークン（企業名・機体名など）
  const en = title.match(/[A-Za-z][A-Za-z0-9\-\.]+/g) || []
  // 日本語の主要名詞（2文字以上の連続した漢字・カタカナ）
  const ja = title.match(/[\u4e00-\u9fa5\u30A0-\u30FF]{2,}/g) || []
  return [...new Set([...en.map(w => w.toLowerCase()), ...ja])]
}

// 既存記事と新記事が重複しているか判定（キーワード2つ以上一致で重複）
function isDuplicateArticle(newTitle, recentArticles) {
  const newKws = extractKeywords(newTitle)
  for (const a of recentArticles) {
    const existKws = extractKeywords(a.title)
    const matches = newKws.filter(kw => existKws.includes(kw))
    if (matches.length >= 2) {
      console.log(`  ⚠️  重複検出: 「${a.title}」と ${matches.length}語一致（${matches.join(', ')}）`)
      return true
    }
  }
  return false
}

// 直近N日の記事タイトルとカテゴリを取得（重複防止用）
function getRecentArticles(days = 14) {
  const postsDir = path.join(__dirname, '..', 'posts')
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const articles = []
  try {
    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(postsDir, file), 'utf-8')
      const dateMatch = content.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/)
      if (dateMatch && new Date(dateMatch[1]) >= cutoff) {
        const titleMatch = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
        const catMatch = content.match(/^category:\s*['"]?(.+?)['"]?\s*$/m)
        if (titleMatch) articles.push({
          title: titleMatch[1],
          category: catMatch ? catMatch[1] : ''
        })
      }
    }
  } catch {}
  return articles
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

    const PORTRAIT_WORDS = ['portrait', 'headshot', 'official photo', 'biography', 'crew photo', 'group photo', 'smiling', 'poses', 'seated', 'people', 'person', 'team photo']
    for (const result of results) {
      if (images.length >= count) break
      const title = result.title
      const titleLow = title.toLowerCase()
      if (PORTRAIT_WORDS.some(w => titleLow.includes(w))) continue
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

  return images
}

// カテゴリ→英語キーワード
const CATEGORY_KEYWORDS = {
  'ロケット': 'rocket launch',
  '衛星・通信': 'satellite orbit',
  '有人宇宙飛行': 'astronaut crew spacecraft',
  '月探査': 'moon lunar surface',
  '火星探査': 'mars rover spacecraft',
}

// 日本語トピックキーワード→英語検索語（記事内容に合った画像を取得するため）
const TOPIC_KEYWORDS = {
  '全固体電池': 'solid state battery',
  '電池': 'battery power satellite',
  '推進': 'propulsion engine',
  '燃料': 'fuel propellant',
  'エンジン': 'rocket engine',
  '静的燃焼': 'static fire engine test',
  '爆発': 'explosion accident',
  '着陸': 'landing spacecraft',
  '月面': 'lunar surface moon',
  '火星': 'mars surface rover',
  '探査機': 'spacecraft probe',
  '打ち上げ': 'rocket launch',
  '軌道': 'orbit satellite',
  '宇宙飛行士': 'astronaut spacewalk',
  '補給': 'cargo resupply spacecraft',
  'ドッキング': 'docking spacecraft',
  '再突入': 'reentry capsule',
  'コンステレーション': 'satellite constellation',
  '通信': 'communication satellite',
  '軽量化': 'small satellite lightweight',
  '太陽電池': 'solar panel spacecraft',
  '宇宙望遠鏡': 'space telescope',
  '観測': 'observation satellite spacecraft',
}

// よく使う宇宙企業・機関名の英語マッピング
const COMPANY_KEYWORDS = {
  'スペースx': 'SpaceX',
  'ロケットラボ': 'Rocket Lab Electron',
  'ブルーオリジン': 'Blue Origin',
  'nasa': 'NASA',
  'jaxa': 'JAXA',
  'esa': 'ESA',
  'アルテミス': 'Artemis moon NASA',
  'スターシップ': 'Starship SpaceX',
  'ファルコン': 'Falcon SpaceX rocket',
  'ニューグレン': 'New Glenn Blue Origin',
  'ニュートロン': 'Neutron Rocket Lab',
  'iss': 'ISS space station',
  '国際宇宙ステーション': 'ISS space station',
}

// 企業・機関名 → 公式Xアカウント
const OFFICIAL_ACCOUNTS = {
  'スペースx': 'SpaceX',
  'spacex': 'SpaceX',
  'ロケットラボ': 'RocketLab',
  'rocket lab': 'RocketLab',
  'ブルーオリジン': 'blueorigin',
  'blue origin': 'blueorigin',
  'ニューグレン': 'blueorigin',
  'nasa': 'NASA',
  'jaxa': 'JAXA',
  'esa': 'ESA',
  'uli': 'ulalaunch',
  'ula': 'ulalaunch',
  'アルテミス': 'NASA',
  'スターシップ': 'SpaceX',
  'ファルコン': 'SpaceX',
  'ニュートロン': 'RocketLab',
  'iss': 'NASA',
  '国際宇宙ステーション': 'NASA',
  'virgin galactic': 'virgingalactic',
  'アストロボティック': 'astrobotic',
  'intuitive machines': 'Int_Machines',
  'firefly': 'Firefly_Space',
  'rocket lab': 'RocketLab',
  'northrop': 'northropgrumman',
  'ノースロップ': 'northropgrumman',
  'boeing': 'Boeing',
  'ボーイング': 'Boeing',
  'lockheed': 'LockheedMartin',
  'ロッキード': 'LockheedMartin',
}

// Xで関連ツイートを検索（公式アカウント優先・日付絞り込み対応）
async function searchRelevantTweets(title, category, count = 2, sourceDate = null) {
  const token = process.env.TWITTER_BEARER_TOKEN
  if (!token) {
    console.log('  TWITTER_BEARER_TOKEN が未設定のためスキップ')
    return []
  }

  // タイトルから公式アカウントを検出
  const titleLower = title.toLowerCase()
  const officialAccounts = []
  for (const [keyword, account] of Object.entries(OFFICIAL_ACCOUNTS)) {
    if (titleLower.includes(keyword) && !officialAccounts.includes(account)) {
      officialAccounts.push(account)
    }
  }

  const catKeyword = CATEGORY_KEYWORDS[category] || 'space'
  // タイトルから短い英語キーワードを抽出（3文字以上、略語除く）
  const titleKeywords = title.match(/[A-Za-z]{4,}/g)?.slice(0, 2).join(' ') || ''
  const queries = [
    // 公式アカウント＋キーワードで絞り込み
    ...officialAccounts.slice(0, 2).map(acc =>
      titleKeywords
        ? `from:${acc} ${titleKeywords} has:media -is:retweet`
        : `from:${acc} has:media -is:retweet`
    ),
    // フォールバック：公式アカウントのみ（キーワードなし）
    ...officialAccounts.slice(0, 1).map(acc => `from:${acc} has:media -is:retweet`),
    // 最終フォールバック：カテゴリキーワード検索
    `${catKeyword} has:media -is:retweet lang:en`,
  ]

  const tweetUrls = []
  for (const query of queries) {
    if (tweetUrls.length >= count) break
    try {
      const encoded = encodeURIComponent(query)
      // 日付が分かっている場合は前後2日間に絞り込む
      let timeParams = ''
      if (sourceDate) {
        const start = new Date(sourceDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        const end = new Date(Math.min(sourceDate.getTime() + 3 * 24 * 60 * 60 * 1000, Date.now())).toISOString()
        timeParams = `&start_time=${start}&end_time=${end}`
      }
      const url = `https://api.twitter.com/2/tweets/search/recent?query=${encoded}&tweet.fields=author_id&expansions=author_id&user.fields=username&max_results=10${timeParams}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        const err = await res.json()
        console.log(`  X API エラー (${res.status}):`, JSON.stringify(err).slice(0, 100))
        continue
      }
      const data = await res.json()
      const tweets = data.data || []
      const users = Object.fromEntries((data.includes?.users || []).map((u) => [u.id, u.username]))
      for (const tweet of tweets) {
        if (tweetUrls.length >= count) break
        const username = users[tweet.author_id] || 'twitter'
        tweetUrls.push(`https://twitter.com/${username}/status/${tweet.id}`)
      }
      console.log(`  ✓ X検索「${query.slice(0, 50)}」→ ${tweets.length} 件`)
    } catch (e) {
      console.error('  X検索エラー:', e.message)
    }
  }
  return tweetUrls
}

async function generateArticle(newsByRegion, recentArticles) {
  const newsText = Object.entries(newsByRegion)
    .flatMap(([region, items]) =>
      items.map((item) => `[${region.toUpperCase()}] ${item.title}\nURL: ${item.link}\n${item.description}`)
    )
    .join('\n\n')

  // カテゴリ別の直近記事数を集計
  const catCount = {}
  for (const a of recentArticles) {
    if (a.category) catCount[a.category] = (catCount[a.category] || 0) + 1
  }
  const overusedCats = Object.entries(catCount).filter(([, n]) => n >= 2).map(([c]) => c)

  const recentText =
    recentArticles.length > 0
      ? `\n【直近14日間に生成済みの記事（テーマとカテゴリが被らないようにすること）】\n${recentArticles.map((a) => `- [${a.category}] ${a.title}`).join('\n')}\n` +
        (overusedCats.length > 0 ? `\n【直近で多いカテゴリ（できるだけ避けること）】${overusedCats.join('、')}\n` : '')
      : ''

  // 直近14日間に日本関連記事がなければ優先指示を追加
  const japanKeywords = ['JAXA', 'H3', 'KAIROS', 'ispace', '日本', 'Epsilon', 'イプシロン', 'SLIM', 'はやぶさ']
  const hasJapanRecent = recentArticles.some(a => japanKeywords.some(kw => a.title.includes(kw)))
  const japanPriorityText = !hasJapanRecent
    ? '\n【優先指示】直近14日間に日本・JAXA関連の記事がありません。今回は[JAPAN]タグのニュースを最優先で選んでください。\n'
    : ''

  // 選択済みトピック（管理画面からの指定）
  const selectedTopic = process.env.ARTICLE_TOPIC || null
  const topicConstraint = selectedTopic
    ? `\n【重要】以下のテーマで必ず記事を書くこと（他のテーマは選ばないこと）:\n${selectedTopic}\n`
    : ''

  // 現在の日付をJSTで渡す
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const todayStr = `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4500,
    messages: [
      {
        role: 'user',
        content: `あなたは宇宙開発専門のニュースライターです。
「ミリレポ」のような軍事・専門系ニュースサイトのスタイルを参考に、
宇宙開発ニュースをわかりやすく、しかし報道として正確に伝える記事を書いてください。

【重要】今日の日付は ${todayStr} です。
ニュースソースに「〇〇年に予定」などの将来の予定が含まれていても、
その日付がすでに過去であれば「当初〇〇年に予定されていた」と正確に表現してください。
${topicConstraint}
以下のニュース一覧から**1つだけ**選び、そのニュースに絞って深く解説してください。
複数のニュースを混ぜないこと。
${japanPriorityText}${recentText}
ニュース一覧（地域タグ付き）:
${newsText}

【選題基準（重要）】
以下の優先順位でニュースを選ぶこと：

優先度：高（積極的に選ぶ）
- 「初めて」がつく出来事（初飛行・初着陸・初成功・初試験）
- まだ日本語メディアでほとんど報道されていない海外の新興企業・ロケットの話題
- 宇宙政策・予算の大きな変化
- 既存の常識を変える技術的発見・発表
- 知名度は低いがこれから注目される可能性がある企業・ミッション

優先度：低（できるだけ避ける）
- Falcon 9・Falcon Heavyの定期的な商業打ち上げ（週2〜3回あり珍しくない）
- すでに直近記事で扱ったSpaceX・NASAの話題の続報（新事実がない場合）
- 「〇〇を目指している」という目標発表だけで実績がないもの

地域バランスの目安: 米国50% / 日本20% / 中国20% / 欧州10%
毎日異なる地域・テーマになるよう、直近記事と被らないものを選ぶこと。

【固有名詞の正確なスペル（必ずこの表記を使うこと）】
ロケット: Falcon 9, Falcon Heavy, Starship, New Glenn, Electron, Neutron, Vulcan, New Shepard, Vega-C, Ariane 6, H3, Epsilon, KAIROS, Long March
企業: SpaceX, Blue Origin, Rocket Lab, ULA, Northrop Grumman, Lockheed Martin, Boeing, Virgin Galactic, Sierra Space, Relativity Space, Firefly Aerospace, ABL Space, ispace
機関: NASA, ESA, JAXA, ISRO, CNSA, Roscosmos
ミッション: Artemis, Starlink, Kuiper, OneWeb, Starfall, HLS, Gateway

文体・スタイルの基準（ミリレポ風）:
- 「です・ます」調のジャーナリスティックな文体。硬すぎず、崩しすぎない
- 冒頭の第一段落でニュースの核心を端的に伝える（何が起きたか・誰が・どこで）
- 具体的な数字・日付・固有名詞を積極的に使う（「大きな」ではなく「約120m」）
- 技術用語は初出時のみ自然に補足。以降はそのまま使う
- 見出しは事実ベースで具体的に（「〜の全容」「〜の現状」「〜が意味すること」など）
- 煽り・誇張・「驚き」演出は不要。事実が面白い
- 「まとめると」「〜と言えるでしょう」「〜かもしれません」などAI文体は使わない
- 本文中の1つ目の ## 見出しの直後に {{IMAGE_1}}、2つ目の ## 見出しの直後に {{IMAGE_2}} を入れる

【記事構成の基本テンプレート（内容に合わせて3〜5見出しで柔軟に調整）】
## 何が起きたか（今回のニュースの核心）
{{IMAGE_1}}
## なぜそれが重要なのか（背景・意義）
## 技術的な詳細 または これまでの経緯
{{IMAGE_2}}
## 今後どうなるか（次のステップ・課題）

※速報・内容が薄い場合は3見出しでよい。解説が多い場合は5見出しまで増やしてよい。
※見出し名はテンプレートをそのまま使わず、記事内容に合った具体的な表現にすること。

以下のJSON形式のみで返してください:
{
  "title": "記事タイトル（日本語、35文字以内・事実ベース）",
  "slug": "url-slug-in-english-only (lowercase, hyphens, ASCII only, 4-8 words describing the topic)",
  "description": "記事の要約（90文字以内）",
  "category": "次の5つのうち1つだけ: ロケット / 衛星・通信 / 有人宇宙飛行 / 月探査 / 火星探査",
  "source_urls": ["メインの参考記事URL", "2つ目の参考記事URL（なければ1つでもよい）"],
  "body": "記事本文（マークダウン形式。## 見出しを3〜5つ、{{IMAGE_1}}と{{IMAGE_2}}を含め、2000〜2800文字）"
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

  console.log('\n📋 直近の記事を確認中（重複防止）...')
  const recentArticles = getRecentArticles(14)
  console.log(`  直近14日: ${recentArticles.length} 件`)

  console.log(`\n🤖 Claude APIで記事を生成中...`)
  let article
  const maxTries = 3
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      article = await generateArticle(newsByRegion, recentArticles)
    } catch (e) {
      console.log(`  ⚠️  生成失敗（${e.message}）。リトライ中...`)
      article = await generateArticle(newsByRegion, recentArticles)
    }
    console.log(`  タイトル: ${article.title}`)
    if (!isDuplicateArticle(article.title, recentArticles)) break
    if (attempt < maxTries) {
      console.log(`  🔄 重複のため再生成（${attempt}/${maxTries}）...`)
    } else {
      console.log(`  ⚠️  ${maxTries}回試みても重複。最後の生成結果を使用します。`)
    }
  }
  console.log(`  カテゴリ: ${article.category}`)

  const autoPublish = process.argv.includes('--auto-publish')

  // ソース記事のOG画像を取得（カバー用）
  let coverImage = ''
  const nasaBodyImages = []
  if (autoPublish) {
    // 1. ソース記事のOG画像を最優先で取得
    const primarySourceUrl = article.source_urls?.[0]
    if (primarySourceUrl) {
      console.log(`\n🖼️  ソース記事からOG画像を取得中... (${primarySourceUrl.slice(0, 60)})`)
      const ogImage = await fetchOGImage(primarySourceUrl)
      if (ogImage) {
        console.log(`  🔍 画像の関連性を確認中...`)
        const isRelevant = await validateImageRelevance(ogImage, article.title, article.category)
        if (isRelevant) {
          coverImage = ogImage
          console.log(`  ✓ OG画像取得（関連性OK）: ${ogImage.slice(0, 60)}`)
        } else {
          console.log(`  ✗ OG画像が記事と無関係のためスキップ`)
        }
      }
    }
    // 2. OG画像が取得できなければNASA/Wikimediaで検索
    if (!coverImage) {
      console.log('\n🖼️  NASA/Wikimediaで関連画像を検索中...')
      const titleLower = article.title.toLowerCase()
      let searchQuery = article.title.match(/[A-Za-z][A-Za-z0-9\-\.]+/g)?.join(' ') || ''
      for (const [jp, en] of Object.entries(COMPANY_KEYWORDS)) {
        if (titleLower.includes(jp)) { searchQuery = en + ' ' + searchQuery; break }
      }
      // トピックキーワードを追加（タイトルまたは説明文に含まれるもの）
      for (const [jp, en] of Object.entries(TOPIC_KEYWORDS)) {
        if (article.title.includes(jp) || article.description?.includes(jp)) {
          searchQuery = (searchQuery + ' ' + en).trim()
          break
        }
      }
      if (!searchQuery.trim()) searchQuery = CATEGORY_KEYWORDS[article.category] || 'space'
      let imgs = await fetchNASAImages(searchQuery.trim(), 3)
      if (imgs.length === 0) imgs = await fetchNASAImages(CATEGORY_KEYWORDS[article.category] || 'space', 3)
      for (const img of imgs) {
        const isRelevant = await validateImageRelevance(img.url, article.title, article.category)
        if (isRelevant) {
          coverImage = img.url
          nasaBodyImages.push(...imgs.filter(i => i.url !== img.url).slice(0, 2))
          console.log(`  ✓ NASA画像選択（関連性OK）`)
          break
        }
        console.log(`  ✗ NASA画像スキップ（無関係）`)
      }
    }
  }

  // 固有名詞の誤字を自動修正
  function fixProperNouns(text) {
    const corrections = [
      [/New Glann/g, 'New Glenn'], [/New Gleenn/g, 'New Glenn'], [/New Glen\b/g, 'New Glenn'],
      [/StarShip/g, 'Starship'], [/Starhip/g, 'Starship'], [/Star Ship/g, 'Starship'],
      [/Falcon9/g, 'Falcon 9'], [/Falcon-9/g, 'Falcon 9'],
      [/Blue Origim/g, 'Blue Origin'], [/Blue Orgin/g, 'Blue Origin'],
      [/SpaceX(?![\s,])/g, (m, o, s) => s[o + 6] && s[o + 6] !== ' ' && s[o + 6] !== ',' ? m : m],
      [/Rocket Lab(?!s)/g, 'Rocket Lab'],
      [/NASAA/g, 'NASA'], [/ESAA/g, 'ESA'], [/JAXAA/g, 'JAXA'],
      [/Artimis/g, 'Artemis'], [/Artemus/g, 'Artemis'],
      [/Starlnk/g, 'Starlink'], [/Starlik/g, 'Starlink'],
    ]
    let result = text
    for (const [pattern, replacement] of corrections) {
      result = result.replace(pattern, replacement)
    }
    return result
  }

  // ソース記事の日付を取得（Twitterの日付絞り込み用）
  const primarySourceUrl = article.source_urls?.[0]
  const allNewsItems = Object.values(newsByRegion).flat()
  const sourceItem = primarySourceUrl
    ? allNewsItems.find(i => i.link === primarySourceUrl)
    : null
  const sourceDate = sourceItem?.date || null

  // Xで関連ツイートを検索（ソース記事の日付で絞り込み）
  console.log('\n🐦 X（Twitter）で関連ツイートを検索中...')
  const tweets = await searchRelevantTweets(article.title, article.category, 2, sourceDate)

  // 画像プレースホルダーをツイートURLまたはNASA画像に置換
  let body = fixProperNouns(article.body)
  body = body.replace('{{IMAGE_1}}', tweets[0]
    ? `\n${tweets[0]}\n`
    : nasaBodyImages[0]
      ? `\n![画像](${nasaBodyImages[0].url})\n*出典: ${nasaBodyImages[0].credit}*\n`
      : '')
  body = body.replace('{{IMAGE_2}}', tweets[1]
    ? `\n${tweets[1]}\n`
    : nasaBodyImages[1]
      ? `\n![画像](${nasaBodyImages[1].url})\n*出典: ${nasaBodyImages[1].credit}*\n`
      : '')

  article.title = fixProperNouns(article.title)
  article.description = fixProperNouns(article.description)

  // 参考記事セクションを末尾に追加
  const sourceUrls = (article.source_urls || []).filter(u => u && u.startsWith('http'))
  if (sourceUrls.length > 0) {
    const refLines = sourceUrls.map(u => `- ${u}`)
    body += `\n\n## 参考記事\n\n${refLines.join('\n')}`
  }

  const date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  // Claudeが生成した英語slugを使用（ASCII以外が混入していても除去）
  const titleSlug = article.slug
    ? article.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : article.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const slug = `${date}-${titleSlug}`

  // 画像クレジット（OG画像のソースドメイン）- ダウンロード前に取得
  let imageCredit = ''
  if (coverImage && primarySourceUrl) {
    try { imageCredit = new URL(primarySourceUrl).hostname.replace('www.', '') } catch {}
  }

  // カバー画像をローカルに保存（外部URLの場合）
  if (autoPublish && coverImage && coverImage.startsWith('http')) {
    console.log('\n💾 カバー画像をローカルに保存中...')
    const localPath = await downloadImage(coverImage, slug)
    if (localPath) coverImage = localPath
  }

  // 本文中の外部画像をローカルに保存
  if (autoPublish) {
    const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
    let imgIndex = 0
    const matches = [...body.matchAll(imgRegex)]
    for (const [full, alt, url] of matches) {
      const localPath = await downloadImage(url, `${slug}-body${imgIndex}`)
      if (localPath) body = body.replace(url, localPath)
      imgIndex++
    }
  }

  const lines = [
    `---`,
    `title: '${article.title.replace(/'/g, "''")}'`,
    `description: '${article.description.replace(/'/g, "''")}'`,
    `date: '${date}'`,
    `category: '${article.category}'`,
    `image: '${coverImage}'`,
    ...(imageCredit ? [`imageCredit: '${imageCredit}'`] : []),
    `---`,
    ``,
    body,
  ]

  const repoDir = path.join(__dirname, '..')

  const postsDir = path.join(repoDir, 'posts')
  const filePath = path.join(postsDir, `${slug}.md`)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
  console.log(`\n✅ 記事を保存: posts/${slug}.md`)
  // CI環境（GitHub Actions）ではワークフロー側でgit pushするためスキップ
  if (!process.env.CI) {
    try {
      execSync(`git add "posts/${slug}.md"`, { cwd: repoDir, stdio: 'inherit' })
      execSync(`git commit -m "記事自動公開 ${article.title}"`, { cwd: repoDir, stdio: 'inherit' })
      execSync('git push', { cwd: repoDir, stdio: 'inherit' })
      console.log(`\n🚀 自動公開完了`)
    } catch (e) {
      console.error('Git エラー:', e.message)
    }
  }
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
