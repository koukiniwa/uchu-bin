#!/usr/bin/env node
// 打ち上げ予告ツイート
// launches.jsonから6時間以内の打ち上げを検出し、予告ツイートを投稿する

const fs = require('fs')
const path = require('path')
const { TwitterApi } = require('twitter-api-v2')

const LAUNCHES_PATH = path.join(__dirname, '..', 'public', 'data', 'launches.json')
const PREVIEWED_PATH = path.join(__dirname, '..', 'public', 'data', 'tweeted-previews.json')
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'library')

const HOURS_BEFORE = 3 // 打ち上げ何時間前に予告するか

// ロケット名 → 画像ファイル（LaunchDashboard.jsと同じマッピング）
const ROCKET_IMAGES = {
  'starship': 'starship_001.jpg',
  'falcon 9': 'falcon9_001.jpg',
  'falcon heavy': 'falconheavy_001.jpg',
  'electron': 'electron_001.jpg',
  'h3': 'h3_001.jpg',
  'h-iia': 'h3_001.jpg',
  'new glenn': 'newglenn_001.jpg',
  'new shepard': 'newshepard_001.jpg',
  'vulcan': 'vulcan_001.jpg',
  'ariane 6': 'ariane6_001.jpg',
  'vega': 'vegac_001.jpg',
  'soyuz': 'soyuz_001.jpg',
  'proton': 'proton_001.jpg',
  'angara': 'angara_001.jpg',
  'long march 10': 'longmarch10_001.jpg',
  'long march 12': 'longmarch12_001.jpg',
  'long march 2': 'longmarch2_001.jpg',
  'long march 3': 'longmarch3_001.jpg',
  'long march 5': 'longmarch5_001.jpg',
  'long march 6': 'longmarch6_001.jpg',
  'long march 7': 'longmarch7_001.jpg',
  'long march 8': 'longmarch8_001.jpg',
  'long march': 'logo_cnsa_001.jpg',
  'kuaizhou': 'kuaizhou_001.jpg',
  'lijian': 'lijian_001.jpg',
  'ceres': 'ceres1_001.jpg',
  'kinetica': 'kinetica1_001.jpg',
  'gravity': 'gravity1_001.jpg',
  'zhuque': 'zhuque_001.jpg',
  'kairos': 'kairos_001.jpg',
  'epsilon': 'epsilon_001.jpg',
  'pslv': 'pslv_001.jpg',
  'gslv': 'gslv_001.jpg',
  'lvm3': 'lvm3_001.jpg',
  'sls': 'sls_001.jpg',
  'atlas': 'atlasv_001.jpg',
  'spectrum': 'spectrum_001.jpg',
  'firefly': 'fireflyalpha_001.jpg',
  'terran': 'terranr_001.jpg',
  'neutron': 'neutron_001.jpg',
  'nuri': 'nuri_001.jpg',
  'vikram': 'vikram1_001.jpg',
}

// 射場名を短縮
const PAD_SHORT = {
  'Kennedy Space Center': 'ケネディ宇宙センター（米国）',
  'Cape Canaveral': 'ケープカナベラル（米国）',
  'Vandenberg': 'ヴァンデンバーグ（米国）',
  'Boca Chica': 'スターベース（米国）',
  'Starbase': 'スターベース（米国）',
  'Wenchang': '文昌（中国）',
  'Jiuquan': '酒泉（中国）',
  'Taiyuan': '太原（中国）',
  'Xichang': '西昌（中国）',
  'Tanegashima': '種子島（日本）',
  'Uchinoura': '内之浦（日本）',
  'Mahia': 'マヒア半島（NZ）',
  'Sriharikota': 'サティッシュ・ダワン（インド）',
  'Kourou': 'クールー（仏領ギアナ）',
  'Plesetsk': 'プレセツク（ロシア）',
  'Baikonur': 'バイコヌール（カザフスタン）',
  'Vostochny': 'ボストチヌイ（ロシア）',
}

function shortenPad(pad) {
  for (const [key, val] of Object.entries(PAD_SHORT)) {
    if (pad.includes(key)) return val
  }
  return pad.split(',').pop().trim()
}

function getRocketImage(rocket) {
  const lower = rocket.toLowerCase()
  for (const [key, file] of Object.entries(ROCKET_IMAGES)) {
    if (lower.includes(key)) {
      const imgPath = path.join(IMAGES_DIR, file)
      if (fs.existsSync(imgPath)) return imgPath
    }
  }
  // フォールバック
  const fallback = path.join(IMAGES_DIR, 'rocketlaunch_001.jpg')
  return fs.existsSync(fallback) ? fallback : null
}

function getPreviewed() {
  try {
    return JSON.parse(fs.readFileSync(PREVIEWED_PATH, 'utf-8'))
  } catch {
    return { ids: [] }
  }
}

function savePreviewed(data) {
  const dir = path.dirname(PREVIEWED_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // 90日以上前のエントリを削除
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  data.ids = data.ids.filter(e => !e.at || new Date(e.at).getTime() > cutoff)
  fs.writeFileSync(PREVIEWED_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function formatJST(dateStr, timeStr) {
  if (!timeStr) return null
  const utc = new Date(`${dateStr}T${timeStr}:00Z`)
  return utc.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getRelativeDay(dateStr, timeStr) {
  const utc = new Date(`${dateStr}T${timeStr || '12:00'}:00Z`)
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayStr = now.toISOString().slice(0, 10)
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const launchStr = jst.toISOString().slice(0, 10)
  if (launchStr === todayStr) return '本日'
  if (launchStr === tomorrowStr) return '明日'
  return `${jst.getMonth() + 1}/${jst.getDate()}`
}

async function main() {
  // launches.json読み込み
  if (!fs.existsSync(LAUNCHES_PATH)) {
    console.log('launches.json が見つかりません')
    return
  }
  const { launches } = JSON.parse(fs.readFileSync(LAUNCHES_PATH, 'utf-8'))
  const previewed = getPreviewed()
  const now = Date.now()

  // 6時間以内に打ち上げ予定があるものを探す
  const upcoming = launches.filter(l => {
    if (!l.time || l.tentative) return false
    const launchTime = new Date(`${l.date}T${l.time}:00Z`).getTime()
    const hoursUntil = (launchTime - now) / (1000 * 60 * 60)
    return hoursUntil > 0 && hoursUntil <= HOURS_BEFORE
  })

  if (upcoming.length === 0) {
    console.log(`${HOURS_BEFORE}時間以内の打ち上げ予定なし`)
    return
  }

  // 未予告のものだけ
  const toTweet = upcoming.filter(l => !previewed.ids.some(p => p.id === l.id))

  if (toTweet.length === 0) {
    console.log('予告済み、スキップ')
    return
  }

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })

  for (const launch of toTweet) {
    const jstTime = formatJST(launch.date, launch.time)
    const relDay = getRelativeDay(launch.date, launch.time)
    const padShort = shortenPad(launch.pad || '')
    const mission = launch.mission && launch.mission !== 'Unknown Payload'
      ? `\nミッション: ${launch.mission}`
      : ''

    const text = `${relDay} ${jstTime} JST 打ち上げ予定

${launch.rocket}
📍 ${padShort}${mission}`.trim()

    console.log(`予告ツイート: ${launch.rocket}`)
    console.log(text)

    // 画像添付
    let mediaId = null
    const imgPath = getRocketImage(launch.rocket)
    if (imgPath) {
      try {
        mediaId = await client.v1.uploadMedia(imgPath, { mimeType: 'image/jpeg' })
        console.log('  画像添付:', path.basename(imgPath))
      } catch (e) {
        console.error('  画像アップロード失敗:', e.message)
      }
    }

    const tweetParams = mediaId
      ? { text, media: { media_ids: [mediaId] } }
      : text

    try {
      await client.v2.tweet(tweetParams)
      console.log('  投稿完了')
      previewed.ids.push({ id: launch.id, at: new Date().toISOString() })
    } catch (e) {
      console.error('  投稿失敗:', e.message)
    }
  }

  savePreviewed(previewed)
}

main().catch(e => {
  console.error('予告ツイートエラー:', e.message)
})
