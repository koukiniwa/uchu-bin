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


// 地域別RSSフィード（日本30% / 米国40% / 中国20% / 欧州10% / その他）
const RSS_FEEDS_BY_REGION = {
  japan: [
    { url: 'https://www.jaxa.jp/rss/press.rss', label: '日本（JAXA）' },
    { url: 'https://sorae.info/feed', label: '日本（sorae.info）' },
    { url: 'https://spacenews.com/tag/japan/feed/', label: '日本（SpaceNews Japan）' },
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

// 地域ごとの取得件数（合計で約20件）
const REGION_COUNTS = { japan: 8, usa: 5, china: 3, europe: 2, global: 2 }

// JAXAプレスリリースから除外するキーワード（部品調達・契約・行政手続き系）
const JAXA_SKIP_KEYWORDS = [
  '調達', '契約', '入札', '公募', '審査', '委員会', '協定', '覚書', 'MOU',
  '委託', '選定', '仕様書', '意見公募', '評価結果', '締結', '採択', '補助金',
]

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
// 記事タイトルから主役の機体・ミッション名を抽出
async function extractMainSubject(title) {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: `宇宙ニュースのタイトルから主役の機体・ロケット・探査機・ミッション名を20文字以内で抽出してください。\n例：「H3ロケット」「Starship」「SLIM」「New Glenn」「Crew Dragon」「Ariane 6」「HAKUTO-R」\nタイトル: ${title}\n固有名詞のみ出力（説明不要）:` }]
    })
    return res.content[0].text.trim().slice(0, 20) || null
  } catch { return null }
}

// 画像が記事に関連しているかHaikuで判定
// subject指定時は厳格モード（その機体・ミッションが写っているか）
async function validateImageRelevance(imageUrl, title, _category, subject = null) {
  try {
    let imageSource
    if (imageUrl.startsWith('https://')) {
      imageSource = { type: 'url', url: imageUrl }
    } else {
      const res = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) return false
      const buffer = Buffer.from(await res.arrayBuffer())
      const mediaType = imageUrl.match(/\.png$/i) ? 'image/png' : 'image/jpeg'
      imageSource = { type: 'base64', media_type: mediaType, data: buffer.toString('base64') }
    }

    const prompt = subject
      ? `この画像は「${subject}」を主役とした「${title}」という記事のカバー画像として適切ですか？\n\n以下に当てはまればno：\n- ${subject}が写っていない（別のロケット・機体が主役）\n- ロゴ・バナー・グラフ・室内写真のみ\n- 一般的な宇宙写真で${subject}と無関係\n\n${subject}の機体・打ち上げ炎・着陸シーン・ミッション関連のCGや図が写っていればyes。\n「yes」か「no」だけで答えてください。`
      : `この画像は「${title}」という記事のカバー画像として使えますか？\n\n以下に当てはまればno：\n- 施設室内・会議・訓練・ポートレート写真\n- 企業ロゴ・バナー・シール・グラフのみ\n- 記事の機体・ミッションと明らかに無関係な別の機体が主役\n\n宇宙・ロケット・天体・衛星・惑星などに関連する写真や図であればyes。\n「yes」か「no」だけで答えてください。`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: [{ type: 'image', source: imageSource }, { type: 'text', text: prompt }] }]
    })
    return response.content[0].text.toLowerCase().trim().startsWith('yes')
  } catch (e) {
    console.error('  画像バリデーション失敗:', e.message)
    return false
  }
}

// 画像の日本語キャプションを生成
async function generateImageCaption(imageUrl, articleTitle) {
  try {
    let imageSource
    if (imageUrl.startsWith('https://')) {
      imageSource = { type: 'url', url: imageUrl }
    } else {
      const res = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) return ''
      const buffer = Buffer.from(await res.arrayBuffer())
      const mediaType = imageUrl.match(/\.png$/i) ? 'image/png' : 'image/jpeg'
      imageSource = { type: 'base64', media_type: mediaType, data: buffer.toString('base64') }
    }
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: `この画像を日本語で一文で説明してください。「${articleTitle}」という記事のカバー画像です。説明文のみ出力してください（例：「SpaceXのFalcon 9ロケットが打ち上げ台に立つ様子」）。` }
        ]
      }]
    })
    return response.content[0].text.trim()
  } catch (e) {
    console.error('  キャプション生成失敗:', e.message)
    return ''
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
      if (PORTRAIT_WORDS.some(w => title.toLowerCase().includes(w))) continue
      try {
        const infoRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`,
          { signal: AbortSignal.timeout(8000) }
        )
        const infoData = await infoRes.json()
        const page = Object.values(infoData?.query?.pages || {})[0]
        const info = page?.imageinfo?.[0]
        const imageUrl = info?.thumburl || info?.url
        if (!imageUrl || !/\.(jpg|jpeg|png)/i.test(imageUrl)) continue
        if (/\.svg/i.test(info?.url || '')) continue
        const artist = (info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons'
        const license = info.extmetadata?.LicenseShortName?.value || 'CC'
        const caption = title.replace(/^File:/, '').replace(/\.[^.]+$/, '')
        images.push({ url: imageUrl, credit: `${artist} / ${license} via Wikimedia Commons`, caption, fromWikimedia: true })
      } catch {}
    }
  } catch (e) {
    console.error('  Wikimedia Commons検索失敗:', e.message)
  }
  return images
}

// Wikimediaカテゴリから直接画像取得（全文検索より正確・レート制限が発生しにくい）
async function fetchWikimediaCategoryImages(category, count = 3) {
  const images = []
  try {
    const encoded = encodeURIComponent(`Category:${category}`)
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encoded}&cmtype=file&format=json&cmlimit=30&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    )
    const data = await res.json()
    const members = data?.query?.categorymembers || []
    const SKIP_WORDS = ['logo', 'badge', 'seal', 'icon', 'portrait', 'headshot', 'diagram', 'map', 'chart']
    for (const member of members) {
      if (images.length >= count) break
      const title = member.title || ''
      if (SKIP_WORDS.some(w => title.toLowerCase().includes(w))) continue
      if (!/\.(jpg|jpeg|png)/i.test(title)) continue
      try {
        const infoRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`,
          { signal: AbortSignal.timeout(8000) }
        )
        const infoData = await infoRes.json()
        const page = Object.values(infoData?.query?.pages || {})[0]
        const info = page?.imageinfo?.[0]
        const imageUrl = info?.thumburl || info?.url
        if (!imageUrl || !/\.(jpg|jpeg|png)/i.test(imageUrl)) continue
        if (/\.svg/i.test(info?.url || '')) continue
        const artist = (info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons'
        const license = info.extmetadata?.LicenseShortName?.value || 'CC'
        const caption = title.replace(/^File:/, '').replace(/\.[^.]+$/, '')
        images.push({ url: imageUrl, credit: `${artist} / ${license} via Wikimedia Commons`, caption, fromWikimedia: true })
      } catch {}
    }
  } catch (e) {
    console.error('  Wikimediaカテゴリ検索失敗:', e.message)
  }
  return images
}

// SpaceX公式FlickrからCC画像を取得（FLICKR_API_KEY必須）
async function fetchSpaceXFlickrImages(query, count = 3) {
  const apiKey = process.env.FLICKR_API_KEY
  if (!apiKey) return []
  const images = []
  try {
    const SPACEX_USER_ID = '130608600@N05'
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${apiKey}&user_id=${SPACEX_USER_ID}&text=${encoded}&format=json&nojsoncallback=1&extras=url_l,description,license&per_page=15&sort=relevance&license=1,2,3,4,5,6,9`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.stat !== 'ok') return []
    const photos = data?.photos?.photo || []
    const SKIP_WORDS = ['portrait', 'headshot', 'logo', 'badge', 'icon', 'press', 'conference', 'meeting', 'signing', 'ceremony']
    for (const photo of photos) {
      if (images.length >= count) break
      const title = (photo.title || '').toLowerCase()
      if (SKIP_WORDS.some(w => title.includes(w))) continue
      const imageUrl = photo.url_l
      if (!imageUrl) continue
      const licenseMap = { '1': 'CC BY-NC-SA 2.0', '2': 'CC BY-NC 2.0', '3': 'CC BY-NC-ND 2.0', '4': 'CC BY 2.0', '5': 'CC BY-SA 2.0', '6': 'CC BY-ND 2.0', '9': 'CC0' }
      const license = licenseMap[String(photo.license)] || 'CC'
      images.push({
        url: imageUrl,
        credit: `SpaceX / ${license} via Flickr`,
        caption: photo.title || 'SpaceX',
        fromFlickr: true,
      })
    }
    console.log(`  SpaceX Flickr: ${images.length}件取得`)
  } catch (e) {
    console.error('  SpaceX Flickr検索失敗:', e.message)
  }
  return images
}

// Wikimedia向けの短いクエリを生成（機体名・企業名・天文現象だけ2語）
async function generateWikimediaShortQuery(title) {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 15,
      messages: [{
        role: 'user',
        content: `記事「${title}」のWikimedia Commons画像検索用に、機体名・企業名・天文現象だけを英語2語で答えてください。例：「SpaceX Starship」「New Glenn」「black hole」「Vega-C rocket」。2語のみ出力。`
      }]
    })
    const q = response.content[0].text.trim().split('\n')[0].replace(/^[#\s"'「」]+|["'「」]+$/g, '').trim()
    if (q && q.length > 2 && !/[\u3000-\u9fff\uff00-\uffef]/.test(q)) return q
  } catch {}
  return null
}

// ローカル写真ライブラリ（public/images/library/）からトピックに合った画像を返す
const LIBRARY_TOPIC_KEYWORDS = {
  // ===== 日本ロケット =====
  h3:             ['h3ロケット', 'h3 rocket', 'h3号機', 'h3-', 'h-3'],
  epsilon:        ['イプシロン', 'epsilon'],
  kairos:         ['kairos', 'カイロス', 'インターステラ', 'interstellar technologies'],
  // ===== 米国ロケット =====
  starship:       ['starship', 'スターシップ', 'super heavy', 'superheavy'],
  falcon9:        ['falcon 9', 'falcon9', 'ファルコン9'],
  falconheavy:    ['falcon heavy', 'ファルコンヘビー'],
  newglenn:       ['new glenn', 'ニューグレン'],
  newshepard:     ['new shepard', 'ニューシェパード'],
  electron:       ['electron', 'エレクトロン'],
  neutron:        ['neutron', 'ニュートロン'],
  sls:            ['sls', 'space launch system', 'アルテミスロケット'],
  vulcan:         ['vulcan centaur', 'ヴァルカン'],
  atlasv:         ['atlas v', 'atlas-v', 'アトラスv'],
  deltaiv:        ['delta iv', 'デルタiv'],
  fireflyalpha:   ['firefly alpha', 'ファイアフライ'],
  terranr:        ['terran r', 'relativity space'],
  stokenova:      ['stoke space'],
  rs1:            ['rs1', 'abl space'],
  // ===== 欧州ロケット =====
  ariane6:        ['ariane 6', 'ariane6', 'アリアン6'],
  ariane5:        ['ariane 5', 'ariane5', 'アリアン5'],
  vegac:          ['vega-c', 'vega c', 'ヴェガ'],
  spectrum:       ['spectrum', 'isar aerospace'],
  orbexprime:     ['orbex'],
  rfaone:         ['rfa one', 'rocket factory augsburg'],
  miura:          ['miura', 'pld space'],
  // ===== ロシアロケット =====
  soyuz:          ['soyuz rocket', 'ソユーズロケット', 'soyuz-2'],
  angara:         ['angara', 'アンガラ'],
  proton:         ['proton', 'プロトン'],
  // ===== 中国ロケット =====
  longmarch5:     ['long march 5', '長征5号', 'cz-5'],
  longmarch7:     ['long march 7', '長征7号', 'cz-7'],
  longmarch9:     ['long march 9', '長征9号', 'cz-9'],
  zhuque:         ['zhuque', '朱雀', 'landspace'],
  lijian:         ['lijian', '力箭', 'orienspace'],
  // ===== 韓国・他ロケット =====
  nuri:           ['nuri', 'ヌリ', 'kslv-ii'],
  eris:           ['eris', 'gilmour'],
  pslv:           ['pslv'],
  lvm3:           ['lvm3', 'lvm-3', 'gslv mk3'],
  agnibaan:       ['agnibaan', 'agnikul'],
  // ===== 有人宇宙船 =====
  crewdragon:     ['crew dragon', 'クルードラゴン', 'dragon spacecraft'],
  starliner:      ['starliner', 'スターライナー', 'boeing capsule'],
  soyuzcapsule:   ['soyuz spacecraft', 'ソユーズ宇宙船', 'soyuz ms'],
  orion:          ['orion capsule', 'オリオン宇宙船', 'orion spacecraft'],
  cargodrag:      ['cargo dragon', 'カーゴドラゴン'],
  htv:            ['htv', 'こうのとり', 'htv-x'],
  cygnus:         ['cygnus', 'シグナス'],
  starhls:        ['starship hls', 'human landing system', 'hls'],
  // ===== 月着陸船 =====
  slim:           ['slim', 'スリム'],
  hakutor:        ['hakuto', 'ハクト', 'ispace'],
  novac:          ['nova-c', 'intuitive machines', 'im-1', 'im-2', 'im-3', 'odysseus'],
  peregrine:      ['peregrine', 'astrobotic peregrine'],
  blueghost:      ['blue ghost', 'ブルーゴースト'],
  griffin:        ['astrobotic griffin', 'griffin lander', 'viper'],
  change6:        ['嫦娥6', 'chang\'e 6', 'change-6', 'chang\'e6'],
  change7:        ['嫦娥7', 'chang\'e 7', 'change-7', 'chang\'e7'],
  chinalander:    ['中国有人月面', 'chinese crewed lunar lander'],
  vikramlander:   ['vikram lander', 'chandrayaan', 'チャンドラヤーン', 'pragyan'],
  bluemoon1:      ['blue moon mk1', 'blue moon cargo'],
  bluemoon2:      ['blue moon mk2', 'blue moon crewed', 'blue moon hls'],
  // ===== 宇宙ステーション =====
  iss:            ['国際宇宙ステーション', ' iss ', 'きぼう', 'international space station'],
  tiangong:       ['天宮', 'tiangong', 'css ', '中国宇宙ステーション'],
  axiom:          ['axiom station', 'axiom space', 'アクシオム'],
  orbitalreef:    ['orbital reef', 'オービタルリーフ'],
  starlab:        ['starlab', 'スターラボ'],
  haven1:         ['haven-1', 'haven 1', 'vast space'],
  haven2:         ['haven-2', 'haven 2'],
  gateway:        ['gateway', 'ゲートウェイ', '月軌道ステーション'],
  // ===== 宇宙探査機 =====
  hayabusa:       ['はやぶさ', 'hayabusa', 'mmx', 'フォボス'],
  // ===== 天体・天文 =====
  moon:           ['月面', '月探査', 'lunar', '月着陸', '月軌道'],
  mars:           ['火星', 'mars rover', 'mars lander', '火星探査'],
  earth:          ['地球観測', 'earth observation', '地球から見た'],
  jupiter:        ['木星', 'jupiter'],
  saturn:         ['土星', 'saturn'],
  asteroid:       ['小惑星', 'asteroid', 'ryugu', 'bennu', 'イトカワ'],
  sun:            ['太陽活動', 'solar activity', '太陽観測'],
  solarflare:     ['太陽フレア', 'solar flare', 'コロナ質量放出', 'cme'],
  blackhole:      ['ブラックホール', 'black hole'],
  galaxy:         ['銀河', 'galaxy', '天の川'],
  nebula:         ['星雲', 'nebula'],
  gravitationalwave: ['重力波', 'gravitational wave'],
  darkmatter:     ['暗黒物質', 'dark matter', 'ダークマター'],
  jwst:           ['ジェームズウェッブ', 'james webb', 'jwst'],
  hubble:         ['ハッブル', 'hubble'],
  // ===== 宇宙飛行士・汎用 =====
  astronaut:      ['宇宙飛行士', 'astronaut', '飛行士', '船外活動', 'eva '],
  satellite:      ['人工衛星', '通信衛星', 'constellation'],
}

function getLibraryImage(title) {
  const libraryDir = path.join(__dirname, '../public/images/library')
  if (!fs.existsSync(libraryDir)) return null
  const titleLow = title.toLowerCase()
  for (const [key, keywords] of Object.entries(LIBRARY_TOPIC_KEYWORDS)) {
    if (keywords.some(kw => titleLow.includes(kw.toLowerCase()))) {
      const files = fs.readdirSync(libraryDir)
        .filter(f => f.startsWith(key + '_') && /\.(jpg|jpeg|png)$/i.test(f))
      if (files.length > 0) {
        const chosen = files[Math.floor(Math.random() * files.length)]
        console.log(`  📚 ライブラリ画像使用: ${chosen}`)
        return `/images/library/${chosen}`
      }
    }
  }
  return null
}

// Wikimediaを優先して検索すべき記事のキーワード（NASA以外の組織・理論物理系）
const WIKIMEDIA_FIRST_KEYWORDS = [
  'esa', 'arianespace', 'vega', 'ariane',
  'ロケットラボ', 'rocket lab', 'electron', 'neutron',
  'ブルーオリジン', 'blue origin', 'new glenn', 'new shepard',
  'starship', 'スターシップ', 'superheavy', 'starfall',
  'spectrum', 'isar', 'mynaric',
  'isro', 'cnsa', 'roscosmos',
  'ast spacemobile', 'orbit fab', 'thales',
  'マクセル', 'maxell', 'ispace',
  '宇宙軍', 'faa', 'ゴールデンドーム',
  'ブラックホール', '重力波', '暗黒物質', 'パラドックス',
  '宇宙科学', '天文', '望遠鏡', '銀河', '星雲',
]

function shouldUseWikimediaFirst(title) {
  const low = title.toLowerCase()
  return WIKIMEDIA_FIRST_KEYWORDS.some(kw => low.includes(kw.toLowerCase()))
}

// SpaceX記事かどうかを判定（Flickrを優先使用するため）
const SPACEX_ARTICLE_KEYWORDS = [
  'spacex', 'スペースx', 'スペースエックス',
  'falcon', 'ファルコン',
  'starship', 'スターシップ',
  'superheavy', 'スーパーヘビー',
  'starfall',
]

function isSpaceXRelated(title) {
  const low = title.toLowerCase()
  return SPACEX_ARTICLE_KEYWORDS.some(kw => low.includes(kw.toLowerCase()))
}

// 記事キーワード → Wikimediaカテゴリ名のマッピング
const WIKIMEDIA_CATEGORY_MAP = [
  { keywords: ['smile', 'smileミッション'], category: 'SMILE_(spacecraft)' },
  { keywords: ['vega-c', 'vega c', 'ヴェガ'], category: 'Vega-C' },
  { keywords: ['ariane 6', 'ariane6', 'アリアン6'], category: 'Ariane_6' },
  { keywords: ['ariane 5', 'ariane5', 'アリアン5'], category: 'Ariane_5' },
  { keywords: ['esa '], category: 'Images_by_the_European_Space_Agency' },
  { keywords: ['starship', 'スターシップ', 'superheavy', 'starfall'], category: 'SpaceX_Starship' },
  { keywords: ['falcon 9', 'falcon9'], category: 'Falcon_9' },
  { keywords: ['falcon heavy'], category: 'Falcon_Heavy' },
  { keywords: ['dragon'], category: 'Dragon_(spacecraft)' },
  { keywords: ['new glenn', 'ニューグレン'], category: 'New_Glenn' },
  { keywords: ['new shepard', 'ニューシェパード'], category: 'New_Shepard' },
  { keywords: ['electron', 'エレクトロン'], category: 'Electron_(rocket)' },
  { keywords: ['neutron'], category: 'Neutron_(rocket)' },
  { keywords: ['artemis', 'アルテミス'], category: 'Artemis_program' },
  { keywords: ['sls ', 'space launch system'], category: 'Space_Launch_System' },
  { keywords: ['james webb', 'ジェームズウェッブ'], category: 'James_Webb_Space_Telescope' },
  { keywords: ['hubble'], category: 'Hubble_Space_Telescope' },
  { keywords: ['h3ロケット', 'h3 rocket', 'h-3', 'h3号機'], category: 'H3_(rocket)' },
  { keywords: ['ブラックホール', 'black hole'], category: 'Black_holes' },
  { keywords: ['銀河', 'galaxy'], category: 'Galaxies' },
  { keywords: ['星雲', 'nebula'], category: 'Nebulae' },
]

function getWikimediaCategory(title) {
  const low = title.toLowerCase()
  for (const entry of WIKIMEDIA_CATEGORY_MAP) {
    if (entry.keywords.some(kw => low.includes(kw.toLowerCase()))) return entry.category
  }
  return null
}

// 汎用NASA画像のブロックリスト
const BLOCKED_IMAGE_PATTERNS = [
  'NASA 60th_SEAL',
  'international-space-station-mockup-training',
  'GSFC_20171208_Archive',
  'koichi-wakata-spacex-training',
  'STS095',
  'NASA_seal',
  '20130421',
]

function isBlockedImage(url) {
  const low = url.toLowerCase()
  return BLOCKED_IMAGE_PATTERNS.some(p => low.includes(p.toLowerCase()))
}

// 記事に無関係な企業名が画像タイトルに含まれているかチェック
const COMPANY_IMAGE_FILTERS = [
  { words: ['electron', 'rocket lab', 'rocketlab'], articleKeywords: ['ロケットラボ', 'rocket lab', 'electron'] },
  { words: ['falcon', 'spacex', 'starship', 'dragon'], articleKeywords: ['spacex', 'スペースx', 'falcon', 'starship', 'dragon', 'ドラゴン'] },
  { words: ['new glenn', 'new shepard', 'blue origin'], articleKeywords: ['blue origin', 'ブルーオリジン', 'new glenn', 'new shepard'] },
  { words: ['sls', 'artemis'], articleKeywords: ['sls', 'artemis', 'アルテミス'] },
]

function isImageExcludedForArticle(nasaTitle, nasaDesc, articleTitle) {
  const titleLow = articleTitle.toLowerCase()
  const imgText = (nasaTitle + ' ' + nasaDesc).toLowerCase()
  for (const filter of COMPANY_IMAGE_FILTERS) {
    const imgHasCompany = filter.words.some(w => imgText.includes(w))
    const articleHasCompany = filter.articleKeywords.some(k => titleLow.includes(k))
    if (imgHasCompany && !articleHasCompany) return true
  }
  return false
}

// 記事に関連したNASA画像を検索して取得（出典付き）
async function fetchNASAImages(query, count = 3, articleTitle = '') {
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
      // 記事と無関係な企業の画像をスキップ
      if (articleTitle && isImageExcludedForArticle(title, desc, articleTitle)) {
        console.log(`  ✗ NASA画像スキップ（記事と無関係な企業: ${title.slice(0, 40)}）`)
        continue
      }
      const result = await resolveNASAImage(nasaId, center)
      if (result) {
        if (isBlockedImage(result.url)) continue
        images.push({ ...result, caption: item?.data?.[0]?.title || '' })
      }
    }
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

// Claudeで最適な画像検索クエリを生成
async function generateSearchQuery(title, category) {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `宇宙ニュース記事「${title}」のカバー画像をNASA画像ライブラリまたはWikimedia Commonsで検索します。最適な英語検索クエリを3〜5語で1つだけ答えてください。具体的な機体名・企業名・ミッション名・天文現象を含めてください。クエリのみ出力してください。`
      }]
    })
    const query = response.content[0].text.trim().replace(/^["'「」]|["'「」]$/g, '')
    if (query && query.length > 3) return query
  } catch (e) {
    console.error('  クエリ生成失敗:', e.message)
  }
  // フォールバック
  const titleLower = title.toLowerCase()
  let q = title.match(/[A-Za-z][A-Za-z0-9\-\.]+/g)?.join(' ') || ''
  for (const [jp, en] of Object.entries(COMPANY_KEYWORDS)) {
    if (titleLower.includes(jp)) { q = en + ' ' + q; break }
  }
  for (const [jp, en] of Object.entries(TOPIC_KEYWORDS)) {
    if (title.includes(jp)) { q = (q + ' ' + en).trim(); break }
  }
  return q.trim() || CATEGORY_KEYWORDS[category] || 'space'
}

// カテゴリ→英語キーワード
const CATEGORY_KEYWORDS = {
  'ロケット': 'rocket launch',
  '衛星・通信': 'satellite orbit',
  '有人宇宙飛行': 'astronaut crew spacecraft',
  '月探査': 'moon lunar surface',
  '火星探査': 'mars rover spacecraft',
  '宇宙科学': 'galaxy nebula cosmos telescope',
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

// ソース記事の本文をHTMLから抽出（p要素のテキストを最大4000文字）
async function fetchArticleBody(url) {
  try {
    const html = await fetchUrl(url)
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
    const paragraphs = []
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
    let match
    while ((match = pRegex.exec(cleaned)) !== null) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/&\w+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()
      if (text.length > 40) paragraphs.push(text)
    }
    const body = paragraphs.slice(0, 20).join('\n\n').slice(0, 4000)
    return body || null
  } catch {
    return null
  }
}

async function generateArticle(newsByRegion, recentArticles) {
  const allItems = Object.values(newsByRegion).flat()
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

  // === STEP 1: 記事を選択（Haiku - 安価） ===
  console.log('\n🔍 記事テーマを選択中...')
  const selMsg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `以下のニュース一覧から、記事にする1件を選んでください。
${japanPriorityText}${recentText}${topicConstraint}
【選題基準（重要）】
優先度：最高（[JAPAN]タグは必ず最優先）
- H3・イプシロン・KAIROSなど日本ロケットの打ち上げ成功・失敗
- JAXA探査機・衛星の着陸・成果・新発見（SLIM、はやぶさ、MMX等）
- 日本人宇宙飛行士の搭乗・帰還・宇宙での活動
- ispace・スペースワン等の日本民間宇宙企業の重大イベント

優先度：高
- 「初めて」がつく出来事（初飛行・初着陸・初成功・初試験）
- まだ日本語メディアでほとんど報道されていない海外の新興企業・ロケットの話題
- 宇宙政策・予算の大きな変化・既存の常識を変える技術的発見

優先度：低（避ける）
- Falcon 9・Falcon Heavyの定期的な商業打ち上げ
- すでに直近記事で扱った話題の続報（新事実がない場合）
- 部品調達・契約締結・技術審査・行政手続きの発表

地域バランスの目安: 日本30% / 米国40% / 中国20% / 欧州10%
直近記事と被らない地域・テーマを選ぶこと。

ニュース一覧:
${newsText}

以下のJSON形式のみで返してください（他のテキストは不要）:
{"url": "選んだ記事のURL", "title": "選んだ記事のタイトル"}`,
    }],
  })

  let selectedItem
  try {
    const selJson = JSON.parse(selMsg.content[0].text.match(/\{[\s\S]*\}/)[0])
    selectedItem = allItems.find(i => i.link === selJson.url) || allItems[0]
    console.log(`  ✓ 選択: ${selectedItem.title}`)
  } catch {
    selectedItem = allItems[0]
    console.log(`  ⚠️  選択パース失敗。先頭記事を使用: ${selectedItem.title}`)
  }

  // === STEP 2: ソース記事の本文を取得 ===
  let articleBody = ''
  if (selectedItem?.link) {
    console.log(`\n📰 ソース記事の本文を取得中... (${selectedItem.link.slice(0, 60)})`)
    articleBody = await fetchArticleBody(selectedItem.link)
    if (articleBody) {
      console.log(`  ✓ 本文取得成功（${articleBody.length}文字）`)
    } else {
      console.log(`  ✗ 本文取得失敗（概要のみで生成）`)
    }
  }

  // ソース記事の公開日をJSTで取得
  const sourceDate = selectedItem?.date instanceof Date && !isNaN(selectedItem.date) ? selectedItem.date : null
  const sourceDateJst = sourceDate ? new Date(sourceDate.getTime() + 9 * 60 * 60 * 1000) : null
  const sourceDateStr = sourceDateJst
    ? `${sourceDateJst.getUTCFullYear()}年${sourceDateJst.getUTCMonth() + 1}月${sourceDateJst.getUTCDate()}日`
    : null

  const dateInstruction = sourceDateStr
    ? `【重要】今日の日付は ${todayStr} です。このニュースのソース記事は ${sourceDateStr} に公開されました。記事内の出来事は「${sourceDateStr}、〜した」「〜が明らかになった」のようにソース記事の日付を基準に時制を書いてください。「〇〇年に予定」という記述がすでに過去であれば「当初〇〇年に予定されていた」と表現してください。`
    : `【重要】今日の日付は ${todayStr} です。ニュースソースに「〇〇年に予定」などの将来の予定が含まれていても、その日付がすでに過去であれば「当初〇〇年に予定されていた」と正確に表現してください。`

  const bodySection = articleBody
    ? `\n【ソース記事の本文（事実の根拠として使用すること）】\n${articleBody}\n`
    : ''

  // === STEP 3: 記事を執筆（Sonnet） ===
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4500,
    messages: [
      {
        role: 'user',
        content: `あなたは宇宙開発専門のニュースライターです。
「ミリレポ」のような軍事・専門系ニュースサイトのスタイルを参考に、
宇宙開発ニュースをわかりやすく、しかし報道として正確に伝える記事を書いてください。

${dateInstruction}
${topicConstraint}
以下のニュースについて日本語で記事を書いてください：

【対象ニュース】
タイトル: ${selectedItem.title}
URL: ${selectedItem.link}
概要: ${selectedItem.description || '（なし）'}
${bodySection}
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
- **業界全体の一般解説・将来展望で水増ししない。このニュース固有の事実だけを書く**
- **各段落は3〜4文で完結させる。同じ内容を言い換えて繰り返さない**

【記事構成（見出し3つ固定）】
## （何が起きたか：今回のニュースの核心を具体的なタイトルで）
{{IMAGE_1}}
## （なぜ重要か・背景：このニュース固有の文脈のみ）
{{IMAGE_2}}
## （次のステップ・残る課題：具体的に）

※見出し名はテンプレートをそのまま使わず、記事内容に合った具体的な表現にすること。
※3つの見出しに収まらない場合のみ4つにしてよい。5つは不可。

以下のJSON形式のみで返してください:
{
  "title": "記事タイトル（日本語、35文字以内・事実ベース）",
  "slug": "url-slug-in-english-only (lowercase, hyphens, ASCII only, 4-8 words describing the topic)",
  "description": "記事の要約（90文字以内）",
  "category": "次の6つのうち1つだけ: ロケット / 衛星・通信 / 有人宇宙飛行 / 月探査 / 火星探査 / 宇宙科学（天文学・物理学・観測衛星・望遠鏡など）",
  "source_urls": ["メインの参考記事URL", "2つ目の参考記事URL（なければ1つでもよい）"],
  "body": "記事本文（マークダウン形式。## 見出しを3つ、{{IMAGE_1}}と{{IMAGE_2}}を含め、1400〜1900文字）"
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
    // JAXAプレスリリースの地味な技術・行政系記事を除外
    if (region === 'japan') {
      const before = newsByRegion[region].length
      newsByRegion[region] = newsByRegion[region].filter(item => {
        if (!item.link?.includes('jaxa.jp')) return true
        const skip = JAXA_SKIP_KEYWORDS.some(kw => item.title.includes(kw))
        if (skip) console.log(`  🚫 JAXA除外: ${item.title}`)
        return !skip
      })
      const removed = before - newsByRegion[region].length
      if (removed > 0) console.log(`  ✂️  JAXAフィルター: ${removed}件除外`)
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
  let coverImageCaption = ''
  let coverImageCredit = ''
  const nasaBodyImages = []
  if (autoPublish) {
    const primarySourceUrl = article.source_urls?.[0]

    // 主役の機体・ミッション名を抽出（OG画像の厳格チェック用）
    const mainSubject = await extractMainSubject(article.title)
    if (mainSubject) console.log(`\n  主役: ${mainSubject}`)

    // 0. OG画像を最優先（厳格チェック：主役の機体が写っているか）
    if (primarySourceUrl) {
      console.log(`\n  OG画像を取得中... (${primarySourceUrl.slice(0, 60)})`)
      const ogImage = await fetchOGImage(primarySourceUrl)
      if (ogImage) {
        console.log(`  OG画像の関連性を確認中...`)
        const isRelevant = await validateImageRelevance(ogImage, article.title, article.category, mainSubject)
        if (isRelevant) {
          coverImage = ogImage
          console.log(`  ✓ OG画像採用`)
          coverImageCaption = await generateImageCaption(ogImage, article.title)
        } else {
          console.log(`  ✗ OG画像スキップ（主役と不一致）`)
        }
      }
    }

    // 1. OG画像が取得できなければライブラリ
    if (!coverImage) {
      const libraryImage = getLibraryImage(article.title)
      if (libraryImage) {
        coverImage = libraryImage
        console.log(`  ✓ ライブラリ画像を使用: ${libraryImage}`)
      }
    }

    // 2. ライブラリになければWikimedia/NASAで検索
    if (!coverImage) {
      console.log('\n🖼️  Wikimedia/NASAで関連画像を検索中...')
      const searchQuery = await generateSearchQuery(article.title, article.category)
      console.log(`  🔎 検索クエリ: "${searchQuery}"`)
      const useWikiFirst = shouldUseWikimediaFirst(article.title)
      let imgs = []
      // SpaceX記事はFlickrを最優先（FLICKR_API_KEYが設定されている場合）
      if (isSpaceXRelated(article.title) && process.env.FLICKR_API_KEY) {
        const flickrQuery = await generateWikimediaShortQuery(article.title) || searchQuery
        console.log(`  🚀 SpaceX Flickr検索: "${flickrQuery}"`)
        imgs = await fetchSpaceXFlickrImages(flickrQuery, 3)
      }
      if (imgs.length < 2) {
        if (useWikiFirst) {
          // まずカテゴリ直接検索（最も正確）
          const mappedCategory = getWikimediaCategory(article.title)
          if (mappedCategory) {
            console.log(`  🗂️  Wikimediaカテゴリ: "${mappedCategory}"`)
            const seen = new Set(imgs.map(i => i.url))
            const more = await fetchWikimediaCategoryImages(mappedCategory, 3 - imgs.length)
            imgs.push(...more.filter(i => !seen.has(i.url)))
          }
          // カテゴリで不足ならキーワード検索
          if (imgs.length < 2) {
            const wikiQuery = await generateWikimediaShortQuery(article.title) || searchQuery
            if (wikiQuery !== searchQuery) console.log(`  🔎 Wikimediaクエリ: "${wikiQuery}"`)
            const seen = new Set(imgs.map(i => i.url))
            const more = await fetchWikimediaImages(wikiQuery, 3 - imgs.length)
            imgs.push(...more.filter(i => !seen.has(i.url)))
          }
          // それでも不足ならNASA
          if (imgs.length < 2) {
            const nasa = await fetchNASAImages(searchQuery, 3 - imgs.length, article.title)
            imgs.push(...nasa)
          }
        } else {
          imgs = await fetchNASAImages(searchQuery, 3, article.title)
        }
      }
      for (const img of imgs) {
        const strictMode = !img.fromWikimedia
        const isRelevant = await validateImageRelevance(img.url, article.title, article.category)
        if (isRelevant) {
          coverImage = img.url
          coverImageCredit = img.credit || ''
          console.log(`  ✓ 画像選択OK`)
          console.log(`  📝 キャプション生成中...`)
          coverImageCaption = await generateImageCaption(img.url, article.title)
          for (const bodyImg of imgs.filter(i => i.url !== img.url).slice(0, 2)) {
            const bodyRelevant = await validateImageRelevance(bodyImg.url, article.title, article.category)
            if (bodyRelevant) nasaBodyImages.push(bodyImg)
            else console.log(`  ✗ 本文用画像スキップ（無関係）`)
          }
          break
        }
        console.log(`  ✗ 画像スキップ（無関係）`)
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

  // 画像クレジット: NASA/Wikimediaの場合は画像固有のクレジット、OG画像の場合はソースドメイン
  // 画像が見つからない場合はロゴをフォールバックとして使用
  if (!coverImage) {
    coverImage = '/logo.png'
    console.log('  📎 画像未取得のためロゴを使用')
  }

  let imageCredit = ''
  if (coverImageCredit) {
    imageCredit = coverImageCredit
  } else if (coverImage && coverImage !== '/logo.png' && primarySourceUrl) {
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
    ...(coverImageCaption ? [`imageCaption: '${coverImageCaption.replace(/'/g, "''")}'`] : []),
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

  // Google Indexing APIに通知（キーファイルがある場合のみ）
  const keyFile = path.join(repoDir, 'google-service-account.json')
  if (autoPublish && fs.existsSync(keyFile)) {
    try {
      console.log('\n🔍 Google Indexing APIに送信中...')
      execSync(`node scripts/submit-to-google.js ${slug}`, { cwd: repoDir, stdio: 'inherit' })
    } catch (e) {
      console.error('Google Indexing API エラー:', e.message)
    }
  }
}

main().catch((err) => {
  console.error('エラー:', err)
  process.exit(1)
})
