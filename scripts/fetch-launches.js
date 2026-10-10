#!/usr/bin/env node
// 今後の注目打ち上げを Launch Library 2 API から取得し、JSONに保存するスクリプト
// Usage: node scripts/fetch-launches.js

const fs = require('fs')
const path = require('path')

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'launches.json')
const OVERRIDES_PATH = path.join(__dirname, '..', 'public', 'data', 'launch-overrides.json')
const API_URL = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=80&mode=detailed'

// 射場名の日本語対応表
const PAD_NAME_JA = {
  'Space Launch Complex 40': 'ケープカナベラル宇宙軍基地 SLC-40',
  'Space Launch Complex 4E': 'ヴァンデンバーグ宇宙軍基地 SLC-4E',
  'Launch Complex 39A': 'ケネディ宇宙センター LC-39A',
  'Launch Complex 39B': 'ケネディ宇宙センター LC-39B',
  'Orbital Launch Pad 2': 'スターベース（テキサス州）',
  'Orbital Launch Mount A': 'スターベース（テキサス州）',
  'Yoshinobu Launch Complex LP-2': '種子島宇宙センター 吉信射点',
  'Yoshinobu Launch Complex LP-1': '種子島宇宙センター 吉信射点',
  'Uchinoura Space Center': '内之浦宇宙空間観測所',
  'LC-2': '羅老宇宙センター',
  'Satish Dhawan Space Centre First Launch Pad': 'サティッシュ・ダワン宇宙センター 第1射点',
  'Satish Dhawan Space Centre Second Launch Pad': 'サティッシュ・ダワン宇宙センター 第2射点',
  'Launch Area 4 (SLS-2 / 603)': '酒泉衛星発射センター',
  'Pad 9401 (SLS-2)': '酒泉衛星発射センター',
  'Launch Complex 201': '文昌宇宙発射場',
  'Launch Complex 2': '文昌宇宙発射場',
  'Pad 16': '太原衛星発射センター',
  'Launch Complex 2 (LC-2)': '西昌衛星発射センター',
  'Launch Complex 3 (LC-3)': '西昌衛星発射センター',
  'Site 43/4': 'プレセツク宇宙基地',
  'Site 31/6': 'バイコヌール宇宙基地',
  'Pad 1S': 'ボストチヌイ宇宙基地',
  'ELA-4': 'クールー宇宙センター ELA-4',
  'ELV': 'クールー宇宙センター ELV',
  'Ariane Launch Area 4': 'クールー宇宙センター ELA-4',
  'Launch Complex 1': 'マヒア半島射場 LC-1',
  'Launch Complex 2': 'マヒア半島射場 LC-2',
  'Space Launch Complex 41': 'ケープカナベラル宇宙軍基地 SLC-41',
  'Space Launch Complex 2W': 'ヴァンデンバーグ宇宙軍基地 SLC-2W',
  '31/6': 'バイコヌール宇宙基地',
  'Mu Center': '内之浦宇宙空間観測所',
  'Long March 12 series Pad': '酒泉衛星発射センター',
  'Launch Area 91 (SLS-1 / 921)': '酒泉衛星発射センター',
  'HANBIT Pad': 'アルカンタラ射場（ブラジル）',
}

// 軌道名の日本語対応表
const ORBIT_JA = {
  'Low Earth Orbit': '低軌道（LEO）',
  'Sun-Synchronous Orbit': '太陽同期軌道（SSO）',
  'Geostationary Transfer Orbit': '静止遷移軌道（GTO）',
  'Geostationary Orbit': '静止軌道（GEO）',
  'Medium Earth Orbit': '中軌道（MEO）',
  'Highly Elliptical Orbit': '長楕円軌道（HEO）',
  'Polar Orbit': '極軌道',
  'Sub-Orbital': '弾道飛行',
  'Suborbital': '弾道飛行',
  'Mars Orbit': '火星軌道',
  'Lunar Orbit': '月軌道',
  'Direct Geostationary': '直接静止軌道投入',
  'Elliptical Orbit': '楕円軌道',
}

// 運用機関名の日本語対応表
const PROVIDER_JA = {
  'SpaceX': 'SpaceX',
  'United Launch Alliance': 'ULA（ユナイテッド・ローンチ・アライアンス）',
  'Arianespace': 'Arianespace（アリアンスペース）',
  'Rocket Lab': 'Rocket Lab',
  'Blue Origin': 'Blue Origin（ブルーオリジン）',
  'Mitsubishi Heavy Industries': '三菱重工業',
  'Japan Aerospace Exploration Agency': 'JAXA（宇宙航空研究開発機構）',
  'Indian Space Research Organization': 'ISRO（インド宇宙研究機関）',
  'China Aerospace Science and Technology Corporation': 'CASC（中国航天科技集団）',
  'Roscosmos': 'ロスコスモス',
  'Korea Aerospace Research Institute': 'KARI（韓国航空宇宙研究院）',
  'Korea Aerospace Industries': 'KAI（韓国航空宇宙産業）',
  'Northrop Grumman': 'ノースロップ・グラマン',
  'LandSpace': 'LandSpace（藍箭航天）',
  'Galactic Energy': 'Galactic Energy（星河動力）',
  'ExPace': 'ExPace（航天科工火箭技術）',
  'iSpace': 'iSpace（星際栄耀）',
  'HyImpulse': 'HyImpulse',
  'Innospace': 'Innospace（イノスペース）',
}

// 配信URLのドメインフィルタ（公式・信頼できるもののみ）
const TRUSTED_VID_DOMAINS = [
  'youtube.com', 'youtu.be',
  'spacex.com',
  'nasa.gov',
  'esa.int',
  'jaxa.jp',
  'x.com', 'twitter.com',
  'twitch.tv',
]

function isTrustedVidUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return TRUSTED_VID_DOMAINS.some(d => host === d || host.endsWith('.' + d))
  } catch { return false }
}

// 手動上書きデータを読み込む
function loadOverrides() {
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8'))
  } catch { return {} }
}

// ミッション概要をClaudeで翻訳（ANTHROPIC_API_KEYがある場合のみ）
async function translateDescription(text, missionName) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !text || text.length < 10) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: `以下の英文を日本語に翻訳してください。元の文の内容だけを訳し、情報を足さないでください。固有名詞（人名・組織名・衛星名）は英語のまま残してください。日時に関する文（scheduled for〜、set to launch〜等）は訳さず削除してください。翻訳文のみを返してください。\n\n${text}` }],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const translated = data.content?.[0]?.text?.trim()
    if (!translated) return null

    // 自動照合1: 元の文にある数字が翻訳にも含まれるか
    const numbers = text.match(/\d+/g) || []
    const allNumbersPresent = numbers.every(n => translated.includes(n))
    if (!allNumbersPresent && numbers.length > 0) {
      console.log(`  Translation check FAILED for ${missionName}: number mismatch`)
      return null
    }
    // 自動照合2: 翻訳に残っている英語の用語（2語以上の連続）が元の文に存在するか
    const englishTerms = translated.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+/g) || []
    for (const term of englishTerms) {
      if (!text.includes(term)) {
        console.log(`  Translation check FAILED for ${missionName}: "${term}" not in original`)
        return null
      }
    }
    return translated
  } catch (e) {
    console.log(`  Translation error for ${missionName}: ${e.message}`)
    return null
  }
}

// スケジュール表示: 全打ち上げを含める（Starlink含む）
// 記事生成のみStarlinkを除外（check-launch-results.js側で制御）
function isNotable(launch) {
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

// ロケット名を簡潔にする（LL2 APIの型式番号を一般的な名前に正規化）
function shortRocketName(name) {
  return name
    .replace(/\s*Block\s*\d+/i, '')       // "Zhuque-2E Block 2" → "Zhuque-2E"
    .replace(/Ariane 6[24]/i, 'Ariane 6') // "Ariane 62/64" → "Ariane 6"
    .replace(/H3-\d{2}/i, 'H3')           // "H3-22/H3-30" → "H3"
    .replace(/Soyuz 2\.1[abv](\/\S+)?/i, 'Soyuz 2') // "Soyuz 2.1b/Fregat" → "Soyuz 2"
    .replace(/Atlas V \d{3}/i, 'Atlas V')  // "Atlas V 551" → "Atlas V"
    .replace(/(Long March \d+[A-Z]?)\/\S+/i, '$1') // "Long March 2F/G" → "Long March 2F"
    .replace(/(Zhuque-\d+)[A-Z]/i, '$1')  // "Zhuque-2E" → "Zhuque-2"
    .replace(/\/[A-Z]$/, '')
    .trim()
}

async function main() {
  console.log('Fetching upcoming launches...')
  async function fetchWithRetry(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'uchu-bin/1.0 (space news site)' },
          signal: AbortSignal.timeout(30000),
        })
        return res
      } catch (e) {
        console.error(`Attempt ${attempt}/${retries} failed for ${url.slice(0, 80)}: ${e.message}`)
        if (attempt === retries) throw e
        await new Promise(r => setTimeout(r, 3000))
      }
    }
  }
  const [upcomingRes, recentRes] = await Promise.all([
    fetchWithRetry(API_URL),
    fetchWithRetry('https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=10&mode=normal'),
  ])
  if (!upcomingRes.ok) throw new Error(`API error: ${upcomingRes.status}`)
  const data = await upcomingRes.json()

  // 直近3日の完了した打ち上げを取得
  const recentData = recentRes.ok ? await recentRes.json() : { results: [] }
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
  const recent = recentData.results
    .filter(l => {
      const launchTime = new Date(l.net).getTime()
      return launchTime > threeDaysAgo
    })
    .map(l => {
      const statusName = (l.status?.name || '').toLowerCase()
      let result = 'success'
      let resultLabel = '成功'
      if (statusName.includes('failure')) { result = 'failure'; resultLabel = '失敗' }
      else if (statusName.includes('partial')) { result = 'partial'; resultLabel = '一部失敗' }
      return {
        id: l.id,
        rocket: shortRocketName(l.rocket?.configuration?.name || 'Unknown'),
        mission: l.mission?.name || l.name?.split('|')[1]?.trim() || '',
        date: l.net ? new Date(l.net).toISOString().slice(0, 10) : null,
        country: getCountryCode(l),
        provider: l.launch_service_provider?.name || '',
        result,
        resultLabel,
      }
    })
  console.log(`Found ${recent.length} recent completions (last 3 days)`)

  // 完了済みのIDを除外
  const recentIds = new Set(recent.map(r => r.id))

  const allLaunches = data.results
    .filter(l => isNotable(l) && !recentIds.has(l.id))
    .map(l => {
      const net = l.net ? new Date(l.net) : null
      const dateStr = net ? net.toISOString().slice(0, 10) : null
      const timeStr = net ? net.toISOString().slice(11, 16) : null
      const isTentative = l.status?.abbrev === 'TBD' || l.status?.abbrev === 'TBC'
        || (net && net.getUTCHours() === 0 && net.getUTCMinutes() === 0
            && (net.getUTCDate() >= 28 || net.getUTCDate() === 1))
      // TBDの場合は「○月」表示用に月だけ保持
      const month = net ? net.getUTCMonth() + 1 : null

      // ライブ配信URL（信頼できるドメインのみ、タイトル付き）
      const vidUrls = (l.vidURLs || [])
        .filter(v => v.url && isTrustedVidUrl(v.url))
        .map(v => ({ url: v.url, title: v.title || '' }))

      const webcast = vidUrls.find(v => v.url?.includes('youtube'))?.url
        || vidUrls.find(v => v.url?.includes('youtu.be'))?.url
        || vidUrls[0]?.url
        || null

      // 射場名（詳細 + 日本語、Unknown Padはロケーション名にフォールバック）
      const padName = l.pad?.name || ''
      const padLocation = l.pad?.location?.name || ''
      let padJa = PAD_NAME_JA[padName] || null
      if (padName === 'Unknown Pad' || !padName) {
        // Unknown Pad → ロケーション名をそのまま使う
        padJa = null // padDetailはundefinedにして、padLocationを使う
      } else if (padName && !padJa) {
        console.log(`  [PAD] 未登録: "${padName}" (${padLocation})`)
      }

      // 軌道名（日本語）
      const orbitEn = l.mission?.orbit?.name || ''
      const orbitJa = ORBIT_JA[orbitEn] || null
      if (orbitEn && !orbitJa && orbitEn !== 'Unknown') {
        console.log(`  [ORBIT] 未登録: "${orbitEn}"`)
      }

      // タイムゾーン
      const timezone = l.pad?.location?.timezone_name || ''

      // ミッション概要（英語）
      const descriptionEn = l.mission?.description || ''

      return {
        id: l.id,
        name: l.name,
        rocket: shortRocketName(l.rocket?.configuration?.name || 'Unknown'),
        mission: l.mission?.name || l.name?.split('|')[1]?.trim() || '',
        date: dateStr,
        month,
        time: isTentative ? null : timeStr,
        tentative: isTentative || false,
        provider: PROVIDER_JA[l.launch_service_provider?.name] || l.launch_service_provider?.name || '',
        country: getCountryCode(l),
        pad: padLocation,
        padDetail: padJa || padName || undefined,
        orbit: orbitJa || orbitEn || undefined,
        timezone: timezone || undefined,
        descriptionEn: descriptionEn || undefined,
        status: l.status?.abbrev || '',
        webcast: webcast || undefined,
        vidURLs: vidUrls.length > 0 ? vidUrls : undefined,
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
    if (launches.length >= 20) break
  }

  // 既存データから翻訳キャッシュを読み込む
  let existingTranslations = {}
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
    for (const l of (existing.launches || [])) {
      if (l.descriptionJa && l.descriptionEn) {
        existingTranslations[l.descriptionEn] = l.descriptionJa
      }
    }
  } catch {}

  // ミッション概要の翻訳（全件対象、キャッシュがない場合のみ）
  const overrides = loadOverrides()
  let translationCount = 0
  for (const l of launches) {
    // 手動上書きがあればそれを使う
    const override = overrides[l.mission] || overrides[l.id]
    if (override) {
      if (override.descriptionJa) l.descriptionJa = override.descriptionJa
      if (override.crew) l.crew = override.crew
      if (override.vidURLs) l.vidURLs = override.vidURLs
      if (override.notes) l.notes = override.notes
      continue
    }
    // キャッシュにあればそれを使う
    if (l.descriptionEn && existingTranslations[l.descriptionEn]) {
      l.descriptionJa = existingTranslations[l.descriptionEn]
      continue
    }
    // 翻訳（1回の実行で最大10件）
    if (l.descriptionEn && translationCount < 10) {
      console.log(`  Translating: ${l.mission}...`)
      const ja = await translateDescription(l.descriptionEn, l.mission)
      if (ja) {
        l.descriptionJa = ja
        translationCount++
      }
      // レートリミット対策
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 出力ディレクトリがなければ作成
  const outDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const output = {
    updated: new Date().toISOString(),
    launches,
    recent,
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Saved ${launches.length} notable launches to ${OUTPUT_PATH}`)
  console.log(`Translations: ${translationCount} new, ${Object.keys(existingTranslations).length} cached`)
  for (const l of launches) {
    const dateInfo = l.tentative ? `${l.date} (TBD)` : `${l.date} ${l.time || ''}UTC`
    console.log(`  ${dateInfo.padEnd(22)} ${l.rocket.padEnd(20)} ${l.mission.slice(0, 30)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
