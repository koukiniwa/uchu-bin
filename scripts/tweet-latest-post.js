const fs = require('fs')
const path = require('path')
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

async function main() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) // YYYY-MM-DD
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

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })

  const text = `${title}\n${url}`
  await client.v2.tweet(text)
  console.log('ツイート投稿完了:', text)
}

main().catch(e => {
  console.error('ツイートエラー:', e.message)
  process.exit(1)
})
