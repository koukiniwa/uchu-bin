const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { TwitterApi } = require('twitter-api-v2')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const SITE_URL = 'https://www.uchu-bin.jp'

const CATEGORY_HASHTAGS = {
  'ロケット': '#ロケット #宇宙開発',
  '衛星・通信': '#人工衛星 #宇宙開発',
  '有人宇宙飛行': '#有人宇宙飛行 #宇宙開発',
  '月探査': '#月探査 #宇宙開発',
  '火星探査': '#火星探査 #宇宙開発',
}

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

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
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
  const hashtags = CATEGORY_HASHTAGS[meta.category] || '#宇宙開発'

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })

  const text = `【新着記事】${title}\n\n${url}\n\n#宇宙 ${hashtags}`

  // 画像添付
  let mediaId
  if (meta.image) {
    try {
      let imageBuffer
      if (meta.image.startsWith('http')) {
        imageBuffer = await downloadImage(meta.image)
      } else {
        const localPath = path.join(__dirname, '..', 'public', meta.image)
        if (fs.existsSync(localPath)) imageBuffer = fs.readFileSync(localPath)
      }
      if (imageBuffer) {
        mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/jpeg' })
        console.log('画像アップロード完了:', mediaId)
      }
    } catch (e) {
      console.warn('画像アップロード失敗（テキストのみで投稿）:', e.message)
    }
  }

  const tweetParams = mediaId ? { media: { media_ids: [mediaId] } } : {}
  await client.v2.tweet(text, tweetParams)
  console.log('ツイート投稿完了:', text)
}

main().catch(e => {
  console.error('ツイートエラー:', e.message)
  process.exit(1)
})
