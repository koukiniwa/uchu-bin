const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { TwitterApi } = require('twitter-api-v2')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const SITE_URL = 'https://www.uchu-bin.jp'
const TWEETED_FILE = path.join(__dirname, '..', 'public', 'data', 'tweeted-posts.json')

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const meta = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*['"]?(.*?)['"]?\s*$/)
    if (m) meta[m[1]] = m[2]
  }
  return meta
}

function loadTweeted() {
  try {
    return JSON.parse(fs.readFileSync(TWEETED_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveTweeted(list) {
  // 直近90日分だけ保持
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const trimmed = list.filter(entry => entry.date >= cutoff)
  fs.writeFileSync(TWEETED_FILE, JSON.stringify(trimmed, null, 2), 'utf-8')
}

async function downloadImageToTemp(imageUrl) {
  try {
    const tmpPath = path.join(require('os').tmpdir(), `tweet-image-${Date.now()}.jpg`)
    const protocol = imageUrl.startsWith('https') ? https : http
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tmpPath)
      protocol.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', reject)
    })
    return tmpPath
  } catch (e) {
    console.error('  画像ダウンロード失敗:', e.message)
    return null
  }
}

async function main() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const tweeted = loadTweeted()
  const tweetedSlugs = new Set(tweeted.map(t => t.slug))

  // 今日の記事で未ツイートのものを探す
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.startsWith(today) && f.endsWith('.md'))
    .filter(f => !tweetedSlugs.has(f.replace(/\.md$/, '')))
    .sort()

  if (files.length === 0) {
    console.log('未ツイートの本日記事はありません')
    return
  }

  // 未ツイートの中で最初の1件をツイート
  const file = files[0]
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
  const meta = parseFrontmatter(content)
  const slug = file.replace(/\.md$/, '')
  const title = meta.title || slug
  const url = `${SITE_URL}/blog/${slug}`

  // 記事タイトル + URL
  const text = `${title}\n${url}`

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })

  // カバー画像を添付
  let mediaId = null
  if (meta.image) {
    let imagePath = null
    if (meta.image.startsWith('/images/library/')) {
      const localPath = path.join(__dirname, '..', 'public', meta.image)
      if (fs.existsSync(localPath)) imagePath = localPath
    }
    if (!imagePath) {
      const imageUrl = meta.image.startsWith('http') ? meta.image : `${SITE_URL}${meta.image}`
      imagePath = await downloadImageToTemp(imageUrl)
    }
    if (imagePath) {
      try {
        mediaId = await client.v1.uploadMedia(imagePath, { mimeType: 'image/jpeg' })
        console.log('  ✓ 画像アップロード完了')
        if (imagePath.includes(require('os').tmpdir())) fs.unlinkSync(imagePath)
      } catch (e) {
        console.error('  画像アップロード失敗:', e.message)
        if (imagePath.includes(require('os').tmpdir())) try { fs.unlinkSync(imagePath) } catch {}
      }
    }
  }

  const tweetParams = mediaId
    ? { text, media: { media_ids: [mediaId] } }
    : text
  await client.v2.tweet(tweetParams)
  console.log('ツイート投稿完了:', text)

  // ツイート済みとして記録
  tweeted.push({ slug, date: today })
  saveTweeted(tweeted)
  console.log('ツイート済みリストに追加:', slug)
}

main().catch(e => {
  console.error('ツイートエラー:', e.message)
  process.exit(1)
})
