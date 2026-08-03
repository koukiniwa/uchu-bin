import fs from 'fs'
import path from 'path'
import { getPostBySlug, getAllPosts } from '@/lib/posts'
import Link from 'next/link'
import Markdown from 'markdown-to-jsx'
import TweetEmbed from '@/app/TweetEmbed'
import TweetLoader from '@/app/TweetLoader'

const TWEET_REGEX = /^https?:\/\/(twitter\.com|x\.com)\/\S+\/status\/\d+/

function AutoTweet({ children }) {
  const text = typeof children === 'string' ? children.trim() : ''
  if (TWEET_REGEX.test(text)) {
    return <TweetEmbed url={text} />
  }
  return <p>{children}</p>
}

const PAD_SHORT = {
  'Kennedy': 'ケネディ宇宙センター', 'Cape Canaveral': 'ケープカナベラル',
  'Vandenberg': 'ヴァンデンバーグ', 'Starbase': 'スターベース',
  'Wenchang': '文昌', 'Jiuquan': '酒泉', 'Taiyuan': '太原',
  'Tanegashima': '種子島', 'Mahia': 'マヒア半島', 'Kourou': 'クールー',
  'Guiana': 'クールー', 'Baikonur': 'バイコヌール',
}

function NextLaunchBanner() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'launches.json'), 'utf-8'))
    const now = new Date()
    const next = (data.launches || []).find(l => {
      if (!l.time || l.tentative) return false
      const utc = new Date(l.date + 'T' + l.time + ':00Z')
      return utc > now
    })
    if (!next) return null
    const utc = new Date(next.date + 'T' + next.time + ':00Z')
    const jst = new Date(utc.getTime() + 9 * 3600000)
    const timeStr = `${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')} JST`
    let pad = next.pad || ''
    for (const [k, v] of Object.entries(PAD_SHORT)) { if (pad.includes(k)) { pad = v; break } }
    return (
      <div style={{ margin: '32px 0', padding: '16px 20px', background: 'linear-gradient(135deg, #0a0e1a, #1a2744)', borderRadius: '6px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
          🚀 次の打ち上げ予定
        </div>
        <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
          {next.rocket}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
          {timeStr} 📍 {pad}
        </div>
        <a href="/schedule" style={{ fontSize: '12px', color: '#4fc3f7', textDecoration: 'none', fontWeight: 600 }}>
          スケジュール一覧を見る →
        </a>
      </div>
    )
  } catch { return null }
}

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug)
  const url = `https://www.uchu-bin.jp/blog/${params.slug}`
  const baseUrl = 'https://www.uchu-bin.jp'
  const image = post.image ? `${baseUrl}${post.image}` : `${baseUrl}/icon-512.png`
  return {
    title: `${post.title} - 宇宙便`,
    description: post.description,
    keywords: ['宇宙便', post.category, 'ロケット', '宇宙ニュース', 'JAXA', 'NASA'],
    openGraph: {
      title: `${post.title} - 宇宙便`,
      description: post.description,
      url,
      siteName: '宇宙便',
      type: 'article',
      locale: 'ja_JP',
      publishedTime: post.date,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} - 宇宙便`,
      description: post.description,
      images: [image],
    },
  }
}

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug)
  const allPosts = getAllPosts()
  const currentSlug = decodeURIComponent(params.slug)
  const currentIndex = allPosts.findIndex(p => p.slug === currentSlug)
  const prevPost = allPosts[currentIndex + 1] || null
  const nextPost = allPosts[currentIndex - 1] || null
  const relatedPosts = allPosts
    .filter(p => p.slug !== currentSlug && p.category === post.category)
    .slice(0, 3)

  const baseUrl = 'https://www.uchu-bin.jp'
  const articleUrl = `${baseUrl}/blog/${params.slug}`
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: articleUrl,
    inLanguage: 'ja',
    articleSection: post.category,
    image: post.image
      ? [post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`]
      : [`${baseUrl}/icon-512.png`],
    author: {
      '@type': 'Organization',
      name: '宇宙便編集部',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: '宇宙便',
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <TweetLoader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* 戻るリンク */}
      <Link
        href="/"
        className="post-back"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: '#1a2744',
          textDecoration: 'none',
          marginBottom: '24px',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        ← 記事一覧へ
      </Link>

      {/* タイトルエリア */}
      <div style={{ marginBottom: '28px' }}>
        {/* カテゴリバッジ */}
        <div style={{ marginBottom: '14px' }}>
          <Link
            href={`/?category=${encodeURIComponent(post.category)}`}
            style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
              color: '#1565c0', padding: '3px 10px',
              border: '1px solid #1565c0', textDecoration: 'none',
            }}
          >
            {post.category}
          </Link>
        </div>

        {/* タイトル */}
        <h1 className="post-title" style={{
          fontSize: '28px', fontWeight: 800, color: '#111111',
          lineHeight: 1.6, margin: '0 0 16px 0',
        }}>
          {post.title}
        </h1>

        {/* 日付 */}
        <div style={{
          fontSize: '12px', color: '#999999',
          borderBottom: '1px solid #e0e0e0', paddingBottom: '20px',
        }}>
          {post.date}
        </div>
      </div>

      {/* ヒーロー画像 */}
      {post.image && (
        <div style={{ marginBottom: '40px' }}>
          <div className="post-hero-img" style={{ width: '100%', overflow: 'hidden', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
            <img
              src={post.image}
              alt={post.imageCaption || post.title}
              fetchPriority="high"
              style={{ maxWidth: '100%', maxHeight: '500px', width: 'auto', height: 'auto', display: 'inline-block' }}
            />
          </div>
          {(post.imageCaption || post.imageCredit) && (
            <div style={{ fontSize: '11px', color: '#999', marginTop: '6px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              {post.imageCaption && <span style={{ flex: 1 }}>{post.imageCaption}</span>}
              {post.imageCredit && <span style={{ whiteSpace: 'nowrap' }}>出典: {post.imageCredit}</span>}
            </div>
          )}
        </div>
      )}

      {/* 本文 */}
      <div className="post-body">
        <Markdown options={{ overrides: { p: AutoTweet } }}>{post.content}</Markdown>
      </div>

      {/* フッター */}
      <div style={{
        marginTop: '56px',
        paddingTop: '20px',
        borderTop: '1px solid #e0e0e0',
      }}>
        {/* Xシェアボタン */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title + ' - 宇宙便')}&url=${encodeURIComponent('https://www.uchu-bin.jp/blog/' + post.slug)}&hashtags=宇宙便,宇宙ニュース`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '10px 24px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            𝕏 でシェアする
          </a>
        </div>
        {/* 前後ナビゲーション */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            {nextPost && (
              <Link href={`/blog/${nextPost.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>← 新しい記事</div>
                <div style={{ fontSize: '13px', color: '#1a2744', fontWeight: 600, lineHeight: 1.5 }}>{nextPost.title}</div>
              </Link>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            {prevPost && (
              <Link href={`/blog/${prevPost.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>古い記事 →</div>
                <div style={{ fontSize: '13px', color: '#1a2744', fontWeight: 600, lineHeight: 1.5 }}>{prevPost.title}</div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 次の打ち上げ */}
      <NextLaunchBanner />

      {/* 関連記事 */}
      {relatedPosts.length > 0 && (
        <div style={{ marginTop: '48px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: '#555', marginBottom: '16px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
            関連記事
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {relatedPosts.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none', display: 'flex', gap: '14px', alignItems: 'center', padding: '12px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
                {p.image && (
                  <img src={p.image} alt={p.title} style={{ width: '80px', height: '56px', objectFit: 'cover', flexShrink: 0, borderRadius: '2px' }} />
                )}
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{p.date}</div>
                  <div style={{ fontSize: '14px', color: '#111', fontWeight: 600, lineHeight: 1.5 }}>{p.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
