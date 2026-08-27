#!/usr/bin/env node
// 注目の打ち上げデータを生成するスクリプト
// LL2 API から注目打ち上げを取得し、Claude AI で注目理由を日本語で生成
// Usage: ANTHROPIC_API_KEY=xxx node scripts/generate-featured.js

const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'featured.json')
const API_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=80&mode=detailed'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 注目の打ち上げ判定（schedule/page.js の isNotable と同じロジック）
function isNotable(launch) {
  const m = (launch.mission?.name || '').toLowerCase()
  const r = (launch.rocket?.configuration?.name || '').toLowerCase()
  // Starship（超大型）
  if (r.includes('starship')) return true
  // H3（日本の主力ロケット）
  if (r.includes('h3') || r.includes('h-3')) return true
  // 有人飛行
  if (m.includes('crew')) return true
  if (m.includes('starliner')) return true
  // 惑星探査・深宇宙ミッション
  if (m.includes('chang\'e') || m.includes('mmx') || m.includes('europa') || m.includes('roman')) return true
  if (m.includes('artemis') || m.includes('lunar') || m.includes('moon')) return true
  // 新型ロケット初飛行
  if (r.includes('new glenn') || r.includes('spectrum') || r.includes('neutron')) return true
  if (m.includes('demo flight') || m.includes('maiden') || m.includes('first flight')) return true
  return false
}

// 国コード取得
function getCountryCode(launch) {
  const padAgency = launch.pad?.agencies?.[0]?.country?.[0]?.alpha_2_code
  if (padAgency) return padAgency
  const provider = (launch.launch_service_provider?.name || '').toLowerCase()
  if (provider.includes('china') || provider.includes('cas space') || provider.includes('galactic energy') || provider.includes('landspace') || provider.includes('orienspace') || provider.includes('ispace china')) return 'CN'
  if (provider.includes('isro') || provider.includes('indian') || provider.includes('skyroot') || provider.includes('agnikul')) return 'IN'
  if (provider.includes('nasa') || provider.includes('ula') || provider.includes('abl space') || provider.includes('firefly') || provider.includes('relativity') || provider.includes('blue origin') || provider.includes('virgin')) return 'US'
  if (provider.includes('jaxa') || provider.includes('mitsubishi')) return 'JP'
  if (provider.includes('roscosmos') || provider.includes('russian')) return 'RU'
  if (provider.includes('arianespace') || provider.includes('esa')) return 'EU'
  if (provider.includes('isar') || provider.includes('rocket factory')) return 'DE'
  if (provider.includes('korea') || provider.includes('innospace')) return 'KR'
  const rocket = (launch.rocket?.configuration?.name || '').toLowerCase()
  if (rocket.includes('long march') || rocket.includes('kuaizhou') || rocket.includes('zhuque') || rocket.includes('gravity') || rocket.includes('kinetica') || rocket.includes('ceres') || rocket.includes('lijian')) return 'CN'
  if (rocket.includes('soyuz') || rocket.includes('angara') || rocket.includes('proton')) return 'RU'
  if (rocket.includes('h3') || rocket.includes('h-ii') || rocket.includes('epsilon') || rocket.includes('kairos')) return 'JP'
  if (rocket.includes('gslv') || rocket.includes('pslv') || rocket.includes('lvm') || rocket.includes('sslv') || rocket.includes('vikram')) return 'IN'
  if (rocket.includes('ariane') || rocket.includes('vega')) return 'EU'
  if (rocket.includes('nuri')) return 'KR'
  if (rocket.includes('electron')) return 'NZ'
  return ''
}

function shortRocketName(name) {
  return name.replace(/\s*Block\s*\d+/i, '').replace(/\/[A-Z]$/, '').trim()
}

// Claude AI で注目理由を一括生成
async function generateHighlights(launches) {
  const launchList = launches.map((l, i) => {
    const desc = l.mission?.description || 'No description available'
    return `${i + 1}. ロケット: ${l.rocket?.configuration?.name || 'Unknown'}
   ミッション: ${l.mission?.name || 'Unknown'}
   運用者: ${l.launch_service_provider?.name || 'Unknown'}
   説明(英語): ${desc.slice(0, 500)}`
  }).join('\n\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `以下の打ち上げミッションについて、それぞれ日本語で「注目ポイント」を2〜3文で書いてください。
一般読者が「なぜこの打ち上げが注目なのか」がわかるように、背景やストーリー性を含めてください。

フォーマット: 各打ち上げについて番号と注目ポイントのみ出力。余計な前置きは不要。

${launchList}`
    }],
  })

  const text = response.content[0].text
  const highlights = {}

  // 番号ごとにパース
  for (let i = 0; i < launches.length; i++) {
    const num = i + 1
    const regex = new RegExp(`${num}\\.\\s*(.+?)(?=\\n${num + 1}\\.|$)`, 's')
    const match = text.match(regex)
    if (match) {
      // AI生成テキストからヘッダー行（**注目ポイント** 等）を除去
      highlights[i] = match[1].trim().replace(/^\*\*[^*]+\*\*\s*\n?/, '').trim()
    }
  }

  return highlights
}

async function main() {
  console.log('Fetching upcoming launches for featured page...')

  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'uchu-bin/1.0 (space news site)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()

  // 同一ロケットの重複を防止（最も直近の1件だけ残す）
  const seenRockets = new Set()
  const notableLaunches = data.results.filter(isNotable).filter(l => {
    const rocketKey = shortRocketName(l.rocket?.configuration?.name || '').toLowerCase()
    if (seenRockets.has(rocketKey)) return false
    seenRockets.add(rocketKey)
    return true
  }).slice(0, 8)
  console.log(`Found ${notableLaunches.length} notable launches`)

  if (notableLaunches.length === 0) {
    console.log('No notable launches found, writing empty data')
    const outDir = path.dirname(OUTPUT_PATH)
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ updated: new Date().toISOString(), featured: [] }, null, 2))
    return
  }

  // 既存データを読み込み（キャッシュとして利用）
  let existingData = { featured: [] }
  try {
    existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
  } catch {}
  const existingMap = new Map(existingData.featured.map(f => [f.id, f]))

  // 新しい注目ポイントが必要な打ち上げを特定
  const needHighlight = []
  const needHighlightIndices = []
  for (let i = 0; i < notableLaunches.length; i++) {
    const l = notableLaunches[i]
    if (!existingMap.has(l.id)) {
      needHighlight.push(l)
      needHighlightIndices.push(i)
    }
  }

  // 新規分のみAI生成（API節約）
  let newHighlights = {}
  if (needHighlight.length > 0) {
    console.log(`Generating highlights for ${needHighlight.length} new launches...`)
    const generated = await generateHighlights(needHighlight)
    for (let j = 0; j < needHighlight.length; j++) {
      if (generated[j]) {
        newHighlights[needHighlight[j].id] = generated[j]
      }
    }
  } else {
    console.log('All launches already have highlights (cached)')
  }

  // 最終データ構築
  const featured = notableLaunches.map(l => {
    const net = l.net ? new Date(l.net) : null
    const dateStr = net ? net.toISOString().slice(0, 10) : null
    const timeStr = net ? net.toISOString().slice(11, 16) : null
    const isTentative = l.status?.abbrev === 'TBD' || l.status?.abbrev === 'TBC'

    // キャッシュ or 新規生成から注目ポイントを取得
    const existing = existingMap.get(l.id)
    const highlight = existing?.highlight || newHighlights[l.id] || ''

    return {
      id: l.id,
      rocket: shortRocketName(l.rocket?.configuration?.name || 'Unknown'),
      mission: l.mission?.name || l.name?.split('|')[1]?.trim() || '',
      description: (l.mission?.description || '').slice(0, 300),
      highlight,
      date: dateStr,
      time: isTentative ? null : timeStr,
      tentative: isTentative || false,
      provider: l.launch_service_provider?.name || '',
      country: getCountryCode(l),
      pad: l.pad?.location?.name || '',
      status: l.status?.abbrev || '',
      orbit: l.mission?.orbit?.name || '',
    }
  })

  const outDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const output = {
    updated: new Date().toISOString(),
    featured,
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Saved ${featured.length} featured launches to ${OUTPUT_PATH}`)
  for (const f of featured) {
    console.log(`  ${f.rocket.padEnd(20)} ${f.mission.slice(0, 30)}`)
    if (f.highlight) console.log(`    -> ${f.highlight.slice(0, 60)}...`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
