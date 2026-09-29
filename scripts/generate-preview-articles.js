#!/usr/bin/env node
// 打ち上げ予定記事の自動生成スクリプト
// LL2 APIから7日以内の打ち上げを検出し、予定記事データをJSONで生成
// 有人・日本のロケットは14日前から生成
// Starlink定常ミッションは対象外
// 既存の手動記事（posts/に存在するpreview記事）がある場合はスキップ

const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'previews')
const POSTS_DIR = path.join(__dirname, '..', 'posts')
const LAUNCHES_JSON = path.join(__dirname, '..', 'public', 'data', 'launches.json')

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// ロケット画像マッピング（既存と同じ）
const ROCKET_IMAGES = {
  'starship': '/images/library/starship_001.jpg',
  'falcon 9': '/images/library/falcon9_001.jpg',
  'falcon heavy': '/images/library/falconheavy_001.jpg',
  'electron': '/images/library/electron_001.jpg',
  'h3': '/images/library/h3_001.jpg',
  'ariane 6': '/images/library/ariane6_001.jpg',
  'soyuz': '/images/library/soyuz_001.jpg',
  'long march': '/images/library/longmarch5_001.jpg',
  'vega': '/images/library/vegac_001.jpg',
  'vulcan': '/images/library/vulcan_001.jpg',
  'new glenn': '/images/library/newglenn_001.jpg',
  'pslv': '/images/library/pslv_001.jpg',
  'gslv': '/images/library/gslv_001.jpg',
  'lvm': '/images/library/lvm3_001.jpg',
  'nuri': '/images/library/nuri_001.jpg',
  'kuaizhou': '/images/library/kuaizhou_001.jpg',
  'zhuque': '/images/library/zhuque_001.jpg',
  'gravity': '/images/library/gravity1_001.jpg',
  'proton': '/images/library/proton_001.jpg',
  'angara': '/images/library/angara_001.jpg',
}

// ロケット名の日本語変換
const ROCKET_JA = {
  'Falcon 9': 'ファルコン9',
  'Falcon Heavy': 'ファルコンヘビー',
  'Starship': 'スターシップ',
  'Electron': 'エレクトロン',
  'H3-22': 'H3',
  'H3-24': 'H3',
  'H3-30': 'H3',
  'Ariane 62': 'アリアン6',
  'Ariane 64': 'アリアン6',
  'Soyuz 2.1a': 'ソユーズ2',
  'Soyuz 2.1b': 'ソユーズ2',
  'Vega-C': 'ヴェガC',
  'Vulcan Centaur': 'ヴァルカン',
  'New Glenn': 'ニューグレン',
  'PSLV': 'PSLV',
  'GSLV Mk II': 'GSLV',
  'LVM-3': 'LVM3',
  'Nuri': 'ヌリ',
  'Long March 2C': '長征2号C',
  'Long March 2D': '長征2号D',
  'Long March 2F/G': '長征2号F',
  'Long March 3B/E': '長征3号B',
  'Long March 5': '長征5号',
  'Long March 5B': '長征5号B',
  'Long March 6A': '長征6号A',
  'Long March 6C': '長征6号C',
  'Long March 7A': '長征7号A',
  'Long March 8': '長征8号',
  'Long March 8A': '長征8号A',
  'Long March 11': '長征11号',
  'Long March 12': '長征12号',
}

// 射場の日本語名
const PAD_JA = {
  'Kennedy': 'ケネディ宇宙センター',
  'Cape Canaveral': 'ケープカナベラル宇宙軍基地',
  'Vandenberg': 'ヴァンデンバーグ宇宙軍基地',
  'Starbase': 'スターベース',
  'Boca Chica': 'スターベース',
  'Wenchang': '文昌宇宙発射場',
  'Jiuquan': '酒泉衛星発射センター',
  'Taiyuan': '太原衛星発射センター',
  'Xichang': '西昌衛星発射センター',
  'Tanegashima': '種子島宇宙センター',
  'Yoshinobu': '種子島宇宙センター',
  'Uchinoura': '内之浦宇宙空間観測所',
  'Mahia': 'マヒア半島射場',
  'Kourou': 'クールー宇宙センター',
  'Guiana': 'クールー宇宙センター',
  'Plesetsk': 'プレセツク宇宙基地',
  'Baikonur': 'バイコヌール宇宙基地',
  'Vostochny': 'ボストチヌイ宇宙基地',
  'Satish Dhawan': 'サティッシュ・ダワン宇宙センター',
  'Naro': '羅老宇宙センター',
}

const COUNTRY_JA = {
  US: 'アメリカ', CN: '中国', IN: 'インド', JP: '日本', RU: 'ロシア',
  FR: 'フランス', EU: '欧州', KR: '韓国', NZ: 'ニュージーランド',
  DE: 'ドイツ', GB: 'イギリス', BR: 'ブラジル', IL: 'イスラエル',
}

function getRocketImage(rocketName) {
  const lower = (rocketName || '').toLowerCase()
  for (const [key, val] of Object.entries(ROCKET_IMAGES)) {
    if (lower.includes(key)) return val
  }
  return '/images/library/rocketlaunch_001.jpg'
}

function getRocketJa(rocketName) {
  return ROCKET_JA[rocketName] || rocketName
}

function getPadJa(padName) {
  if (!padName) return ''
  for (const [key, val] of Object.entries(PAD_JA)) {
    if (padName.includes(key)) return val
  }
  return padName
}

function getCountryJa(countryCode) {
  return COUNTRY_JA[countryCode] || countryCode || ''
}

function toSlug(missionName) {
  return missionName
    .toLowerCase()
    .replace(/[()（）]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isStarlink(missionName) {
  return /starlink group \d/i.test(missionName || '')
}

function isHighPriority(launch) {
  const mission = (launch.mission?.type || '').toLowerCase()
  const rocket = (launch.rocket?.configuration?.name || '').toLowerCase()
  // 有人ミッション
  if (mission.includes('human')) return true
  // 日本のロケット
  if (rocket.includes('h3') || rocket.includes('epsilon') || rocket.includes('kairos')) return true
  // 惑星探査
  if (mission.includes('planetary')) return true
  return false
}

// ミッション説明から日時やscheduled for等を除去
function cleanDescription(desc) {
  if (!desc) return ''
  return desc
    .replace(/scheduled for[^.]*\./gi, '')
    .replace(/set to launch[^.]*\./gi, '')
    .replace(/will launch[^.]*\./gi, '')
    .replace(/launching on[^.]*\./gi, '')
    .replace(/on \w+ \d+,? \d{4}/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatJST(dateStr) {
  const utc = new Date(dateStr)
  const jst = new Date(utc.getTime() + 9 * 3600000)
  const y = jst.getUTCFullYear()
  const m = jst.getUTCMonth() + 1
  const d = jst.getUTCDate()
  const dow = WEEKDAYS[new Date(Date.UTC(y, jst.getUTCMonth(), d)).getUTCDay()]
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const min = String(jst.getUTCMinutes()).padStart(2, '0')
  return { dateStr: `${m}月${d}日（${dow}）`, timeStr: `${h}:${min}`, full: `${y}年${m}月${d}日（${dow}）${h}:${min} JST` }
}

// 既存の手動preview記事があるかチェック
function hasManualPreview(missionName) {
  const mSlug = toSlug(missionName)
  try {
    const files = fs.readdirSync(POSTS_DIR)
    return files.some(f => f.includes('preview') && f.includes(mSlug))
  } catch { return false }
}

async function fetchUpcomingLaunches() {
  const res = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?mode=detailed&limit=30&ordering=net', {
    headers: { 'User-Agent': 'uchu-bin/1.0' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`LL2 API error: ${res.status}`)
  const data = await res.json()
  return data.results || []
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('Fetching upcoming launches from LL2 API...')
  const launches = await fetchUpcomingLaunches()
  console.log(`Found ${launches.length} upcoming launches`)

  const now = new Date()
  const generated = []

  for (const launch of launches) {
    const missionName = launch.mission?.name
    if (!missionName || missionName === 'Unknown Payload') continue

    // Starlink定常ミッションは除外
    if (isStarlink(missionName)) {
      console.log(`  Skip (Starlink): ${missionName}`)
      continue
    }

    const net = new Date(launch.net)
    const daysUntil = (net - now) / (1000 * 60 * 60 * 24)

    // 日数フィルタ: 通常7日以内、高優先度は14日以内
    const maxDays = isHighPriority(launch) ? 14 : 7
    if (daysUntil > maxDays || daysUntil < -1) {
      continue
    }

    // ステータスチェック: Go or TBC（TBDは除外しない、一度作った記事は消さない）
    const status = launch.status?.name || ''

    // 既存の手動preview記事があればスキップ
    if (hasManualPreview(missionName)) {
      console.log(`  Skip (manual preview exists): ${missionName}`)
      continue
    }

    const slug = toSlug(missionName)

    // 既存のpreview JSONがあれば、日程更新のみ
    const existingPath = path.join(OUTPUT_DIR, `${slug}.json`)
    const existing = fs.existsSync(existingPath)
      ? JSON.parse(fs.readFileSync(existingPath, 'utf-8'))
      : null

    const rocketName = launch.rocket?.configuration?.name || ''
    const rocketJa = getRocketJa(rocketName)
    const padName = launch.pad?.name || ''
    const padLocation = launch.pad?.location?.name || ''
    const padJa = getPadJa(padName) || getPadJa(padLocation)
    const countryCode = launch.pad?.location?.country_code || ''
    const countryJa = getCountryJa(countryCode)
    const missionDesc = cleanDescription(launch.mission?.description)
    const missionType = launch.mission?.type || ''
    const orbit = launch.mission?.orbit?.name || ''
    const image = getRocketImage(rocketName)
    const jst = formatJST(launch.net)
    const vidURLs = (launch.vidURLs || []).map(v => ({ url: v.url, title: v.title }))

    const preview = {
      slug,
      launchId: launch.id,
      missionName,
      rocketName,
      rocketJa,
      padName: padJa || padName,
      padDetail: padName,
      padLocation,
      countryCode,
      countryJa,
      missionDescription: missionDesc,
      missionType,
      orbit,
      image,
      net: launch.net,
      status,
      tentative: launch.window_start !== launch.window_end,
      jst,
      vidURLs,
      provider: launch.launch_service_provider?.name || '',
      // メタ情報
      title: `【日本時間】${missionName} 打ち上げ予定｜${jst.dateStr} ${jst.timeStr} ${rocketJa}`,
      description: `${missionName}の打ち上げ予定を日本時間で解説。${rocketJa}ロケットで${padJa || padLocation}から打ち上げ。`,
      category: missionType.includes('Human') ? '有人宇宙飛行'
        : missionType.includes('Planetary') ? '火星探査'
        : orbit?.includes('Geostationary') ? '衛星・通信'
        : 'ロケット',
      generated: new Date().toISOString(),
      // 既存データがあれば初回生成日を保持
      firstGenerated: existing?.firstGenerated || new Date().toISOString(),
    }

    fs.writeFileSync(existingPath, JSON.stringify(preview, null, 2), 'utf-8')
    console.log(`  Generated: ${slug} (${missionName}, ${jst.full})`)
    generated.push(slug)
  }

  // index.jsonを生成（全preview一覧）
  const allPreviews = []
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    if (!file.endsWith('.json') || file === 'index.json') continue
    try {
      const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'))
      // 打ち上げ済みかチェック（1日以上過去なら除外）
      const net = new Date(data.net)
      if (net < new Date(now.getTime() - 24 * 3600000)) continue
      allPreviews.push({
        slug: data.slug,
        title: data.title,
        missionName: data.missionName,
        rocketName: data.rocketName,
        rocketJa: data.rocketJa,
        net: data.net,
        status: data.status,
        image: data.image,
        category: data.category,
      })
    } catch {}
  }

  allPreviews.sort((a, b) => new Date(a.net) - new Date(b.net))
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify({ updated: new Date().toISOString(), previews: allPreviews }, null, 2),
    'utf-8'
  )

  console.log(`\nDone. Generated/updated ${generated.length} preview articles.`)
  console.log(`Total active previews: ${allPreviews.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
