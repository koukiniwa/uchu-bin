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
  'spectrum', 'isar', 'mynaric', // ヨーロッパ系スタートアップ
  'isro', 'cnsa', 'roscosmos', // 各国宇宙機関
  'ast spacemobile', 'orbit fab', 'thales', // 商業系
  'マクセル', 'maxell', // 日本商業
  '宇宙軍', 'faa', 'ゴールデンドーム', // 軍事・規制
  'ブラックホール', '重力波', '暗黒物質', 'パラドックス', // 理論物理
]

function shouldUseWikimediaFirst(title) {
  const low = title.toLowerCase()
  return WIKIMEDIA_FIRST_KEYWORDS.some(kw => low.includes(kw.toLowerCase()))
}

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
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`,
          { signal: AbortSignal.timeout(8000) }
        )
        const infoData = await infoRes.json()
        const page = Object.values(infoData?.query?.pages || {})[0]
        const info = page?.imageinfo?.[0]
        if (!info?.url || !/\.(jpg|jpeg|png)$/i.test(info.url)) continue
        const artist = (info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons'
        const license = info.extmetadata?.LicenseShortName?.value || 'CC'
        const caption = title.replace(/^File:/, '').replace(/\.[^.]+$/, '')
        images.push({ url: info.url, credit: `${artist} / ${license} via Wikimedia Commons`, caption })
      } catch {}
    }
  } catch (e) {
    console.error('  Wikimedia検索失敗:', e.message)
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
      if (result) images.push({ ...result, caption: item?.data?.[0]?.title || '' })
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

async function validateImageRelevance(imageUrl, title) {
  try {
    const imgData = await fetchImageAsBase64(imageUrl)
    if (!imgData) return false
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imgData.mediaType, data: imgData.data } },
          { type: 'text', text: `この画像は「${title}」という記事のカバー画像として適切ですか？\n条件：画像が宇宙・ロケット・天体・宇宙飛行士・衛星・惑星などに関連し、かつ記事のテーマ（企業・ミッション・技術・組織など）と大きく矛盾しないこと。\n例えばESA記事にNASA宇宙飛行士訓練施設の画像はNG、ドイツの民間ロケット記事にNASAロケットエンジン試験の画像はNG。\n「yes」か「no」だけで答えてください。` }
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
    } else {
      // image行の直後に追加
      fm = fm.replace(/(image: '[^']*'\n)/, `$1${key}: '${escaped}'\n`)
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

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(POSTS_DIR, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const { meta } = parseFrontmatter(content)

    const title = meta.title || file
    const category = meta.category || 'ロケット'
    const slug = file.replace('.md', '')

    console.log(`\n[${i + 1}/${files.length}] ${title}`)

    // 検索クエリ構築
    const titleLower = title.toLowerCase()
    let searchQuery = title.match(/[A-Za-z][A-Za-z0-9\-\.]+/g)?.join(' ') || ''
    for (const [jp, en] of Object.entries(COMPANY_KEYWORDS)) {
      if (titleLower.includes(jp)) { searchQuery = en + ' ' + searchQuery; break }
    }
    for (const [jp, en] of Object.entries(TOPIC_KEYWORDS)) {
      if (title.includes(jp)) { searchQuery = (searchQuery + ' ' + en).trim(); break }
    }
    if (!searchQuery.trim()) searchQuery = CATEGORY_KEYWORDS[category] || 'space'

    // 画像検索（非NASA組織の記事はWikimediaを優先）
    const useWikiFirst = shouldUseWikimediaFirst(title)
    console.log(`  🔎 検索クエリ: "${searchQuery.trim()}" ${useWikiFirst ? '[Wikimedia優先]' : ''}`)
    let imgs
    if (useWikiFirst) {
      // Wikimediaを先に試し、見つからなければNASA
      imgs = await fetchWikimediaImages(searchQuery.trim(), 3)
      if (imgs.length < 2) {
        const nasaImgs = await fetchNASAImages(searchQuery.trim(), 3 - imgs.length, title)
        imgs.push(...nasaImgs)
      }
    } else {
      imgs = await fetchNASAImages(searchQuery.trim(), 3, title)
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
      console.log(`  🔍 検証中: ${img.url.slice(0, 80)}`)
      const isRelevant = await validateImageRelevance(img.url, title)
      if (isRelevant) {
        console.log(`  ✓ 画像選択OK`)
        const localPath = await downloadImage(img.url, slug)
        if (localPath) {
          newCaption = await generateImageCaption(img.url, title)
          newImage = localPath
          newCredit = img.credit || ''
          selectedUrl = img.url
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
  }

  console.log(`\n✅ 完了: 成功 ${success}件 / スキップ ${fail}件`)
  console.log('\n次のコマンドでgit pushしてください:')
  console.log('  git add posts/ public/images/ && git commit -m "全記事の画像を再取得" && git push')
}

main().catch(console.error)
