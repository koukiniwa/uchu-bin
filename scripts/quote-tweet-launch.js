#!/usr/bin/env node
// 打ち上げの公式ツイートを見つけて引用RTするスクリプト
// Usage: LAUNCH_ROCKET="Falcon 9" LAUNCH_PROVIDER="SpaceX" node scripts/quote-tweet-launch.js

const fs = require('fs')
const path = require('path')
const { TwitterApi } = require('twitter-api-v2')
const Anthropic = require('@anthropic-ai/sdk')

const POSTS_DIR = path.join(__dirname, '..', 'posts')
const SITE_URL = 'https://www.uchu-bin.jp'

// プロバイダー → Twitterハンドル
const PROVIDER_TWITTER = {
  'SpaceX': ['SpaceX'],
  'NASA': ['NASA'],
  'Rocket Lab': ['RocketLab'],
  'Blue Origin': ['blueorigin'],
  'United Launch Alliance': ['ulalaunch'],
  'Arianespace': ['Arianespace', 'ArianeGroup'],
  'Mitsubishi Heavy Industries': ['MHI_Group', 'JAXA_jp'],
  'JAXA': ['JAXA_jp'],
  'Firefly Aerospace': ['FireflySpace'],
  'Indian Space Research Organization': ['isaborgnew'],
  'Isar Aerospace': ['isaraerospace'],
}

// プロバイダー不明時の汎用宇宙ニュースアカウント
const FALLBACK_ACCOUNTS = ['SpaceflightNow', 'NASASpaceflight']

async function findArticleUrl() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.startsWith(today) && f.endsWith('.md'))
    .sort()
  if (files.length === 0) return null
  const slug = files[files.length - 1].replace(/\.md$/, '')
  return `${SITE_URL}/blog/${slug}`
}

async function main() {
  const rocket = process.env.LAUNCH_ROCKET || ''
  const provider = process.env.LAUNCH_PROVIDER || ''

  if (!rocket) {
    console.log('LAUNCH_ROCKET が未設定')
    return
  }

  const articleUrl = await findArticleUrl()
  if (!articleUrl) {
    console.log('本日の記事が見つかりません')
    return
  }

  console.log(`引用RT検索: ${rocket} (${provider})`)
  console.log(`記事URL: ${articleUrl}`)

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  })

  // 検索対象アカウント
  const handles = PROVIDER_TWITTER[provider] || FALLBACK_ACCOUNTS
  // ロケット名の短縮形（"Falcon 9 Block 5" → "Falcon 9"）
  const rocketWords = rocket.split(/\s+/)
  const rocketShort = rocketWords.length > 2
    ? rocketWords.slice(0, 2).join(' ')
    : rocket

  let foundTweet = null

  for (const handle of handles) {
    try {
      const query = `from:${handle} (${rocketShort}) -is:retweet`
      console.log(`  検索: ${query}`)

      const result = await client.v2.search(query, {
        max_results: 10,
        'tweet.fields': 'created_at,author_id',
        sort_order: 'recency',
      })

      const tweets = result.data?.data
      if (tweets && tweets.length > 0) {
        // 直近24時間以内のツイートのみ
        const recent = tweets.find(t => {
          const age = Date.now() - new Date(t.created_at).getTime()
          return age < 24 * 60 * 60 * 1000
        })
        if (recent) {
          foundTweet = { ...recent, handle }
          break
        }
      }
    } catch (e) {
      if (e.code === 403 || e.data?.status === 403) {
        console.log('  Twitter API: 検索権限なし（Basic tier以上が必要）')
        return
      }
      console.log(`  ${handle} 検索失敗: ${e.message}`)
    }
  }

  if (!foundTweet) {
    console.log('関連する公式ツイートが見つかりませんでした')
    return
  }

  console.log(`  発見: @${foundTweet.handle} "${foundTweet.text.slice(0, 60)}..."`)

  // 日本語コメント生成
  const anthropic = new Anthropic()
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `以下の英語ツイートを日本語の宇宙ニュースメディアとして引用リツイートします。簡潔なコメントを書いてください。

ツイート（@${foundTweet.handle}）: ${foundTweet.text}
ロケット: ${rocket}

条件:
- 英語の要点を日本語で伝える（翻訳ではなく要約）
- 報道する側の文体（「〜した」「〜を発表」）
- 60文字以内、1文
- 絵文字なし
- コメント文のみ返す`
    }]
  })

  const comment = res.content[0].text.trim().replace(/^["「]|["」]$/g, '')
  const tweetText = `${comment}\n\n${articleUrl}\n#宇宙便 #宇宙ニュース`

  console.log(`  コメント: ${comment}`)

  // 引用RT投稿
  await client.v2.tweet({
    text: tweetText,
    quote_tweet_id: foundTweet.id,
  })

  console.log('引用RT投稿完了')
}

main().catch(e => {
  console.error('引用RTエラー:', e.message)
})
