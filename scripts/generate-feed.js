const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const postsDir = path.join(__dirname, '../posts')
const baseUrl = 'https://uchu-bin.jp'

const posts = fs.readdirSync(postsDir)
  .filter(f => f.endsWith('.md') && !f.startsWith('~'))
  .map(f => {
    const content = fs.readFileSync(path.join(postsDir, f), 'utf8')
    const { data } = matter(content)
    return { slug: f.replace(/\.md$/, ''), ...data }
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 20)

const items = posts.map(post => `
  <item>
    <title><![CDATA[${post.title || ''}]]></title>
    <link>${baseUrl}/blog/${encodeURIComponent(post.slug)}</link>
    <guid>${baseUrl}/blog/${encodeURIComponent(post.slug)}</guid>
    <pubDate>${post.date ? new Date(post.date).toUTCString() : ''}</pubDate>
    <description><![CDATA[${post.description || ''}]]></description>
    <category>${post.category || '未分類'}</category>
  </item>`).join('')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>宇宙便 - 宇宙情報メディア</title>
    <link>${baseUrl}</link>
    <description>ロケット・衛星・宇宙開発の最新情報をいち早くお届け。</description>
    <language>ja</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

fs.writeFileSync(path.join(__dirname, '../public/feed.xml'), xml)
console.log(`feed.xml 生成完了 (${posts.length}件)`)
