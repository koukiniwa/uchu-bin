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

function parseRSS(xml) {
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
    if (title && link) items.push({ title, link, date })
  }
  return items
}

// Haikuで速報スコアを判定（1〜10）
async function scoreItem(item) {
  const prompt = `以下の宇宙ニュースの「速報重要度」を1〜10で採点してください。

【採点基準】
9〜10点: Falcon 9以外のロケット打ち上げ成功・失敗、着陸成功・失敗、有人ミッション異常、史上初の出来事、H3・Starship・New Glenn等の重大イベント
8〜9点: JAXA探査機の重大成果、日本人飛行士の搭乗・帰還、新型ロケット初飛行
7〜8点: Falcon 9以外の定期商業打ち上げ成功（Starlink以外）、宇宙政策の大きな変化
5〜6点: Falcon 9・Falcon Heavyの定期商業打ち上げ（Starlinkなど週複数回あるもの）
3〜4点: 契約締結・資金調達・人事・計画発表
1〜2点: 技術報告・審査・仕様変更・部品調達

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
  const BREAKING_THRESHOLD = 8
  const MAX_POSTS_PER_DAY = 1

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
      const items = parseRSS(xml)
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
    const score = await scoreItem(item)
    console.log(`  [${score}点] ${item.title}`)
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
