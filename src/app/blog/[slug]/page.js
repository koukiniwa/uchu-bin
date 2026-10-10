import fs from 'fs'
import path from 'path'
import { getPostBySlug, getAllPosts } from '@/lib/posts'
import Link from 'next/link'
import Markdown from 'markdown-to-jsx'
import TweetEmbed from '@/app/TweetEmbed'
import TweetLoader from '@/app/TweetLoader'

const TWEET_REGEX = /^https?:\/\/(twitter\.com|x\.com)\/\S+\/status\/\d+/

// 予定記事用: launches.jsonからミッション名で打ち上げデータを取得
function getLaunchByMission(slug) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'launches.json'), 'utf-8'))
    // slugからミッション名を推測（例: crew-13-launch-preview → crew-13）
    const slugParts = slug.replace(/.*?-preview-?/, '').replace(/-launch.*|falcon.*|electron.*|h3.*/g, '')
    // slugに含まれるミッション名でマッチ
    return (data.launches || []).find(l => {
      if (!l.mission) return false
      const mSlug = l.mission.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return slug.includes(mSlug) && mSlug.length >= 3
    })
  } catch { return null }
}

// UTC日時をJST表示用に変換
function formatLaunchJST(launch) {
  if (!launch || !launch.date) return null
  const hasTime = launch.time && !launch.tentative
  const utc = hasTime
    ? new Date(launch.date + 'T' + launch.time + ':00Z')
    : new Date(launch.date + 'T00:00:00Z')
  const jst = new Date(utc.getTime() + 9 * 3600000)
  const y = jst.getUTCFullYear()
  const m = jst.getUTCMonth() + 1
  const d = jst.getUTCDate()
  const dow = WEEKDAYS[new Date(Date.UTC(y, jst.getUTCMonth(), d)).getUTCDay()]
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const min = String(jst.getUTCMinutes()).padStart(2, '0')
  return {
    dateStr: `${y}年${m}月${d}日（${dow}）`,
    timeStr: hasTime ? `${h}:${min} JST` : '時刻未定',
    shortDate: `${m}月${d}日（${dow}）`,
    shortTime: hasTime ? `${h}:${min}` : '',
    pad: launch.pad || '',
    status: launch.status || '',
    tentative: launch.tentative,
  }
}

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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

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
    const jM = jst.getUTCMonth() + 1
    const jD = jst.getUTCDate()
    const dow = WEEKDAYS[new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())).getUTCDay()]
    const jH = String(jst.getUTCHours()).padStart(2, '0')
    const jMin = String(jst.getUTCMinutes()).padStart(2, '0')
    let pad = next.pad || ''
    for (const [k, v] of Object.entries(PAD_SHORT)) { if (pad.includes(k)) { pad = v; break } }
    return (
      <div style={{ margin: '32px 0', padding: '16px 20px', background: 'linear-gradient(135deg, #0a0e1a, #1a2744)', borderRadius: '8px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
          🚀 次の打ち上げ予定
        </div>
        <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
          {next.rocket}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{jM}月{jD}日（{dow}）</span>
          <span style={{ marginLeft: '6px' }}>{jH}:{jMin} JST</span>
          <span style={{ marginLeft: '8px' }}>📍 {pad}</span>
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

const ROCKET_KEYWORDS = [
  'Falcon 9', 'Falcon Heavy', 'Starship', 'Electron', 'H3', 'H-IIA',
  'Ariane 6', 'Ariane 5', 'Soyuz', 'Long March', 'Vega', 'PSLV', 'GSLV',
  'Vulcan', 'New Glenn', 'Atlas V', 'Delta IV', 'Epsilon', 'Zhuque',
  'Kuaizhou', 'Gravity-1', 'Kinetica', 'Neutron', 'Firefly',
]

function extractRocketKeywords(title) {
  const lower = title.toLowerCase()
  return ROCKET_KEYWORDS.filter(r => lower.includes(r.toLowerCase()))
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug)
  const url = `https://www.uchu-bin.jp/blog/${params.slug}`
  const baseUrl = 'https://www.uchu-bin.jp'
  const image = post.image ? `${baseUrl}${post.image}` : `${baseUrl}/icon-512.png`
  const rocketKw = extractRocketKeywords(post.title)
  const keywords = ['宇宙便', post.category, ...rocketKw, 'ロケット', '打ち上げ', '宇宙ニュース'].filter((v, i, a) => a.indexOf(v) === i)
  // preview記事: タイトルに最新日時を動的に入れる
  let title = post.title
  if (post.type === 'preview') {
    const ld = getLaunchByMission(decodeURIComponent(params.slug))
    if (ld) {
      const lj = formatLaunchJST(ld)
      if (lj) title = title.replace(/\d+月\d+日\s*\d+:\d+/, `${lj.shortDate.replace('（', ' ').replace('）', '')} ${lj.timeStr.replace(' JST', '')}`)
    }
  }
  return {
    title: `${title} - 宇宙便`,
    description: post.description,
    keywords,
    openGraph: {
      title: `${title} - 宇宙便`,
      description: post.description,
      url,
      siteName: '宇宙便',
      type: 'article',
      locale: 'ja_JP',
      publishedTime: post.date,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - 宇宙便`,
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

  // 予定記事: launches.jsonから最新の日時を取得
  const launchData = post.type === 'preview' ? getLaunchByMission(currentSlug) : null
  const launchJST = launchData ? formatLaunchJST(launchData) : null

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

      {/* 予定記事バナー */}
      {post.type === 'preview' && (
        <div style={{
          margin: '0 0 20px 0', padding: '16px 18px',
          background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
          borderRadius: '8px', borderLeft: '4px solid #1565c0',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0d47a1', marginBottom: '6px' }}>
            打ち上げ予定の解説記事
          </div>
          {launchJST ? (
            <div style={{ fontSize: '13px', color: '#0d47a1', marginBottom: '4px' }}>
              <strong>最新の予定: {launchJST.shortDate} {launchJST.timeStr}</strong>
              {launchJST.status === 'Go' && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#2e7d32', fontWeight: 700 }}>✅ 確定</span>}
              {launchJST.tentative && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#e65100', fontWeight: 700 }}>⏳ 暫定</span>}
            </div>
          ) : null}
          <div style={{ fontSize: '12px', color: '#1565c0' }}>
            日時は変更される可能性があります。最新情報は打ち上げスケジュールで自動更新されます。
          </div>
        </div>
      )}

      {/* タイトルエリア */}
      <div style={{ marginBottom: '28px' }}>
        {/* カテゴリバッジ */}
        <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          {post.type === 'preview' && (
            <span style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
              color: '#e65100', padding: '3px 10px',
              border: '1px solid #e65100', borderRadius: '2px',
            }}>
              打ち上げ予定
            </span>
          )}
        </div>

        {/* タイトル（preview記事は動的日時を反映） */}
        <h1 className="post-title" style={{
          fontSize: '28px', fontWeight: 800, color: '#111111',
          lineHeight: 1.6, margin: '0 0 16px 0',
        }}>
          {post.type === 'preview' && launchJST
            ? post.title.replace(/\d+月\d+日\s*\d+:\d+/, `${launchJST.shortDate.replace('（', ' ').replace('）', '')} ${launchJST.timeStr.replace(' JST', '')}`)
            : post.title}
        </h1>

        {/* 日付（preview記事は打ち上げ予定日を表示） */}
        <div style={{
          fontSize: '12px', color: '#999999',
          borderBottom: '1px solid #e0e0e0', paddingBottom: '20px',
        }}>
          {post.type === 'preview' && launchJST
            ? `打ち上げ予定: ${launchJST.dateStr} ${launchJST.timeStr}`
            : (() => {
                if (!post.date) return ''
                const d = new Date(post.date)
                if (isNaN(d)) return post.date.slice(0, 10)
                return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`
              })()}
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
        marginTop: '24px',
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

      {/* 次の打ち上げ（予定記事では非表示） */}
      {post.type !== 'preview' && <NextLaunchBanner />}

      {/* サイト回遊セクション */}
      <div style={{
        margin: '32px 0', display: 'grid', gap: '10px',
      }} className="site-links-grid">
        <a href="/schedule" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none', transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>📅</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>打ち上げスケジュール</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>世界中の打ち上げ予定を一覧で確認</div>
          </div>
        </a>
        <a href="/featured" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none', transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>⭐</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>注目の打ち上げ</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>見逃せないミッションを厳選紹介</div>
          </div>
        </a>
        <a href="/rockets" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none', transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>🚀</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>ロケット図鑑</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>成功率・スペック・打ち上げ履歴を比較</div>
          </div>
        </a>
      </div>

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
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{(() => {
                    if (!p.date) return ''
                    const d = new Date(p.date)
                    if (isNaN(d)) return p.date.slice(0, 10)
                    return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
                  })()}</div>
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
