// Google Indexing APIに記事URLを送信するスクリプト
// 使い方: node scripts/submit-to-google.js [slug]
// slug省略時は本日公開の記事を自動検出

const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const SITE_URL = 'https://www.uchu-bin.jp'
const KEY_FILE = path.join(__dirname, '..', 'google-service-account.json')

async function getAuthClient() {
  // 環境変数からキーを読む（GitHub Actions用）
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    })
    return await auth.getClient()
  }
  // ローカル用: JSONファイルから読む
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  })
  return await auth.getClient()
}

async function submitUrl(authClient, url) {
  const indexing = google.indexing({ version: 'v3', auth: authClient })
  try {
    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_UPDATED',
      },
    })
    console.log(`  送信成功: ${url}`)
    console.log(`  ステータス: ${res.status}`)
    return true
  } catch (e) {
    console.error(`  送信失敗: ${url}`)
    console.error(`  エラー: ${e.message}`)
    return false
  }
}

async function main() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !fs.existsSync(KEY_FILE)) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY環境変数またはgoogle-service-account.jsonが必要です')
    process.exit(1)
  }

  const authClient = await getAuthClient()

  // slugが指定された場合はそのURLを送信
  const slugArg = process.argv[2]
  if (slugArg) {
    const url = `${SITE_URL}/blog/${slugArg}`
    console.log(`Google Indexing APIに送信: ${url}`)
    await submitUrl(authClient, url)
    return
  }

  // slug省略時は本日公開の記事を自動検出
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.startsWith(today) && f.endsWith('.md'))
    .sort()

  if (files.length === 0) {
    console.log('本日公開の記事が見つかりませんでした')
    return
  }

  console.log(`本日公開の記事 ${files.length} 件を送信します`)
  for (const file of files) {
    const slug = file.replace(/\.md$/, '')
    const url = `${SITE_URL}/blog/${slug}`
    await submitUrl(authClient, url)
  }
}

main().catch(e => {
  console.error('エラー:', e.message)
  process.exit(1)
})
