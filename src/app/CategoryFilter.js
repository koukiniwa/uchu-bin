'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function ArticleCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex' }}>
      <article
        className="mil-card"
        style={{
          borderTop: '3px solid #1a2744',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* サムネイル画像 */}
        <div style={{
          width: '100%',
          height: '190px',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
          flexShrink: 0,
        }}>
          {post.image ? (
            <img
              src={post.image}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#e8e8e8',
            }} />
          )}
        </div>

        {/* テキストエリア */}
        <div style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '9px',
          flex: 1,
        }}>
          {/* カテゴリ + 日付 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#1a2744',
              padding: '2px 7px',
              border: '1px solid #1a2744',
              lineHeight: 1.5,
            }}>
              {post.category}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#999999',
            }}>
              {post.date}
            </span>
          </div>

          {/* タイトル */}
          <h2 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#111111',
            lineHeight: 1.6,
            margin: 0,
            flex: 1,
          }}>
            {post.title}
          </h2>

          {/* 説明文 */}
          {post.description && (
            <p style={{
              fontSize: '12px',
              color: '#666666',
              lineHeight: 1.65,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {post.description}
            </p>
          )}

          {/* 続きを読む */}
          <div style={{
            fontSize: '12px',
            color: '#1a2744',
            fontWeight: 600,
          }}>
            続きを読む →
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function CategoryFilter({ posts }) {
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  const filtered = activeCategory
    ? posts.filter(p => p.category === activeCategory)
    : posts

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
          fontSize: '14px',
          fontWeight: 700,
          color: '#111111',
        }}>
          {activeCategory ? activeCategory : '最新記事'}
        </span>
        <span style={{ fontSize: '12px', color: '#aaaaaa', marginLeft: 'auto' }}>
          {filtered.length}件
        </span>
      </div>

      {/* 記事グリッド */}
      <div className="article-grid">
        {filtered.map(post => (
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
