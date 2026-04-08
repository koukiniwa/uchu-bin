'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function HeroCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
      <article style={{
        position: 'relative',
        height: '460px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid #1e2a3a',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(79,195,247,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a3a'}
      >
        {/* 背景画像 */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#0f1629' }}>
          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              fetchPriority="high"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
            />
          )}
        </div>

        {/* グラデーションオーバーレイ */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(5,8,20,0.97) 0%, rgba(5,8,20,0.5) 45%, rgba(5,8,20,0.05) 100%)',
        }} />

        {/* LATEST バッジ（右上） */}
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#4fc3f7',
            padding: '4px 10px',
            border: '1px solid rgba(79,195,247,0.5)',
            backgroundColor: 'rgba(5,8,20,0.6)',
          }}>
            LATEST
          </span>
        </div>

        {/* テキストオーバーレイ（下部） */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '32px 36px',
        }}>
          <div style={{ marginBottom: '14px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#4fc3f7',
              padding: '3px 10px',
              border: '1px solid rgba(79,195,247,0.6)',
              backgroundColor: 'rgba(5,8,20,0.5)',
            }}>
              {post.category}
            </span>
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.5,
            margin: '0 0 14px 0',
            maxWidth: '720px',
          }}>
            {post.title}
          </h2>

          {post.description && (
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.65)',
              margin: '0 0 18px 0',
              lineHeight: 1.75,
              maxWidth: '620px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {post.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{post.date}</span>
            <span style={{ fontSize: '13px', color: '#4fc3f7', fontWeight: 600, letterSpacing: '0.04em' }}>
              続きを読む →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

function ArticleCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex' }}>
      <article
        className="mil-card"
        style={{
          width: '100%',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          border: '1px solid #e8e8e8',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {/* 画像エリア */}
        <div style={{ position: 'relative', height: '180px', backgroundColor: '#1a2744', flexShrink: 0 }}>
          {post.image ? (
            <img
              src={post.image}
              alt={post.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f1629 0%, #1a2744 100%)' }} />
          )}
          {/* カテゴリバッジ */}
          <span style={{
            position: 'absolute', top: '10px', left: '10px',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            color: '#fff', padding: '3px 8px',
            backgroundColor: '#1565c0',
          }}>
            {post.category}
          </span>
        </div>

        {/* テキストエリア */}
        <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h2 style={{
            fontSize: '14px', fontWeight: 700, color: '#111111',
            lineHeight: 1.6, margin: '0 0 8px 0',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {post.title}
          </h2>
          {post.description && (
            <p style={{
              fontSize: '12px', color: '#666666', margin: '0 0 10px 0',
              lineHeight: 1.65, flex: 1,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {post.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: '11px', color: '#aaaaaa' }}>{post.date}</span>
            <span style={{ fontSize: '11px', color: '#1565c0', fontWeight: 600 }}>続きを読む →</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function CategoryFilter({ posts }) {
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  const filtered = (!activeCategory || activeCategory === 'ニュース')
    ? posts
    : posts.filter(p => p.category === activeCategory)

  const heroPost = filtered[0]
  const restPosts = filtered.slice(1)

  return (
    <div>
      {/* セクションヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '2px solid #111111',
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#111111',
          letterSpacing: '0.06em',
        }}>
          {(!activeCategory || activeCategory === 'ニュース') ? 'ニュース' : activeCategory}
        </span>
        <span style={{ fontSize: '11px', color: '#aaaaaa', marginLeft: 'auto' }}>
          {filtered.length}件
        </span>
      </div>

      {/* ヒーロー（最新記事） */}
      {heroPost && <HeroCard post={heroPost} />}

      {/* 残りの記事グリッド */}
      <div className="article-grid">
        {restPosts.map(post => (
          <ArticleCard key={post.slug} post={post} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaaaaa' }}>
          記事がありません
        </div>
      )}
    </div>
  )
}
