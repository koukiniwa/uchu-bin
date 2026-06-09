#!/usr/bin/env node
// 全記事の画像を改善済みバリデーションで再取得するスクリプト
// 使い方: node scripts/refresh-images.js

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const Anthropic = require('@anthropic-ai/sdk')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images')

const client = new Anthropic()

// ---- 共通定数 ----
const CATEGORY_KEYWORDS = {
  'ロケット': 'rocket launch',
  '衛星・通信': 'satellite orbit',
  '有人宇宙飛行': 'astronaut crew spacecraft',
  '月探査': 'moon lunar surface',
  '火星探査': 'mars rover spacecraft',
  '宇宙科学': 'galaxy nebula cosmos telescope',
}

const TOPIC_KEYWORDS = {
  '全固体電池': 'solid state battery', '電池': 'battery power satellite',
  '推進': 'propulsion engine', '燃料': 'fuel propellant', 'エンジン': 'rocket engine',
  '静的燃焼': 'static fire engine test', '爆発': 'explosion accident',
  '着陸': 'landing spacecraft', '月面': 'lunar surface moon', '火星': 'mars surface rover',
  '探査機': 'spacecraft probe', '打ち上げ': 'rocket launch', '軌道': 'orbit satellite',
  '宇宙飛行士': 'astronaut spacewalk', '補給': 'cargo resupply spacecraft',
  'ドッキング': 'docking spacecraft', '再突入': 'reentry capsule',
  'コンステレーション': 'satellite constellation', '通信': 'communication satellite',
  '軽量化': 'small satellite lightweight', '太陽電池': 'solar panel spacecraft',
  '宇宙望遠鏡': 'space telescope', '観測': 'observation satellite spacecraft',
  'ブラックホール': 'black hole astronomy', '銀河': 'galaxy astronomy',
  '星雲': 'nebula astronomy', '望遠鏡': 'telescope observatory',
}

const COMPANY_KEYWORDS = {
  'スペースx': 'SpaceX', 'ロケットラボ': 'Rocket Lab Electron',
  'ブルーオリジン': 'Blue Origin', 'nasa': 'NASA', 'jaxa': 'JAXA', 'esa': 'ESA',
  'アルテミス': 'Artemis moon NASA', 'スターシップ': 'Starship SpaceX',
  'ファルコン': 'Falcon SpaceX rocket', 'ニューグレン': 'New Glenn Blue Origin',
  'iss': 'ISS space station', '国際宇宙ステーション': 'ISS space station',
}

// これらのキーワードを含む記事はWikimediaを優先して検索（NASA画像が合わないケースが多い）
const WIKIMEDIA_FIRST_KEYWORDS = [
  'esa', 'arianespace', 'vega', 'ariane', // ヨーロッパ宇宙機関
  'ロケットラボ', 'rocket lab', 'electron', 'neutron', // Rocket Lab
  'ブルーオリジン', 'blue origin', 'new glenn', 'new shepard', // Blue Origin
  'starship', 'スターシップ', 'superheavy', 'starfall', // SpaceX Starship
  'spectrum', 'isar', 'mynaric', // ヨーロッパ系スタートアップ
  'isro', 'cnsa', 'roscosmos', // 各国宇宙機関
  'ast spacemobile', 'orbit fab', 'thales', // 商業系
  'マクセル', 'maxell', 'ispace', // 日本商業
  '宇宙軍', 'faa', 'ゴールデンドーム', // 軍事・規制
  'ブラックホール', '重力波', '暗黒物質', 'パラドックス', // 理論物理
  '宇宙科学', '天文', '望遠鏡', '銀河', '星雲', // 天文・宇宙科学
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

const COMPANY_IMAGE_FILTERS = [
  { words: ['electron', 'rocket lab', 'rocketlab'], articleKeywords: ['ロケットラボ', 'rocket lab', 'electron'] },
  { words: ['falcon', 'spacex', 'starship', 'dragon'], articleKeywords: ['spacex', 'スペースx', 'falcon', 'starship', 'dragon', 'ドラゴン'] },
  { words: ['new glenn', 'new shepard', 'blue origin'], articleKeywords: ['blue origin', 'ブルーオリジン', 'new glenn', 'new shepard'] },
  { words: ['sls', 'artemis'], articleKeywords: ['sls', 'artemis', 'アルテミス'] },
]

// 明らかに間違った汎用画像のブロックリスト（URLにこれらが含まれていたらスキップ）
const BLOCKED_IMAGE_PATTERNS = [
  'NASA 60th_SEAL',                              // NASA 60周年ロゴ
  'international-space-station-mockup-training', // ISS訓練モックアップ
  'GSFC_20171208_Archive',                       // GDSCの汎用アーカイブ画像
  'koichi-wakata-spacex-training',               // 宇宙飛行士訓練写真
  'STS095',                                      // スペースシャトルSTS-95
  'NASA_seal',                                   // NASAシール/ロゴ
  '20130421',                                    // 2013年4月21日の汎用NASAイベント写真シリーズ
]

// 記事キーワード → Wikimediaカテゴリ名のマッピング（カテゴリ直接検索でレート制限を回避）
const WIKIMEDIA_CATEGORY_MAP = [
  // ESA系
  { keywords: ['smile', 'smileミッション'], category: 'SMILE_(spacecraft)' },
  { keywords: ['vega-c', 'vega c', 'ヴェガ'], category: 'Vega-C' },
  { keywords: ['ariane 6', 'ariane6', 'アリアン6'], category: 'Ariane_6' },
  { keywords: ['ariane 5', 'ariane5', 'アリアン5'], category: 'Ariane_5' },
  { keywords: ['esa '], category: 'Images_by_the_European_Space_Agency' },
  // SpaceX系
  { keywords: ['starship', 'スターシップ', 'superheavy', 'starfall'], category: 'SpaceX_Starship' },
  { keywords: ['falcon 9', 'falcon9'], category: 'Falcon_9' },
  { keywords: ['falcon heavy'], category: 'Falcon_Heavy' },
  { keywords: ['dragon'], category: 'Dragon_(spacecraft)' },
  // Blue Origin系
  { keywords: ['new glenn', 'ニューグレン'], category: 'New_Glenn' },
  { keywords: ['new shepard', 'ニューシェパード'], category: 'New_Shepard' },
  // Rocket Lab系
  { keywords: ['electron', 'エレクトロン'], category: 'Electron_(rocket)' },
  { keywords: ['neutron'], category: 'Neutron_(rocket)' },
  // NASA系
  { keywords: ['artemis', 'アルテミス'], category: 'Artemis_program' },
  { keywords: ['sls ', 'space launch system'], category: 'Space_Launch_System' },
  { keywords: ['iss ', '国際宇宙ステーション', 'space station'], category: 'International_Space_Station' },
  { keywords: ['james webb', 'ジェームズウェッブ'], category: 'James_Webb_Space_Telescope' },
  { keywords: ['hubble'], category: 'Hubble_Space_Telescope' },
  { keywords: ['h3ロケット', 'h3 rocket', 'h-3', 'h3号機'], category: 'H3_(rocket)' },
  // 天文現象
  { keywords: ['ブラックホール', 'black hole'], category: 'Black_holes' },
  { keywords: ['銀河', 'galaxy'], category: 'Galaxies' },
  { keywords: ['星雲', 'nebula'], category: 'Nebulae' },
]

function getWikimediaCategory(title) {
  const low = title.toLowerCase()
  for (const entry of WIKIMEDIA_CATEGORY_MAP) {
    if (entry.keywords.some(kw => low.includes(kw.toLowerCase()))) {
      return entry.category
    }
  }
  return null
}

function isBlockedImage(imageUrl) {
  const urlLow = imageUrl.toLowerCase()
  return BLOCKED_IMAGE_PATTERNS.some(p => urlLow.includes(p.toLowerCase()))
}

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

// ---- NASA画像取得 ----
async function resolveNASAImage(nasaId, center) {
  try {
    const res = await fetch(`https://images-assets.nasa.gov/image/${nasaId}/collection.json`, { signal: AbortSignal.timeout(8000) })
    const urls = await res.json()
    for (const suffix of ['~large.jpg', '~medium.jpg', '~small.jpg', '~thumb.jpg']) {
      const found = urls.find(u => u.endsWith(suffix))
      if (found) return { url: found, credit: `NASA/${center || 'JPL'}` }
    }
  } catch {}
  return null
}

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
        // サムネイルURLがあればそちらを使う（大きすぎる画像を避けるため）
        const imageUrl = info?.thumburl || info?.url
        if (!imageUrl || !/\.(jpg|jpeg|png)/i.test(imageUrl)) continue
        // SVGファイルはサムネイル変換後もサイズが大きくなるためスキップ
        if (/\.svg/i.test(info?.url || '')) continue
        // 元のURLもJPG/PNG確認
        if (!info?.url) continue
        const artist = (info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons'
        const license = info.extmetadata?.LicenseShortName?.value || 'CC'
        const caption = title.replace(/^File:/, '').replace(/\.[^.]+$/, '')
        images.push({ url: imageUrl, credit: `${artist} / ${license} via Wikimedia Commons`, caption, fromWikimedia: true })
      } catch {}
    }
  } catch (e) {
    console.error('  Wikimedia検索失敗:', e.message)
  }
  return images
}

// Wikimediaカテゴリから直接画像取得（全文検索より正確でレート制限が発生しにくい）
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
      // JPG/PNG以外はスキップ
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
    const PORTRAIT_WORDS = ['portrait', 'headshot', 'official photo', 'biography', 'crew photo', 'group photo', 'smiling', 'poses', 'seated']
    for (const item of items) {
      if (images.length >= count) break
      const nasaId = item?.data?.[0]?.nasa_id
      const center = item?.data?.[0]?.center || ''
      const title = (item?.data?.[0]?.title || '').toLowerCase()
      const desc = (item?.data?.[0]?.description || '').toLowerCase().slice(0, 200)
      if (!nasaId) continue
      if (PORTRAIT_WORDS.some(w => title.includes(w) || desc.includes(w))) continue
      if (articleTitle && isImageExcludedForArticle(title, desc, articleTitle)) continue
      const result = await resolveNASAImage(nasaId, center)
      if (result) {
        if (isBlockedImage(result.url)) {
          console.log(`  ✗ ブロックリスト画像をスキップ: ${result.url.slice(0, 60)}`)
          continue
        }
        images.push({ ...result, caption: item?.data?.[0]?.title || '' })
      }
    }
  } catch (e) {
    console.error('  NASA検索失敗:', e.message)
  }
  if (images.length < count) {
    const wiki = await fetchWikimediaImages(query, count - images.length)
    images.push(...wiki)
  }
  return images
}

async function fetchImageAsBase64(imageUrl) {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    // 5MB超えはスキップ（Claude APIの10MB制限に余裕を持たせる）
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length > 5 * 1024 * 1024) return null
    const mediaType = imageUrl.match(/\.png$/i) ? 'image/png' : 'image/jpeg'
    return { data: buffer.toString('base64'), mediaType }
  } catch {
    return null
  }
}

// strictMode=true: タイトル認識型（NASAフォールバックに使用）
// strictMode=false: 軽量型（Wikimedia専用クエリ結果に使用）
async function validateImageRelevance(imageUrl, title, strictMode = true) {
  try {
    const imgData = await fetchImageAsBase64(imageUrl)
    if (!imgData) return false
    const prompt = strictMode
      ? `この画像は記事「${title}」のカバー画像として適切ですか？\n以下の場合は「no」：企業ロゴ・記念シール・地上風景・非宇宙の人物写真・全く別のロケット/ミッション/天文現象の画像（例：スターシップ記事にFalcon 9、ブラックホール記事にロケット）。\n記事に登場する機体・企業・天文現象の画像なら「yes」。「yes」か「no」だけで答えてください。`
      : `この画像は宇宙・天文・ロケット・衛星・宇宙飛行士・惑星・星などに関連する画像ですか？\n企業ロゴ・記念シール・地上風景のみ・非宇宙の人物写真は「no」。それ以外は「yes」。「yes」か「no」だけで答えてください。`
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imgData.mediaType, data: imgData.data } },
          { type: 'text', text: prompt }
        ]
      }]
    })
    return response.content[0].text.toLowerCase().trim().startsWith('yes')
  } catch (e) {
    console.error('  バリデーション失敗:', e.message)
    return false
  }
}

async function generateImageCaption(imageUrl, articleTitle) {
  try {
    const imgData = await fetchImageAsBase64(imageUrl)
    if (!imgData) return ''
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imgData.mediaType, data: imgData.data } },
          { type: 'text', text: `この画像を日本語で一文で説明してください。「${articleTitle}」という記事のカバー画像です。説明文のみ出力してください（例：「SpaceXのFalcon 9ロケットが打ち上げ台に立つ様子」）。` }
        ]
      }]
    })
    return response.content[0].text.trim()
  } catch {
    return ''
  }
}

async function downloadImage(imageUrl, filename) {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true })
  const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1]?.toLowerCase() || 'jpg'
  const localFilename = `${filename}.${ext}`
  const localPath = path.join(IMAGES_DIR, localFilename)
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; news-bot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(localPath, buffer)
    return `/images/${localFilename}`
  } catch (e) {
    console.error('  ダウンロード失敗:', e.message)
    return null
  }
}

// ---- Claudeで最適な画像検索クエリを生成 ----
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
  // フォールバック: 機械的抽出
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

// Wikimedia向けの短いクエリを生成（ファイル名マッチング用に2〜3語）
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
    // 日本語が含まれている場合は無効（Claudeが謝罪文などを返した場合）
    if (q && q.length > 2 && !/[\u3000-\u9fff\uff00-\uffef]/.test(q)) return q
  } catch {}
  return null
}

// ---- frontmatter読み書き ----
function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: normalized, raw: '' }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*['"]?(.*?)['"]?\s*$/)
    if (m) meta[m[1]] = m[2]
  }
  return { meta, body: match[2], raw: match[1] }
}

function updateFrontmatter(content, updates) {
  // CRLF→LFに統一してから処理
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const match = normalized.match(/^(---\n[\s\S]*?\n---\n?)/)
  if (!match) return content
  let fm = match[1]
  for (const [key, value] of Object.entries(updates)) {
    const escaped = value.replace(/'/g, "''")
    const regex = new RegExp(`^${key}:.*$`, 'm')
    if (regex.test(fm)) {
      fm = fm.replace(regex, `${key}: '${escaped}'`)
    } else if (key !== 'image' && /^image: '/.test(fm)) {
      // image行の直後に追加（imageCaption/imageCreditの場合）
      fm = fm.replace(/(image: '[^']*'\n)/, `$1${key}: '${escaped}'\n`)
    } else {
      // 行が存在しない場合は---の直前に追加
      fm = fm.replace(/(\n---)/, `\n${key}: '${escaped}'$1`)
    }
  }
  return normalized.replace(/^(---\n[\s\S]*?\n---\n?)/, fm)
}

// ---- メイン処理 ----
async function main() {
  // --slugs slug1,slug2,... で特定記事のみ処理
  const slugsArg = process.argv.find(a => a.startsWith('--slugs='))
  let files
  if (slugsArg) {
    const slugs = slugsArg.replace('--slugs=', '').split(',')
    files = slugs.map(s => s.trim() + '.md').filter(f => fs.existsSync(path.join(POSTS_DIR, f)))
    console.log(`\n📋 指定${files.length}件の記事の画像を再取得します\n`)
  } else {
    const limit = parseInt(process.argv[2]) || 5
    files = fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .slice(-limit) // 最新N件
    console.log(`\n📋 最新${files.length}件の記事の画像を再取得します\n`)
  }

  let success = 0, skip = 0, fail = 0
  const usedImageUrls = new Set() // 同一実行内での画像URL重複を防ぐ

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(POSTS_DIR, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const { meta } = parseFrontmatter(content)

    const title = meta.title || file
    const category = meta.category || 'ロケット'
    const slug = file.replace('.md', '')

    console.log(`\n[${i + 1}/${files.length}] ${title}`)

    // Claudeで最適な検索クエリを生成
    const searchQuery = await generateSearchQuery(title, category)

    // 画像検索（SpaceX記事はFlickr優先、非NASA組織はWikimedia優先）
    const useWikiFirst = shouldUseWikimediaFirst(title)
    console.log(`  🔎 検索クエリ: "${searchQuery.trim()}" ${useWikiFirst ? '[Wikimedia優先]' : ''}`)
    let imgs = []
    // SpaceX記事はFlickrを最優先（FLICKR_API_KEYが設定されている場合）
    if (isSpaceXRelated(title) && process.env.FLICKR_API_KEY) {
      const flickrQuery = await generateWikimediaShortQuery(title) || searchQuery.trim()
      console.log(`  🚀 SpaceX Flickr検索: "${flickrQuery}"`)
      imgs = await fetchSpaceXFlickrImages(flickrQuery, 3)
    }
    if (imgs.length < 2) {
      if (useWikiFirst) {
        // まずカテゴリマップで正確な画像を探す（全文検索より正確・レート制限が発生しにくい）
        const mappedCategory = getWikimediaCategory(title)
        if (mappedCategory) {
          console.log(`  🗂️  Wikimediaカテゴリ: "${mappedCategory}"`)
          const seen = new Set(imgs.map(i => i.url))
          const more = await fetchWikimediaCategoryImages(mappedCategory, 3 - imgs.length)
          imgs.push(...more.filter(i => !seen.has(i.url)))
        }
        // カテゴリで見つからなかった場合はキーワード検索にフォールバック
        if (imgs.length < 2) {
          const wikiQuery = await generateWikimediaShortQuery(title) || searchQuery.trim()
          if (wikiQuery !== searchQuery.trim()) {
            console.log(`  🔎 Wikimediaクエリ: "${wikiQuery}"`)
          }
          const seen = new Set(imgs.map(i => i.url))
          const moreImgs = await fetchWikimediaImages(wikiQuery, 3 - imgs.length)
          imgs.push(...moreImgs.filter(i => !seen.has(i.url)))
          // 短縮クエリで少ない場合、元のクエリでも試す
          if (imgs.length < 2 && wikiQuery !== searchQuery.trim()) {
            const fallbackImgs = await fetchWikimediaImages(searchQuery.trim(), 3 - imgs.length)
            const allUrls = new Set(imgs.map(i => i.url))
            imgs.push(...fallbackImgs.filter(i => !allUrls.has(i.url)))
          }
        }
        if (imgs.length < 2) {
          const nasaImgs = await fetchNASAImages(searchQuery.trim(), 3 - imgs.length, title)
          imgs.push(...nasaImgs)
        }
      } else {
        imgs = await fetchNASAImages(searchQuery.trim(), 3, title)
      }
    }
    if (imgs.length === 0) {
      console.log(`  🔎 フォールバック: "${CATEGORY_KEYWORDS[category] || 'space'}"`)
      imgs = await fetchNASAImages(CATEGORY_KEYWORDS[category] || 'space', 3, title)
    }

    let newImage = null
    let newCaption = ''
    let newCredit = ''
    let selectedUrl = ''

    for (const img of imgs) {
      if (usedImageUrls.has(img.url)) {
        console.log(`  ✗ スキップ（他の記事で使用済み）`)
        continue
      }
      console.log(`  🔍 検証中: ${img.url.slice(0, 80)}`)
      // Wikimediaの専用クエリ結果は軽量バリデーション、NASAフォールバックは厳格バリデーション
      const isRelevant = await validateImageRelevance(img.url, title, !img.fromWikimedia)
      if (isRelevant) {
        console.log(`  ✓ 画像選択OK`)
        const localPath = await downloadImage(img.url, slug)
        if (localPath) {
          newCaption = await generateImageCaption(img.url, title)
          newImage = localPath
          newCredit = img.credit || ''
          selectedUrl = img.url
          usedImageUrls.add(img.url)
          break
        }
        console.log(`  ✗ ダウンロード失敗、次の候補へ`)
        continue
      }
      console.log(`  ✗ スキップ（無関係）`)
    }

    if (!newImage) {
      console.log(`  ⚠️  適切な画像が見つかりませんでした（スキップ）`)
      fail++
      // 次の記事のWikimediaレート制限を避けるため少し待つ
      await new Promise(r => setTimeout(r, 2000))
      continue
    }

    // 本文中の画像（body0, body1）もカバーと別の画像を取得
    const allImgs = await fetchNASAImages(searchQuery.trim(), 5, title)
    const bodyImgs = allImgs.filter(img => img.url !== selectedUrl).slice(0, 2)
    let updatedContent = updateFrontmatter(content, {
      image: newImage,
      ...(newCaption ? { imageCaption: newCaption } : {}),
      ...(newCredit ? { imageCredit: newCredit } : {}),
    })
    // 本文中の![画像](...)を置き換え
    const bodyImgMatches = [...updatedContent.matchAll(/!\[画像\]\(([^)]+)\)/g)]
    for (let bi = 0; bi < bodyImgMatches.length; bi++) {
      const bodyImg = bodyImgs[bi]
      if (!bodyImg) {
        // 画像が見つからなければ行ごと削除
        updatedContent = updatedContent.replace(/\n?\*出典:[^\n]*\*\n?/, '\n')
        updatedContent = updatedContent.replace(bodyImgMatches[bi][0], '')
        continue
      }
      const newBodyPath = await downloadImage(bodyImg.url, `${slug}-body${bi}`)
      if (newBodyPath) {
        updatedContent = updatedContent.replace(bodyImgMatches[bi][0], `![画像](${newBodyPath})`)
        // 出典行も更新
        updatedContent = updatedContent.replace(
          /(\*出典: )[^\*]*(\*)/,
          `$1${bodyImg.credit}$2`
        )
      }
    }
    fs.writeFileSync(filePath, updatedContent, 'utf-8')
    console.log(`  💾 保存完了: ${newImage}`)
    success++
    // Wikimediaレート制限を避けるため少し待つ
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`\n✅ 完了: 成功 ${success}件 / スキップ ${fail}件`)
  console.log('\n次のコマンドでgit pushしてください:')
  console.log('  git add posts/ public/images/ && git commit -m "全記事の画像を再取得" && git push')
}

main().catch(console.error)
