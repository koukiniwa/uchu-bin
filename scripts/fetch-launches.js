#!/usr/bin/env node
// 今後の注目打ち上げを Launch Library 2 API から取得し、JSONに保存するスクリプト
// Usage: node scripts/fetch-launches.js

const fs = require('fs')
const path = require('path')

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'launches.json')
const API_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=40&mode=normal'

// SpaceX全般とElectronを除外
function isNotable(launch) {
  const provider = (launch.launch_service_provider?.name || '').toLowerCase()
  const rocket = (launch.rocket?.configuration?.name || '').toLowerCase()
  if (provider.includes('spacex')) return false
  if (rocket.includes('electron')) return false
  return true
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

  const launches = data.results
    .filter(isNotable)
    .slice(0, 15)
    .map(l => {
      const net = l.net ? new Date(l.net) : null
      const dateStr = net ? net.toISOString().slice(0, 10) : null
      const timeStr = net ? net.toISOString().slice(11, 16) : null
      // 日付が月末00:00UTCの場合は「月内予定」（正確な日時未定）
      const isTentative = net && net.getUTCDate() === 1 && net.getUTCHours() === 0 && net.getUTCMinutes() === 0
        || l.status?.abbrev === 'TBD'

      return {
        id: l.id,
        name: l.name,
        rocket: shortRocketName(l.rocket?.configuration?.name || 'Unknown'),
        mission: l.mission?.name || l.name?.split('|')[1]?.trim() || '',
        date: dateStr,
        time: isTentative ? null : timeStr,
        tentative: isTentative || false,
        provider: l.launch_service_provider?.name || '',
        country: l.pad?.country_code || l.pad?.location?.country_code || '',
        pad: l.pad?.location?.name || '',
        status: l.status?.abbrev || '',
        image: l.image || l.rocket?.configuration?.image_url || null,
      }
    })

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
