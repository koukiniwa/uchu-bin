#!/usr/bin/env node
// ロケット図鑑データ生成スクリプト
// LL2 API から全打ち上げ履歴を一括取得し、ロケット別に統計を集計してJSONに保存
// Usage: node scripts/generate-rocket-stats.js

const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'rockets')
const POSTS_DIR = path.join(__dirname, '..', 'posts')

// 対象ロケット定義
const ROCKETS = [
  {
    slug: 'falcon-9',
    nameJa: 'ファルコン9',
    nameEn: 'Falcon 9',
    matchNames: ['falcon 9'],
    operator: 'SpaceX',
    country: 'US',
    image: '/images/library/falcon9_001.jpg',
    firstFlight: '2010-06-04',
    status: 'active',
    description: 'SpaceXが開発・運用する2段式ロケット。第1段の再使用により打ち上げコストを大幅に削減し、世界で最も頻繁に打ち上げられるロケットとなった。',
    specs: { height: '70m', diameter: '3.7m', stages: 2, liftoffMass: '549t', payloadLEO: '22.8t', payloadGTO: '8.3t' },
  },
  {
    slug: 'falcon-heavy',
    nameJa: 'ファルコンヘビー',
    nameEn: 'Falcon Heavy',
    matchNames: ['falcon heavy'],
    operator: 'SpaceX',
    country: 'US',
    image: '/images/library/falconheavy_001.jpg',
    firstFlight: '2018-02-06',
    status: 'active',
    description: 'Falcon 9のコアを3本束ねた大型ロケット。現役で運用中のロケットとしては最大級のペイロード能力を持つ。',
    specs: { height: '70m', diameter: '12.2m', stages: 2, liftoffMass: '1,421t', payloadLEO: '63.8t', payloadGTO: '26.7t' },
  },
  {
    slug: 'starship',
    nameJa: 'スターシップ',
    nameEn: 'Starship',
    matchNames: ['starship'],
    operator: 'SpaceX',
    country: 'US',
    image: '/images/library/starship_001.jpg',
    firstFlight: '2023-04-20',
    status: 'development',
    description: 'SpaceXが開発中の完全再使用型超大型ロケット。月・火星への有人飛行を目指し、人類史上最大のロケットとして開発が進む。',
    specs: { height: '121m', diameter: '9m', stages: 2, liftoffMass: '5,000t', payloadLEO: '150t+', payloadGTO: '-' },
  },
  {
    slug: 'electron',
    nameJa: 'エレクトロン',
    nameEn: 'Electron',
    matchNames: ['electron'],
    operator: 'Rocket Lab',
    country: 'NZ',
    image: '/images/library/electron_001.jpg',
    firstFlight: '2017-05-25',
    status: 'active',
    description: 'Rocket Labが開発した小型ロケット。電動ポンプ駆動のRutherfordエンジンを採用し、小型衛星市場で高い打ち上げ頻度を誇る。',
    specs: { height: '18m', diameter: '1.2m', stages: 2, liftoffMass: '12.5t', payloadLEO: '300kg', payloadGTO: '-' },
  },
  {
    slug: 'h3',
    nameJa: 'H3',
    nameEn: 'H3',
    matchNames: ['h3'],
    operator: 'JAXA / 三菱重工',
    country: 'JP',
    image: '/images/library/h3_001.jpg',
    firstFlight: '2023-03-07',
    status: 'active',
    description: '日本の次世代基幹ロケット。H-IIAの後継として開発され、打ち上げコスト半減と高い信頼性を両立。種子島宇宙センターから運用。',
    specs: { height: '57m', diameter: '5.2m', stages: 2, liftoffMass: '574t', payloadLEO: '-', payloadGTO: '6.5t+' },
  },
  {
    slug: 'ariane-6',
    nameJa: 'アリアン6',
    nameEn: 'Ariane 6',
    matchNames: ['ariane 62', 'ariane 64', 'ariane 6'],
    operator: 'Arianespace',
    country: 'EU',
    image: '/images/library/ariane6_001.jpg',
    firstFlight: '2024-07-09',
    status: 'active',
    description: '欧州の次世代大型ロケット。Ariane 5の後継として開発され、62型（SRB2基）と64型（SRB4基）の2構成で運用。',
    specs: { height: '56-62m', diameter: '5.4m', stages: 2, liftoffMass: '530-860t', payloadLEO: '10.3-21.6t', payloadGTO: '4.5-11.5t' },
  },
  {
    slug: 'soyuz',
    nameJa: 'ソユーズ',
    nameEn: 'Soyuz',
    matchNames: ['soyuz 2', 'soyuz-'],
    operator: 'Roscosmos',
    country: 'RU',
    image: '/images/library/soyuz_001.jpg',
    firstFlight: '1966-11-28',
    status: 'active',
    description: '世界で最も多く打ち上げられたロケットファミリー。60年以上の運用実績を持ち、有人飛行から衛星打ち上げまで幅広く使用される。',
    specs: { height: '46m', diameter: '2.95m', stages: 3, liftoffMass: '312t', payloadLEO: '8.2t', payloadGTO: '-' },
  },
  {
    slug: 'long-march',
    nameJa: '長征シリーズ',
    nameEn: 'Long March',
    matchNames: ['long march'],
    operator: 'CASC',
    country: 'CN',
    image: '/images/library/longmarch5_001.jpg',
    firstFlight: '1970-04-24',
    status: 'active',
    description: '中国の主力ロケットファミリー。長征2号から長征12号まで多数のバリエーションがあり、年間40回以上の打ち上げを実現。',
    specs: { height: '各型による', diameter: '各型による', stages: '2-3', liftoffMass: '各型による', payloadLEO: '最大25t(CZ-5)', payloadGTO: '最大14t(CZ-5)' },
  },
  {
    slug: 'vega',
    nameJa: 'ヴェガ',
    nameEn: 'Vega',
    matchNames: ['vega'],
    operator: 'Arianespace',
    country: 'EU',
    image: '/images/library/vegac_001.jpg',
    firstFlight: '2012-02-13',
    status: 'active',
    description: '欧州の小型ロケット。Vega-Cは改良型で、ペイロード能力を強化。小中型衛星の打ち上げに使用される。',
    specs: { height: '35m', diameter: '3.4m', stages: 4, liftoffMass: '210t', payloadLEO: '2.3t', payloadGTO: '-' },
  },
  {
    slug: 'vulcan',
    nameJa: 'ヴァルカン',
    nameEn: 'Vulcan Centaur',
    matchNames: ['vulcan'],
    operator: 'ULA',
    country: 'US',
    image: '/images/library/vulcan_001.jpg',
    firstFlight: '2024-01-08',
    status: 'active',
    description: 'ULAが開発したAtlas VとDelta IVの後継ロケット。BE-4エンジンを採用し、米国の国家安全保障ミッションの主力を担う。',
    specs: { height: '61.6m', diameter: '5.4m', stages: 2, liftoffMass: '546t', payloadLEO: '27.2t', payloadGTO: '14.4t' },
  },
  {
    slug: 'new-glenn',
    nameJa: 'ニューグレン',
    nameEn: 'New Glenn',
    matchNames: ['new glenn'],
    operator: 'Blue Origin',
    country: 'US',
    image: '/images/library/newglenn_001.jpg',
    firstFlight: '2025-01-13',
    status: 'active',
    description: 'Blue Originが開発した大型ロケット。BE-4エンジン7基で第1段を駆動し、第1段の着陸回収による再使用を目指す。',
    specs: { height: '98m', diameter: '7m', stages: 2, liftoffMass: '~590t', payloadLEO: '45t', payloadGTO: '13t' },
  },
  {
    slug: 'pslv',
    nameJa: 'PSLV',
    nameEn: 'PSLV',
    matchNames: ['pslv'],
    operator: 'ISRO',
    country: 'IN',
    image: '/images/library/pslv_001.jpg',
    firstFlight: '1993-09-20',
    status: 'active',
    description: 'インド宇宙研究機関（ISRO）の主力ロケット。高い信頼性で知られ、月探査機チャンドラヤーンや火星探査機マンガルヤーンも打ち上げた。',
    specs: { height: '44m', diameter: '2.8m', stages: 4, liftoffMass: '320t', payloadLEO: '3.8t', payloadGTO: '1.4t' },
  },
  {
    slug: 'gslv',
    nameJa: 'GSLV / LVM3',
    nameEn: 'GSLV / LVM3',
    matchNames: ['gslv', 'lvm'],
    operator: 'ISRO',
    country: 'IN',
    image: '/images/library/gslv_001.jpg',
    firstFlight: '2001-04-18',
    status: 'active',
    description: 'インドの大型ロケット。LVM3（旧GSLV Mk III）はチャンドラヤーン3号を月面に送り届けた実績を持つ。',
    specs: { height: '43m', diameter: '4m', stages: 3, liftoffMass: '640t', payloadLEO: '10t', payloadGTO: '4t' },
  },
  {
    slug: 'zhuque',
    nameJa: '朱雀',
    nameEn: 'Zhuque',
    matchNames: ['zhuque'],
    operator: 'LandSpace',
    country: 'CN',
    image: '/images/library/zhuque_001.jpg',
    firstFlight: '2023-07-12',
    status: 'active',
    description: 'LandSpace（藍箭航天）が開発した中国初のメタン燃料ロケット。朱雀2号は世界初のメタン燃料ロケットの軌道投入に成功。',
    specs: { height: '49.5m', diameter: '3.35m', stages: 2, liftoffMass: '219t', payloadLEO: '4t', payloadGTO: '-' },
  },
  {
    slug: 'kuaizhou',
    nameJa: '快舟',
    nameEn: 'Kuaizhou',
    matchNames: ['kuaizhou'],
    operator: 'ExPace',
    country: 'CN',
    image: '/images/library/kuaizhou_001.jpg',
    firstFlight: '2013-09-25',
    status: 'active',
    description: '中国の固体燃料ロケット。「快速」を意味する名前の通り、迅速な打ち上げ準備が特徴。小型衛星の打ち上げに使用される。',
    specs: { height: '20-25m', diameter: '1.4-2.2m', stages: 3, liftoffMass: '30-78t', payloadLEO: '200-1500kg', payloadGTO: '-' },
  },
]

async function fetchWithRetry(url, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'uchu-bin/1.0 (space news site)' },
        signal: AbortSignal.timeout(30000),
      })
      if (res.status === 429) {
        const wait = 15000 * attempt
        console.log(`  Rate limited, waiting ${wait / 1000}s... (attempt ${attempt}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      return res
    } catch (e) {
      console.error(`  Attempt ${attempt}/${retries}: ${e.message}`)
      if (attempt === retries) throw e
      await new Promise(r => setTimeout(r, 5000))
    }
  }
  return null
}

// LL2 APIから全打ち上げを一括取得（ページネーション）
async function fetchAllLaunches() {
  const allLaunches = []
  let url = 'https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=100&mode=list&ordering=-net'
  let page = 0

  while (url) {
    page++
    console.log(`Fetching page ${page}... (${allLaunches.length} launches so far)`)
    const res = await fetchWithRetry(url)
    if (!res || !res.ok) {
      console.error(`Failed to fetch page ${page}`)
      break
    }
    const data = await res.json()
    for (const l of data.results) {
      allLaunches.push({
        rocketName: (l.rocket?.configuration?.name || '').toLowerCase(),
        rocketNameRaw: l.rocket?.configuration?.name || '',
        name: l.name,
        net: l.net,
        statusName: l.status?.name || '',
        pad: l.pad?.location?.name || '',
        mission: l.mission?.name || '',
      })
    }
    url = data.next
    // 2010年以前はスキップ（古すぎるデータは不要）
    const oldest = data.results[data.results.length - 1]
    if (oldest && new Date(oldest.net).getFullYear() < 2010) {
      console.log(`  Reached 2010, stopping pagination`)
      break
    }
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`Total launches fetched: ${allLaunches.length}`)
  return allLaunches
}

// ロケット名マッチング
function matchRocket(rocketNameLower, rocket) {
  return rocket.matchNames.some(m => rocketNameLower.includes(m))
}

// 既存の宇宙便記事とのマッチング
function findRelatedArticles(rocket) {
  const articles = []
  try {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))
    const slugParts = rocket.slug.split('-')
    const matchTerms = rocket.matchNames.map(n => n.replace(/\s+/g, '-'))

    for (const file of files) {
      const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)
      if (!frontmatter) continue

      const fm = frontmatter[1]
      const titleMatch = fm.match(/title:\s*'([^']*)'/) || fm.match(/title:\s*"([^"]*)"/)
      const dateMatch = fm.match(/date:\s*'([^']*)'/) || fm.match(/date:\s*"([^"]*)"/)
      const title = titleMatch?.[1] || ''
      const date = dateMatch?.[1] || ''
      const slug = file.replace(/\.md$/, '')
      const fileLower = file.toLowerCase()
      const titleLower = title.toLowerCase()

      const matched = matchTerms.some(t => fileLower.includes(t)) ||
        rocket.matchNames.some(m => titleLower.includes(m))

      if (matched) {
        articles.push({ slug, title, date: date.slice(0, 10) })
      }
    }
  } catch {}
  return articles.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
}

// 年別統計を計算
function calcYearlyStats(launches) {
  const yearly = {}
  for (const l of launches) {
    const year = new Date(l.net).getFullYear()
    if (isNaN(year)) continue
    if (!yearly[year]) yearly[year] = { total: 0, success: 0, failure: 0 }
    yearly[year].total++
    const s = l.statusName.toLowerCase()
    if (s.includes('success')) yearly[year].success++
    else if (s.includes('failure') || s.includes('partial')) yearly[year].failure++
  }
  return yearly
}

// launches.jsonから次の打ち上げ予定を取得
function getUpcomingForRocket(rocket) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'launches.json'), 'utf-8'))
    return (data.launches || []).filter(l => {
      const name = (l.rocket || '').toLowerCase()
      return rocket.matchNames.some(m => name.includes(m))
    }).slice(0, 3)
  } catch { return [] }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // 全打ち上げデータを一括取得
  console.log('Fetching all launches from LL2 API...')
  const allLaunches = await fetchAllLaunches()

  const summaries = []

  for (const rocket of ROCKETS) {
    console.log(`\n--- ${rocket.nameJa} (${rocket.nameEn}) ---`)

    // このロケットに該当する打ち上げをフィルタ
    const launches = allLaunches.filter(l => matchRocket(l.rocketName, rocket))
    console.log(`  ${launches.length} launches matched`)

    // 統計
    const total = launches.length
    const success = launches.filter(l => l.statusName.toLowerCase().includes('success')).length
    const failure = launches.filter(l => {
      const s = l.statusName.toLowerCase()
      return s.includes('failure') || s.includes('partial')
    }).length
    const successRate = total > 0 ? Math.round((success / total) * 1000) / 10 : 0

    const yearlyStats = calcYearlyStats(launches)
    const currentYear = new Date().getFullYear()
    const thisYear = yearlyStats[currentYear] || { total: 0, success: 0, failure: 0 }

    // 直近の打ち上げ
    const recentLaunches = launches.slice(0, 20).map(l => ({
      date: l.net ? new Date(l.net).toISOString().slice(0, 10) : '',
      mission: l.mission || l.name?.split('|')[1]?.trim() || l.name || '',
      status: l.statusName.toLowerCase().includes('success') ? 'success'
        : (l.statusName.toLowerCase().includes('failure') || l.statusName.toLowerCase().includes('partial')) ? 'failure'
        : 'other',
      pad: l.pad,
    }))

    // 関連記事
    const articles = findRelatedArticles(rocket)
    console.log(`  ${articles.length} related articles`)

    // 次の打ち上げ
    const upcoming = getUpcomingForRocket(rocket)

    const rocketData = {
      slug: rocket.slug,
      nameJa: rocket.nameJa,
      nameEn: rocket.nameEn,
      operator: rocket.operator,
      country: rocket.country,
      image: rocket.image,
      firstFlight: rocket.firstFlight,
      status: rocket.status,
      description: rocket.description,
      specs: rocket.specs,
      stats: {
        total,
        success,
        failure,
        successRate,
        thisYear,
        yearlyStats,
      },
      recentLaunches,
      articles,
      upcoming,
      updated: new Date().toISOString(),
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${rocket.slug}.json`),
      JSON.stringify(rocketData, null, 2),
      'utf-8'
    )
    console.log(`  Saved ${rocket.slug}.json`)

    summaries.push({
      slug: rocket.slug,
      nameJa: rocket.nameJa,
      nameEn: rocket.nameEn,
      operator: rocket.operator,
      country: rocket.country,
      image: rocket.image,
      status: rocket.status,
      total,
      successRate,
      thisYear: thisYear.total,
      lastLaunch: recentLaunches[0]?.date || null,
    })
  }

  // 一覧データ
  const indexData = {
    updated: new Date().toISOString(),
    rockets: summaries,
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.json'),
    JSON.stringify(indexData, null, 2),
    'utf-8'
  )
  console.log(`\nSaved index.json with ${summaries.length} rockets`)
}

main().catch(e => { console.error(e); process.exit(1) })
