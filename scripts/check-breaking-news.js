// 速報チェックスクリプト
// 直近6時間以内の新着ニュースをスコアリングし、閾値以上なら GITHUB_OUTPUT に出力する

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const postsDir = path.join(__dirname, '../posts')

// 既存記事のソースURLを収集（重複投稿防止）
function getPostedSourceUrls() {
  const urls = new Set()
  try {
    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(postsDir, file), 'utf-8')
      const matches = content.matchAll(/^- (https?:\/\/.+)$/gm)
      for (const m of matches) urls.add(m[1].trim())
    }
  } catch {}
  return urls
}

// 当日JST内に既に投稿された記事数を確認
function postedTodayCount() {
  const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  try {
    return fs.readdirSync(postsDir).filter(f => f.startsWith(jstDate) && f.endsWith('.md')).length
  } catch { return 0 }
}

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UchuBin/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function parseRSS(xml, label) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const get = tag => block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))?.[1]?.trim()
    const title = get('title')
    const link = get('link')
    const pubDate = get('pubDate')
    const date = pubDate ? new Date(pubDate) : new Date(0)
    if (title && link) items.push({ title, link, date, label })
  }
  return items
}

// 同じトピックを何ソースが報じているか数える
function countSourceCoverage(item, allItems) {
  const words = item.title.toLowerCase()
    .split(/[\s\-\/\|「」【】（）()]+/)
    .filter(w => w.length > 3)
  const coveringSources = new Set()
  for (const other of allItems) {
    if (other.link === item.link) continue
    const otherWords = other.title.toLowerCase().split(/[\s\-\/\|「」【】（）()]+/)
    const overlap = words.filter(w => otherWords.includes(w)).length
    if (overlap >= 2) coveringSources.add(other.label)
  }
  return coveringSources.size
}

// Haikuで速報スコアを判定（1〜10）
async function scoreItem(item) {
  const prompt = `以下の宇宙ニュースの「速報重要度」を1〜10で採点してください。

【最重要ルール】
「実際に起きた完了した出来事」のみ高スコア。「予告・募集・計画・発表」は低スコア。

【高スコア（7点以上）の条件 ― 必ず過去形・完了形であること】
10点: H3・Starship・New Glenn等の打ち上げ成功または失敗、月面・火星着陸の成功または失敗、有人宇宙船の事故・緊急事態、史上初の出来事
9点: JAXA探査機の重大成果、日本人飛行士の搭乗完了・帰還完了、新型ロケットの初飛行成功または失敗
8点: Falcon 9以外のロケット打ち上げ成功（定期商業打ち上げ含む）
7点: Falcon 9の打ち上げ成功（Starlink以外）、宇宙政策の重大決定

【低スコア（6点以下）― 以下に該当するものは必ず低スコア】
5〜6点: Falcon 9・Starlinkの定期打ち上げ（週複数回あるルーティン）
3〜4点: 契約締結・資金調達・人事・スケジュール変更・打ち上げ延期
2〜3点: イベント告知・参加者募集・NASA Social・プレスイベント・見学会
1〜2点: 技術報告・審査通過・仕様変更・部品調達・研究発表

ニュースタイトル: ${item.title}
URL: ${item.link}

整数1つだけ返してください（説明不要）:`

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{ role: 'user', content: prompt }],
    })
    const score = parseInt(res.content[0].text.trim(), 10)
    return isNaN(score) ? 0 : score
  } catch {
    return 0
  }
}

function setOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT
  if (outputFile) {
    fs.appendFileSync(outputFile, `${key}<<EOF\n${value}\nEOF\n`)
  } else {
    console.log(`[OUTPUT] ${key}=${value}`)
  }
}

async function main() {
  const BREAKING_THRESHOLD = 9
  const MAX_POSTS_PER_DAY = 1

  // 投稿可能時間チェック（JST 7:00〜22:00のみ）
  const jstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours()
  if (jstHour < 7 || jstHour >= 22) {
    console.log(`夜間のためスキップ（現在JST ${jstHour}時）`)
    setOutput('breaking', 'false')
    return
  }

  const todayCount = postedTodayCount()
  if (todayCount >= MAX_POSTS_PER_DAY) {
    console.log(`本日すでに${todayCount}件投稿済み。上限に達したためスキップ。`)
    setOutput('breaking', 'false')
    return
  }

  const postedUrls = getPostedSourceUrls()

  const RSS_FEEDS = [
    { url: 'https://www.jaxa.jp/rss/press.rss', label: 'JAXA' },
    { url: 'https://sorae.info/feed', label: 'sorae.info' },
    { url: 'https://spacenews.com/tag/japan/feed/', label: 'SpaceNews Japan' },
    { url: 'https://www.nasaspaceflight.com/feed/', label: 'NASASpaceFlight' },
    { url: 'https://feeds.arstechnica.com/arstechnica/space', label: 'Ars Technica' },
    { url: 'https://spaceflightnow.com/feed/', label: 'SpaceFlightNow' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', label: 'NASA' },
    { url: 'https://spacenews.com/feed/', label: 'SpaceNews' },
  ]

  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const freshItems = []

  for (const { url, label } of RSS_FEEDS) {
    try {
      const xml = await fetchUrl(url)
      const items = parseRSS(xml, label)
      const fresh = items.filter(i => i.date > cutoff && !postedUrls.has(i.link))
      console.log(`  ${label}: ${fresh.length}件の新着`)
      freshItems.push(...fresh)
    } catch (e) {
      console.error(`  ${label}: 取得失敗 (${e.message})`)
    }
  }

  if (freshItems.length === 0) {
    console.log('新着ニュースなし。')
    setOutput('breaking', 'false')
    return
  }

  // 重複URLを除去して新着順
  const seen = new Set()
  const unique = freshItems
    .filter(i => { if (seen.has(i.link)) return false; seen.add(i.link); return true })
    .sort((a, b) => b.date - a.date)
    .slice(0, 15)

  console.log(`\n${unique.length}件をスコアリング中...`)

  let topItem = null
  let topScore = 0

  for (const item of unique) {
    const baseScore = await scoreItem(item)
    const sourceCoverage = countSourceCoverage(item, freshItems)
    const bonus = sourceCoverage >= 2 ? 2 : sourceCoverage >= 1 ? 1 : 0
    const score = Math.min(10, baseScore + bonus)
    const bonusStr = bonus > 0 ? ` +${bonus}(${sourceCoverage}ソース)` : ''
    console.log(`  [${score}点${bonusStr}] ${item.title}`)
    if (score > topScore) {
      topScore = score
      topItem = item
    }
  }

  if (topScore >= BREAKING_THRESHOLD && topItem) {
    console.log(`\n速報検知！ [${topScore}点] ${topItem.title}`)
    setOutput('breaking', 'true')
    setOutput('topic', `${topItem.title}\nURL: ${topItem.link}`)
    setOutput('score', String(topScore))
  } else {
    console.log(`\n速報なし（最高スコア: ${topScore}点）`)
    setOutput('breaking', 'false')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
