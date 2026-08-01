const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { TwitterApi } = require('twitter-api-v2')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const SITE_URL = 'https://www.uchu-bin.jp'

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
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.startsWith(today) && f.endsWith('.md'))
    .sort()

  if (files.length === 0) {
    console.log('本日公開の記事が見つかりませんでした')
    return
  }

  const file = files[files.length - 1]
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
  const meta = parseFrontmatter(content)
  const slug = file.replace(/\.md$/, '')
  const title = meta.title || slug
  const url = `${SITE_URL}/blog/${slug}`

  // 記事タイトル + URL（AIコメント廃止）
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
}

main().catch(e => {
  console.error('ツイートエラー:', e.message)
  process.exit(1)
})
