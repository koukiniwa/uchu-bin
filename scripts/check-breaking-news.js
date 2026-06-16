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

// ライブラリ画像が存在するか確認
function hasLibraryImage(title) {
  const libraryDir = path.join(__dirname, '../public/images/library')
  const KEYWORDS = {
    h3: ['h3ロケット', 'h3 rocket', 'h3号機', 'h-3', 'h3-'],
    kairos: ['kairos', 'カイロス', 'インターステラ', 'interstellar'],
    epsilon: ['イプシロン', 'epsilon'],
    slim: ['slim', 'スリム'],
    hakutor: ['hakuto', 'ハクト', 'ispace'],
    starship: ['starship', 'スターシップ'],
    falcon9: ['falcon 9', 'falcon9', 'ファルコン9'],
    falconheavy: ['falcon heavy', 'ファルコンヘビー'],
    newglenn: ['new glenn', 'ニューグレン'],
    sls: ['sls', 'space launch system'],
    electron: ['electron', 'エレクトロン', 'rocket lab'],
    neutron: ['neutron', 'ニュートロン'],
    ariane6: ['ariane 6', 'ariane6', 'アリアン6'],
    vulcan: ['vulcan', 'ヴァルカン'],
    nuri: ['nuri', 'ヌリ', 'kslv'],
    starlab: ['starlab', 'スターラボ'],
    tiangong: ['天宮', 'tiangong', 'css'],
    iss: ['国際宇宙ステーション', 'iss ', 'きぼう'],
    moon: ['月面', '月着陸', 'lunar landing'],
    mars: ['火星着陸', 'mars landing'],
    jwst: ['ジェームズウェッブ', 'james webb', 'jwst'],
    blackhole: ['ブラックホール', 'black hole'],
  }
  const t = title.toLowerCase()
  try {
    const files = fs.readdirSync(libraryDir)
    for (const [key, words] of Object.entries(KEYWORDS)) {
      if (words.some(w => t.includes(w.toLowerCase()))) {
        if (files.some(f => f.startsWith(key + '_'))) return true
      }
    }
  } catch {}
  return false
}

// 日本関連ニュースか判定
function isJapanRelated(title) {
  const t = title.toLowerCase()
  const keywords = ['h3', 'jaxa', 'kairos', 'カイロス', 'slim', 'スリム', 'はやぶさ', 'hayabusa',
    'ispace', 'インターステラ', '宇宙航空', '日本', 'japan', 'japanese', 'mmx', 'hakuto',
    'epsilon', 'イプシロン', '飛行士', '野口', '若田', '古川', '星出', '油井', '金井', '堀川']
  return keywords.some(k => t.includes(k))
}

// Haikuで速報スコアを判定（1〜10）
async function scoreItem(item) {
  const prompt = `以下の宇宙ニュースの「速報重要度」を1〜10で採点してください。

【最重要ルール】「実際に起きた完了した出来事」のみ高スコア。「予告・募集・計画・発表」は低スコア。

【採点基準 ― 必ず過去形・完了形の出来事であること】
10点: H3・KAIROS・SLIM等の日本ロケット・探査機の打ち上げ/着陸成功または失敗、日本人飛行士の搭乗/帰還
9点: Starship・New Glenn・SLS等の米国大型ロケット打ち上げ成功/失敗、月面・火星着陸成功/失敗、有人宇宙船事故
8点: Ariane 6・Long March等の欧州・中国主要ロケット打ち上げ成功/失敗、JAXA探査機の重大成果
7点: Electron等小型ロケット、Falcon 9の非Starlink打ち上げ成功/失敗
5〜6点: Falcon 9 Starlinkの定期打ち上げ（週複数回あるルーティン）
3〜4点: 契約締結・資金調達・人事・スケジュール変更・打ち上げ延期・予定発表
2〜3点: イベント告知・参加者募集・NASA Social・プレスイベント・見学会・広報活動
1〜2点: 技術報告・審査通過・仕様変更・部品調達

【特別ルール】純粋な宇宙科学研究（ブラックホール・暗黒物質・重力波観測・理論物理・素粒子等）は最大4点

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
    const sourceBonus = sourceCoverage >= 2 ? 2 : sourceCoverage >= 1 ? 1 : 0
    const japanBonus = isJapanRelated(item.title) ? 2 : 0
    const imageBonus = hasLibraryImage(item.title) ? 1 : 0
    const score = Math.min(10, baseScore + sourceBonus + japanBonus + imageBonus)
    const details = [
      sourceBonus > 0 ? `+${sourceBonus}ソース` : '',
      japanBonus > 0 ? '+2日本' : '',
      imageBonus > 0 ? '+1画像' : '',
    ].filter(Boolean).join(' ')
    console.log(`  [${score}点${details ? ` (${details})` : ''}] ${item.title}`)
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
