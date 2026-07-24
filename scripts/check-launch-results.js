#!/usr/bin/env node
// 打ち上げ結果チェック → 記事自動生成スクリプト
// Launch Library 2 APIで最近完了した打ち上げを検出し、記事を生成する
// Usage: node scripts/check-launch-results.js

const fs = require('fs')
const path = require('path')

const REPORTED_PATH = path.join(__dirname, '..', 'public', 'data', 'reported-launches.json')
const POSTS_DIR = path.join(__dirname, '..', 'posts')
const LL2_PREVIOUS = 'https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=10&mode=normal'
const MIN_HOURS_AFTER_LAUNCH = 2  // 打ち上げ後2時間待つ（軌道投入確認に十分）

// 報告済みリスト読み込み
function getReported() {
  try {
    return JSON.parse(fs.readFileSync(REPORTED_PATH, 'utf-8'))
  } catch {
    return { launches: [] }
  }
}

function saveReported(data) {
  const dir = path.dirname(REPORTED_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(REPORTED_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// Starlink定期便を除外
function isNotable(launch) {
  const rocket = (launch.rocket?.configuration?.name || '').toLowerCase()
  const mission = (launch.mission?.name || launch.name || '').toLowerCase()
  if (rocket.includes('falcon 9') && mission.includes('starlink')) return false
  return true
}


async function main() {
  console.log('=== 打ち上げ結果チェック ===')

  // 直近の完了した打ち上げを取得
  const res = await fetch(LL2_PREVIOUS, {
    headers: { 'User-Agent': 'uchu-bin/1.0 (space news site)' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()

  const reported = getReported()
  const reportedIds = new Set(reported.launches.map(l => l.id))
  const now = Date.now()

  // 対象の打ち上げを検出
  let target = null
  for (const launch of data.results) {
    // Starlink除外
    if (!isNotable(launch)) continue

    // 既に報告済み
    if (reportedIds.has(launch.id)) {
      console.log(`  [済] ${launch.name}`)
      continue
    }

    // 打ち上げ時刻からの経過時間
    const launchTime = new Date(launch.net).getTime()
    const hoursElapsed = (now - launchTime) / (1000 * 60 * 60)

    // 3時間未満はまだ待つ
    if (hoursElapsed < MIN_HOURS_AFTER_LAUNCH) {
      console.log(`  [待機] ${launch.name} (${hoursElapsed.toFixed(1)}h経過、${MIN_HOURS_AFTER_LAUNCH}h後に記事化)`)
      continue
    }

    // 24時間以上前のものは古すぎるのでスキップ
    if (hoursElapsed > 24) {
      console.log(`  [古い] ${launch.name} (${hoursElapsed.toFixed(0)}h前)`)
      // 報告済みに追加して次回チェックをスキップ
      reported.launches.push({ id: launch.id, name: launch.name, skipped: true, date: new Date().toISOString() })
      continue
    }

    const status = launch.status?.name || 'Unknown'
    console.log(`  [新規] ${launch.name} - ${status} (${hoursElapsed.toFixed(1)}h前)`)
    target = launch
    break  // 1回の実行で1記事のみ
  }

  if (!target) {
    console.log('\n新しい打ち上げ結果はありません')
    saveReported(reported)
    return
  }

  // 打ち上げ記事は通常記事と独立して公開する（衝突チェックしない）

  // 記事生成の情報を GITHUB_OUTPUT に出力
  const status = target.status?.name || 'Unknown'
  const rocket = target.rocket?.configuration?.name || 'Unknown'
  const mission = target.mission?.name || ''
  const provider = target.launch_service_provider?.name || ''
  const pad = target.pad?.location?.name || ''
  const missionDesc = target.mission?.description || ''
  const launchDate = target.net ? new Date(target.net).toISOString() : ''

  // 打ち上げの規模を判定して分量を決める
  const rocketLow = rocket.toLowerCase()
  const statusLow = status.toLowerCase()
  let scale = 'medium' // デフォルト
  if (statusLow.includes('failure') || statusLow.includes('partial')) {
    scale = 'failure'
  } else if (rocketLow.includes('starship') || rocketLow.includes('sls') || rocketLow.includes('new glenn') || rocketLow.includes('long march 5') || rocketLow.includes('falcon heavy')) {
    scale = 'large'
  } else if (rocketLow.includes('electron') || rocketLow.includes('kairos') || rocketLow.includes('epsilon') || rocketLow.includes('kuaizhou') || rocketLow.includes('lijian') || rocketLow.includes('vikram') || rocketLow.includes('kinetica')) {
    scale = 'small'
  }
  // 初飛行は大型扱い
  const missionLow = (mission + ' ' + missionDesc).toLowerCase()
  if (missionLow.includes('maiden') || missionLow.includes('demo flight') || missionLow.includes('first flight') || missionLow.includes('初飛行') || missionLow.includes('inaugural')) {
    scale = 'large'
  }
  // ペイロード不明は最小扱い（初飛行・失敗を除く）
  const isUnknownPayload = !mission || mission === 'Unknown Payload' || mission.toLowerCase().includes('unknown')
  if (isUnknownPayload && scale !== 'large' && scale !== 'failure') {
    scale = 'unknown_payload'
  }

  const SCALE_CONFIG = {
    large:   { words: '2000〜2500', maxTokens: 3000, label: '大型/初飛行' },
    medium:  { words: '1200〜1800', maxTokens: 2200, label: '通常' },
    small:   { words: '800〜1200', maxTokens: 1600, label: '小型' },
    failure: { words: '1500〜2000', maxTokens: 2500, label: '失敗/異常' },
    unknown_payload: { words: '600〜800', maxTokens: 1200, label: 'ペイロード不明' },
  }
  const config = SCALE_CONFIG[scale]
  console.log(`  規模判定: ${config.label}（${config.words}文字）`)

  const articlePrompt = `以下のロケット打ち上げについて、宇宙ニュース記事を書いてください。

【打ち上げ情報】
- ロケット: ${rocket}
- ミッション: ${mission}
- 打ち上げ事業者: ${provider}
- 射場: ${pad}
- 打ち上げ日時(UTC): ${launchDate}
- 結果: ${status}
- ミッション概要: ${missionDesc}
- 規模: ${config.label}

【記事の書き方】
- 結果（成功/失敗）を最初に明記する
- ペイロード（衛星等）の目的を簡潔に説明する
- ロケットの基本スペック（全長・推力等）は不要。読者は宇宙ファンなので知っている
- 事実に基づき、推測や憶測は避ける
- 冗長な説明や水増しは厳禁
- **文字数: ${config.words}文字（これを超えてはいけない。短い方が良い）**
${isUnknownPayload ? `
【ペイロード不明時の注意】
- ペイロードが非公開・不明であることを明記する
- 不明なペイロードについて推測や捏造は絶対にしない
- ロケットの基本情報と打ち上げ結果を簡潔にまとめる
- 短い記事で構わない。水増ししない` : ''}`

  console.log(`\n記事生成対象: ${rocket} | ${mission} | ${status}`)

  // GITHUB_OUTPUT に出力（GitHub Actionsで使用）
  const outputFile = process.env.GITHUB_OUTPUT
  if (outputFile) {
    fs.appendFileSync(outputFile, `found=true\n`)
    fs.appendFileSync(outputFile, `rocket=${rocket}\n`)
    fs.appendFileSync(outputFile, `mission=${mission}\n`)
    fs.appendFileSync(outputFile, `status=${status}\n`)
    fs.appendFileSync(outputFile, `provider=${provider}\n`)
    fs.appendFileSync(outputFile, `pad=${pad}\n`)
    fs.appendFileSync(outputFile, `launch_date=${launchDate}\n`)
    fs.appendFileSync(outputFile, `mission_desc<<EOFMISSION\n${missionDesc}\nEOFMISSION\n`)
    fs.appendFileSync(outputFile, `article_prompt<<EOFPROMPT\n${articlePrompt}\nEOFPROMPT\n`)
    fs.appendFileSync(outputFile, `article_words=${config.words}\n`)
    fs.appendFileSync(outputFile, `article_max_tokens=${config.maxTokens}\n`)
  } else {
    // ローカルテスト用
    console.log('\n--- 記事プロンプト ---')
    console.log(articlePrompt.slice(0, 500) + '...')
  }

  // 報告済みに追加
  reported.launches.push({
    id: target.id,
    name: target.name,
    status,
    date: new Date().toISOString(),
  })
  // 古いエントリを削除（90日以上前）
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  reported.launches = reported.launches.filter(l => new Date(l.date).getTime() > cutoff)
  saveReported(reported)
  console.log('報告済みリストを更新しました')
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1) })
