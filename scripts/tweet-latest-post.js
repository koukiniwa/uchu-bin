const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { TwitterApi } = require('twitter-api-v2')
const Anthropic = require('@anthropic-ai/sdk')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const SITE_URL = 'https://www.uchu-bin.jp'

const CATEGORY_HASHTAGS = {
  'ロケット': '#ロケット',
  '衛星・通信': '#人工衛星',
  '有人宇宙飛行': '#有人宇宙飛行',
  '月探査': '#月探査',
  '火星探査': '#火星探査',
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

async function generateComment(title, description, body) {
  try {
    const client = new Anthropic()
    const lead = body.replace(/^---[\s\S]*?---\n/, '').replace(/#+\s.+/g, '').replace(/!\[.*?\]\(.*?\)/g, '').trim().slice(0, 300)
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `以下の宇宙ニュース記事について、Twitterに投稿する短いコメントを書いてください。

タイトル: ${title}
要約: ${description}
本文冒頭: ${lead}

条件:
- タイトルをそのまま繰り返さない
- なぜ重要か・何が驚きか・どんな意味があるかを自分の言葉で
- 1〜2文、80文字以内
- 自然な日本語（硬すぎず崩しすぎず）
- 絵文字なし
- コメント文のみ返す`
      }]
    })
    return res.content[0].text.trim()
  } catch {
    return null
  }
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
  const categoryTag = CATEGORY_HASHTAGS[meta.category] || ''

  const comment = await generateComment(title, meta.description || '', content)
  const text = comment
    ? `${comment}\n\n${url}\n#宇宙便 #宇宙ニュース ${categoryTag}`.trim()
    : `${title}\n\n${url}\n#宇宙便 #宇宙ニュース ${categoryTag}`.trim()

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })

  // カバー画像を添付
  let mediaId = null
  if (meta.image) {
    const imageUrl = meta.image.startsWith('http') ? meta.image : `${SITE_URL}${meta.image}`
    const tmpPath = await downloadImageToTemp(imageUrl)
    if (tmpPath) {
      try {
        mediaId = await client.v1.uploadMedia(tmpPath, { mimeType: 'image/jpeg' })
        console.log('  ✓ 画像アップロード完了')
        fs.unlinkSync(tmpPath)
      } catch (e) {
        console.error('  画像アップロード失敗:', e.message)
        try { fs.unlinkSync(tmpPath) } catch {}
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
