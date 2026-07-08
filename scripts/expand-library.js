#!/usr/bin/env node
// ライブラリ画像一括拡充スクリプト
// 使い方: node scripts/expand-library.js
// オプション: --add-variety  既存トピック（1枚のみ）にも追加画像を取得
// 結果確認: ブラウザで public/images/library/_review.html を開く
// 不要な画像は public/images/library/ から削除してください

const fs = require('fs')
const path = require('path')

const LIBRARY_DIR = path.join(__dirname, '../public/images/library')

// ---- フィルタリング ----
const SKIP_WORDS = [
  'portrait', 'headshot', 'official photo', 'biography', 'crew photo',
  'group photo', 'smiling', 'poses', 'seated', 'logo', 'badge', 'seal',
  'icon', 'diagram', 'chart', 'graph', 'table', 'press conference',
  'meeting', 'signing', 'ceremony', 'award', 'interview', 'book cover',
  'patch', 'insignia', 'emblem', 'stamp', 'coin', 'flag',
]

function shouldSkip(title) {
  const low = (title || '').toLowerCase()
  return SKIP_WORDS.some(w => low.includes(w))
}

// ---- ダウンロード対象トピック ----
const TOPICS = [
  // === ファイルが存在しないトピック（LIBRARY_TOPIC_KEYWORDSに定義あり）===
  { key: 'satellite', queries: ['communication satellite orbit Earth', 'satellite deployment space'], wikiCategory: 'Artificial_satellites', targetCount: 3 },
  { key: 'astronaut', queries: ['astronaut spacewalk EVA', 'astronaut ISS space station'], wikiCategory: 'Astronauts_in_space', targetCount: 3 },
  { key: 'darkmatter', queries: ['galaxy cluster gravitational lensing Hubble', 'Bullet Cluster dark matter Chandra'], wikiCategory: 'Gravitational_lensing', targetCount: 2 },
  { key: 'gravitationalwave', queries: ['neutron star merger illustration NASA', 'black hole collision artist concept'], targetCount: 2 },
  { key: 'hayabusa', queries: ['Hayabusa2 asteroid Ryugu JAXA'], wikiCategory: 'Hayabusa2', targetCount: 2 },
  { key: 'newshepard', queries: ['New Shepard rocket launch landing blue origin'], targetCount: 2 },
  { key: 'neutron', queries: ['Rocket Lab Neutron rocket'], wikiCategory: 'Neutron_(rocket)', targetCount: 1 },
  { key: 'deltaiv', queries: ['Delta IV Heavy launch ULA'], wikiCategory: 'Delta_IV', targetCount: 2 },
  { key: 'ariane5', queries: ['Ariane 5 launch ESA Kourou'], wikiCategory: 'Ariane_5', targetCount: 2 },
  { key: 'proton', queries: ['Proton-M rocket launch Baikonur'], wikiCategory: 'Proton_(rocket_family)', targetCount: 2 },
  { key: 'longmarch9', queries: ['Long March 9 China rocket CZ-9'], targetCount: 1 },
  { key: 'rs1', queries: ['ABL Space RS1 rocket'], targetCount: 1 },
  { key: 'rfaone', queries: ['RFA ONE rocket Rocket Factory Augsburg'], targetCount: 1 },

  // === カテゴリフォールバック用の汎用トピック ===
  { key: 'rocketlaunch', queries: ['rocket launch night fire pad', 'rocket liftoff'], targetCount: 3 },
  { key: 'spacecraft', queries: ['deep space probe spacecraft NASA', 'interplanetary spacecraft'], targetCount: 2 },
  { key: 'spacetelescope', queries: ['space telescope observatory'], wikiCategory: 'Space_telescopes', targetCount: 2 },
  { key: 'supernova', queries: ['supernova remnant Hubble', 'supernova explosion star'], wikiCategory: 'Supernova_remnants', targetCount: 2 },
  { key: 'exoplanet', queries: ['exoplanet artist concept NASA'], targetCount: 2 },
  { key: 'comet', queries: ['comet tail space astronomy'], wikiCategory: 'Comets', targetCount: 2 },
  { key: 'spaceweather', queries: ['solar wind magnetosphere aurora space'], targetCount: 2 },
]

// --add-variety: 既存トピック（1枚のみ）にも2枚目を追加
const VARIETY_TOPICS = [
  { key: 'h3', queries: ['H3 rocket JAXA launch'], wikiCategory: 'H3_(rocket)', targetCount: 3 },
  { key: 'starship', queries: ['SpaceX Starship Super Heavy launch'], wikiCategory: 'SpaceX_Starship', targetCount: 3 },
  { key: 'falcon9', queries: ['Falcon 9 SpaceX launch landing'], wikiCategory: 'Falcon_9', targetCount: 3 },
  { key: 'newglenn', queries: ['New Glenn Blue Origin rocket'], wikiCategory: 'New_Glenn', targetCount: 3 },
  { key: 'electron', queries: ['Electron Rocket Lab launch'], wikiCategory: 'Electron_(rocket)', targetCount: 3 },
  { key: 'ariane6', queries: ['Ariane 6 ESA launch'], wikiCategory: 'Ariane_6', targetCount: 3 },
  { key: 'sls', queries: ['SLS Space Launch System Artemis'], wikiCategory: 'Space_Launch_System', targetCount: 3 },
  { key: 'iss', queries: ['International Space Station orbit'], wikiCategory: 'International_Space_Station', targetCount: 3 },
  { key: 'jwst', queries: ['James Webb Space Telescope mirror'], wikiCategory: 'James_Webb_Space_Telescope', targetCount: 3 },
  { key: 'moon', queries: ['Moon surface crater lunar'], targetCount: 3 },
  { key: 'mars', queries: ['Mars surface rover Curiosity'], targetCount: 3 },
  { key: 'blackhole', queries: ['black hole accretion disk event horizon'], wikiCategory: 'Black_holes', targetCount: 3 },
  { key: 'galaxy', queries: ['galaxy spiral Hubble deep field'], wikiCategory: 'Galaxies', targetCount: 3 },
  { key: 'crewdragon', queries: ['Crew Dragon SpaceX astronaut'], wikiCategory: 'Dragon_(spacecraft)', targetCount: 3 },
  { key: 'vulcan', queries: ['Vulcan Centaur ULA launch'], targetCount: 2 },
  { key: 'vegac', queries: ['Vega-C ESA launch Kourou'], wikiCategory: 'Vega-C', targetCount: 2 },
  { key: 'kairos', queries: ['KAIROS rocket Interstellar Technologies Japan'], targetCount: 2 },
  { key: 'slim', queries: ['SLIM JAXA moon lander'], targetCount: 2 },
]

// ---- NASA Images API ----
async function resolveNASAImage(nasaId) {
  try {
    const res = await fetch(
      `https://images-assets.nasa.gov/image/${nasaId}/collection.json`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const urls = await res.json()
    for (const suffix of ['~large.jpg', '~medium.jpg', '~orig.jpg', '~small.jpg']) {
      const found = urls.find(u => u.endsWith(suffix))
      if (found) return found
    }
    return urls.find(u => /\.jpg$/i.test(u)) || null
  } catch {
    return null
  }
}

async function searchNASA(query, count = 5) {
  const images = []
  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://images-api.nasa.gov/search?q=${encoded}&media_type=image&page_size=30`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return images
    const data = await res.json()
    const items = data?.collection?.items || []
    for (const item of items) {
      if (images.length >= count) break
      const d = item?.data?.[0]
      if (!d?.nasa_id) continue
      if (shouldSkip(d.title)) continue
      const url = await resolveNASAImage(d.nasa_id)
      if (url) {
        images.push({ url, title: d.title || '', source: `NASA (${d.nasa_id})` })
      }
    }
  } catch (e) {
    console.error(`  NASA search error: ${e.message}`)
  }
  return images
}

// ---- Wikimedia Commons API ----
async function getWikimediaImageUrl(title) {
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=1200&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const page = Object.values(data?.query?.pages || {})[0]
    const info = page?.imageinfo?.[0]
    if (!info) return null
    // SVG skip
    if (/\.svg/i.test(info.url || '')) return null
    // too small skip
    if (info.width && info.width < 400) return null
    const url = info.thumburl || info.url
    if (url && /\.(jpg|jpeg|png)/i.test(url)) return url
    return null
  } catch {
    return null
  }
}

async function searchWikimediaCategory(category, count = 5) {
  const images = []
  try {
    const encoded = encodeURIComponent(`Category:${category}`)
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encoded}&cmtype=file&format=json&cmlimit=40&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return images
    const data = await res.json()
    const members = data?.query?.categorymembers || []
    for (const member of members) {
      if (images.length >= count) break
      const title = member.title || ''
      if (shouldSkip(title)) continue
      if (!/\.(jpg|jpeg|png)/i.test(title)) continue
      const url = await getWikimediaImageUrl(title)
      if (url) {
        images.push({ url, title: title.replace(/^File:/, '').replace(/\.[^.]+$/, ''), source: `Wikimedia (${category})` })
      }
      await new Promise(r => setTimeout(r, 300))
    }
  } catch (e) {
    console.error(`  Wikimedia category error: ${e.message}`)
  }
  return images
}

async function searchWikimedia(query, count = 5) {
  const images = []
  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=6&format=json&srlimit=20&origin=*`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return images
    const data = await res.json()
    const results = data?.query?.search || []
    for (const result of results) {
      if (images.length >= count) break
      if (shouldSkip(result.title)) continue
      const url = await getWikimediaImageUrl(result.title)
      if (url) {
        images.push({ url, title: result.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''), source: 'Wikimedia' })
      }
      await new Promise(r => setTimeout(r, 300))
    }
  } catch (e) {
    console.error(`  Wikimedia search error: ${e.message}`)
  }
  return images
}

// ---- ダウンロード ----
async function downloadImage(url, filepath) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; library-builder/1.0)' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) return false
    if (buffer.length > 10 * 1024 * 1024) return false
    fs.writeFileSync(filepath, buffer)
    return true
  } catch {
    return false
  }
}

// ---- HTMLレビューページ生成 ----
function generateReviewHTML(downloaded) {
  const grouped = {}
  for (const d of downloaded) {
    const topic = d.filename.replace(/_\d+\.\w+$/, '')
    if (!grouped[topic]) grouped[topic] = []
    grouped[topic].push(d)
  }

  const sections = Object.entries(grouped).map(([topic, items]) => {
    const cards = items.map(d => `
      <div class="card">
        <img src="${d.filename}" loading="lazy" />
        <div class="info">
          <span class="filename">${d.filename}</span>
          <span class="source">${d.source}</span>
          <span class="title">${d.title.slice(0, 100)}</span>
        </div>
      </div>`).join('\n')
    return `
      <h2>${topic} (${items.length})</h2>
      <div class="grid">${cards}</div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Library Image Review</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; max-width: 1400px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
  h1 { margin-bottom: 8px; font-size: 24px; }
  .banner { background: #16213e; padding: 16px; border-radius: 10px; margin-bottom: 24px; line-height: 1.7; }
  .banner code { background: #0f3460; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  .banner strong { color: #e94560; }
  h2 { margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #333; font-size: 18px; color: #e94560; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .card { background: #16213e; border-radius: 10px; overflow: hidden; transition: transform .15s; }
  .card:hover { transform: scale(1.02); }
  .card img { width: 100%; height: 220px; object-fit: cover; display: block; }
  .info { padding: 10px 12px; }
  .filename { display: block; font-weight: bold; font-size: 14px; color: #fff; margin-bottom: 4px; }
  .source { display: block; font-size: 12px; color: #888; margin-bottom: 2px; }
  .title { display: block; font-size: 12px; color: #666; }
  .summary { margin-top: 30px; background: #16213e; padding: 16px; border-radius: 10px; }
</style>
</head>
<body>
<h1>Library Images Review</h1>
<div class="banner">
  <p>Downloaded <strong>${downloaded.length}</strong> images across <strong>${Object.keys(grouped).length}</strong> topics.</p>
  <p>Check each image below. Delete unwanted files from <code>public/images/library/</code></p>
  <p>After review, delete this file: <code>public/images/library/_review.html</code></p>
</div>
${sections}
<div class="summary">
  <h2>All files</h2>
  <ul style="columns:3;font-size:13px;list-style:none;padding:0;">
    ${downloaded.map(d => `<li style="padding:2px 0;">${d.filename}</li>`).join('\n    ')}
  </ul>
</div>
</body>
</html>`
}

// ---- メイン処理 ----
async function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    fs.mkdirSync(LIBRARY_DIR, { recursive: true })
  }

  const addVariety = process.argv.includes('--add-variety')
  const topics = addVariety ? [...TOPICS, ...VARIETY_TOPICS] : TOPICS

  console.log(`\nLibrary image expansion`)
  console.log(`Topics: ${topics.length} (${addVariety ? 'including variety' : 'missing only'})`)
  console.log(`Target directory: ${LIBRARY_DIR}\n`)

  const existingFiles = fs.readdirSync(LIBRARY_DIR)
  const downloaded = []
  let skipped = 0

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i]
    const existing = existingFiles.filter(f => f.startsWith(topic.key + '_') && /\.(jpg|jpeg|png)$/i.test(f))
    const needed = topic.targetCount - existing.length

    if (needed <= 0) {
      skipped++
      continue
    }

    console.log(`[${i + 1}/${topics.length}] ${topic.key} (have ${existing.length}, need ${needed} more)`)

    let candidates = []
    const seenUrls = new Set()

    // 1. Wikimedia category (most accurate)
    if (topic.wikiCategory && candidates.length < needed + 3) {
      console.log(`  Wikimedia category: ${topic.wikiCategory}`)
      const results = await searchWikimediaCategory(topic.wikiCategory, needed + 3)
      for (const r of results) {
        if (!seenUrls.has(r.url)) { candidates.push(r); seenUrls.add(r.url) }
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    // 2. NASA Images API
    if (candidates.length < needed + 3) {
      for (const query of topic.queries) {
        if (candidates.length >= needed + 3) break
        console.log(`  NASA: "${query}"`)
        const results = await searchNASA(query, needed + 3 - candidates.length)
        for (const r of results) {
          if (!seenUrls.has(r.url)) { candidates.push(r); seenUrls.add(r.url) }
        }
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    // 3. Wikimedia keyword search (fallback)
    if (candidates.length < needed) {
      for (const query of topic.queries) {
        if (candidates.length >= needed + 2) break
        console.log(`  Wikimedia search: "${query}"`)
        const results = await searchWikimedia(query, needed + 2 - candidates.length)
        for (const r of results) {
          if (!seenUrls.has(r.url)) { candidates.push(r); seenUrls.add(r.url) }
        }
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    // Download top candidates
    let count = 0
    let nextNum = existing.length + 1
    for (const candidate of candidates) {
      if (count >= needed) break
      const ext = candidate.url.match(/\.(jpg|jpeg|png)/i)?.[1]?.toLowerCase() || 'jpg'
      const filename = `${topic.key}_${String(nextNum).padStart(3, '0')}.${ext}`
      const filepath = path.join(LIBRARY_DIR, filename)

      process.stdout.write(`  -> ${filename} ... `)
      const ok = await downloadImage(candidate.url, filepath)
      if (ok) {
        console.log('OK')
        downloaded.push({ filename, title: candidate.title, source: candidate.source })
        count++
        nextNum++
      } else {
        console.log('FAIL')
      }
    }

    if (count === 0) {
      console.log(`  No images found`)
    }
  }

  // Generate review HTML
  if (downloaded.length > 0) {
    const html = generateReviewHTML(downloaded)
    const reviewPath = path.join(LIBRARY_DIR, '_review.html')
    fs.writeFileSync(reviewPath, html, 'utf-8')
  }

  console.log(`\n========================================`)
  console.log(`  Downloaded: ${downloaded.length} images`)
  console.log(`  Skipped:    ${skipped} topics (already have enough)`)
  console.log(`========================================`)
  if (downloaded.length > 0) {
    console.log(`\n  Review: open public/images/library/_review.html`)
    console.log(`  Delete unwanted images, then delete _review.html`)
  } else {
    console.log(`\n  No new images needed.`)
  }
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1) })
