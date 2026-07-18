#!/usr/bin/env node
// 今後の注目打ち上げを Launch Library 2 API から取得し、JSONに保存するスクリプト
// Usage: node scripts/fetch-launches.js

const fs = require('fs')
const path = require('path')

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'launches.json')
const API_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=80&mode=normal'

// Falcon 9 Starlinkのみ除外（SpaceXの他ミッション・Electronは残す）
function isNotable(launch) {
  const rocket = (launch.rocket?.configuration?.name || '').toLowerCase()
  const mission = (launch.mission?.name || launch.name || '').toLowerCase()
  if (rocket.includes('falcon 9') && mission.includes('starlink')) return false
  return true
}

// 国コードを取得（APIのネスト構造を複数試す＋プロバイダー名フォールバック）
function getCountryCode(launch) {
  // pad.agencies[0].country[0].alpha_2_code が最も正確
  const padAgency = launch.pad?.agencies?.[0]?.country?.[0]?.alpha_2_code
  if (padAgency) return padAgency
  // プロバイダー名から推定
  const provider = (launch.launch_service_provider?.name || '').toLowerCase()
  if (provider.includes('china') || provider.includes('cas space') || provider.includes('galactic energy') || provider.includes('landspace') || provider.includes('orienspace') || provider.includes('ispace china')) return 'CN'
  if (provider.includes('isro') || provider.includes('indian') || provider.includes('skyroot') || provider.includes('agnikul')) return 'IN'
  if (provider.includes('nasa') || provider.includes('ula') || provider.includes('abl space') || provider.includes('firefly') || provider.includes('relativity') || provider.includes('blue origin') || provider.includes('virgin')) return 'US'
  if (provider.includes('jaxa') || provider.includes('mitsubishi')) return 'JP'
  if (provider.includes('roscosmos') || provider.includes('russian')) return 'RU'
  if (provider.includes('arianespace') || provider.includes('esa')) return 'EU'
  if (provider.includes('isar') || provider.includes('rocket factory')) return 'DE'
  if (provider.includes('korea') || provider.includes('innospace')) return 'KR'
  if (provider.includes('defense development')) return 'KR'
  // ロケット名から推定
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

// ロケット名を簡潔にする
function shortRocketName(name) {
  return name
    .replace(/\s*Block\s*\d+/i, '')
    .replace(/\/[A-Z]$/, '')
    .trim()
}

async function main() {
  console.log('Fetching upcoming launches...')
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'uchu-bin/1.0 (space news site)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()

  const allLaunches = data.results
    .filter(isNotable)
    .map(l => {
      const net = l.net ? new Date(l.net) : null
      const dateStr = net ? net.toISOString().slice(0, 10) : null
      const timeStr = net ? net.toISOString().slice(11, 16) : null
      const isTentative = l.status?.abbrev === 'TBD' || l.status?.abbrev === 'TBC'
        || (net && net.getUTCHours() === 0 && net.getUTCMinutes() === 0
            && (net.getUTCDate() >= 28 || net.getUTCDate() === 1))
      // TBDの場合は「○月」表示用に月だけ保持
      const month = net ? net.getUTCMonth() + 1 : null

      return {
        id: l.id,
        name: l.name,
        rocket: shortRocketName(l.rocket?.configuration?.name || 'Unknown'),
        mission: l.mission?.name || l.name?.split('|')[1]?.trim() || '',
        date: dateStr,
        month,
        time: isTentative ? null : timeStr,
        tentative: isTentative || false,
        provider: l.launch_service_provider?.name || '',
        country: getCountryCode(l),
        pad: l.pad?.location?.name || '',
        status: l.status?.abbrev || '',
      }
    })

  // TBDの同一ロケットをまとめる（同月内）
  const seen = new Set()
  const launches = []
  for (const l of allLaunches) {
    if (l.tentative) {
      const key = `${l.rocket}_${l.month}`
      if (seen.has(key)) continue
      seen.add(key)
    }
    launches.push(l)
    if (launches.length >= 15) break
  }

  // 出力ディレクトリがなければ作成
  const outDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const output = {
    updated: new Date().toISOString(),
    launches,
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Saved ${launches.length} notable launches to ${OUTPUT_PATH}`)
  for (const l of launches) {
    const dateInfo = l.tentative ? `${l.date} (TBD)` : `${l.date} ${l.time || ''}UTC`
    console.log(`  ${dateInfo.padEnd(22)} ${l.rocket.padEnd(20)} ${l.mission.slice(0, 30)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
