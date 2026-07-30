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
  '宇宙科学（天文学・物理学・観測衛星・望遠鏡など）': '#宇宙科学',
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
        content: `以下の宇宙ニュース記事のXポスト用の一言コメントを書け。

タイトル: ${title}
要約: ${description}
本文冒頭: ${lead}

ルール:
- 事実だけを短く伝える。1文、60文字以内
- 何が起きたかだけ書く。意義・展望・分析は一切不要
- 絵文字なし、コメント文のみ返す

絶対に使うな:
「加速する」「象徴する」「幕開け」「新時代」「注目される」「可能性がある」「浮かび上がる」「本格化」「拡充」「激化」「〜を意味する」「〜が期待される」

良い例:
「Starshipが初の衛星軌道投入に成功、ペイロード20基を放出した。」
「中国が通信試験衛星2機をまとめて打ち上げた。」
「Astroscaleが故障衛星へのドッキングに世界で初めて成功。」`
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
    ? `${comment}\n\n${url}`.trim()
    : `${title}\n\n${url}`.trim()

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
    // ライブラリ画像はローカルから直接読む
    if (meta.image.startsWith('/images/library/')) {
      const localPath = path.join(__dirname, '..', 'public', meta.image)
      if (fs.existsSync(localPath)) imagePath = localPath
    }
    // それ以外はVercelからダウンロード
    if (!imagePath) {
      const imageUrl = meta.image.startsWith('http') ? meta.image : `${SITE_URL}${meta.image}`
      imagePath = await downloadImageToTemp(imageUrl)
    }
    if (imagePath) {
      try {
        mediaId = await client.v1.uploadMedia(imagePath, { mimeType: 'image/jpeg' })
        console.log('  ✓ 画像アップロード完了')
        // ダウンロードしたtmpファイルのみ削除（ライブラリ画像は削除しない）
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
