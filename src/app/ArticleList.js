'use client'

import { useState } from 'react'
import Link from 'next/link'

const PAGE_SIZE = 12

function ArticleCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex' }}>
      <article className="mil-card" style={{
        width: '100%', overflow: 'hidden', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#ffffff', border: '1px solid #e8e8e8',
        borderRadius: '3px',
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
      }}>
        <div className="card-img" style={{
          position: 'relative', aspectRatio: '16/9',
          backgroundColor: '#1a2744', flexShrink: 0,
          borderRadius: '3px 3px 0 0', overflow: 'hidden',
        }}>
          {post.image ? (
            <img src={post.image} alt={post.title} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f1629 0%, #1a2744 100%)' }} />
          )}
        </div>
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h2 className="card-title" style={{
            fontSize: '14px', fontWeight: 700, color: '#111',
            lineHeight: 1.6, margin: '0 0 8px 0',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {post.title}
          </h2>
          {post.description && (
            <p className="card-desc" style={{
              fontSize: '12px', color: '#666', margin: '0 0 10px 0',
              lineHeight: 1.65, flex: 1,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {post.description}
            </p>
          )}
          <div className="card-footer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f0f0f0',
          }}>
            <span className="card-date" style={{ fontSize: '11px', color: '#aaa' }}>{post.date}</span>
            <span className="card-more" style={{ fontSize: '11px', color: '#1a2744', fontWeight: 600 }}>
              続きを読む
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function ArticleList({ posts }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(posts.length / PAGE_SIZE)
  const visible = posts.slice(0, page * PAGE_SIZE)
  const hasMore = page < totalPages

  return (
    <div>
      {/* SEO: 全記事へのリンクを隠しで保持 */}
      <div style={{ display: 'none' }}>
        {posts.map(p => (
          <a key={p.slug} href={`/blog/${p.slug}`}>{p.title}</a>
        ))}
      </div>

      <div className="article-grid">
        {visible.map(post => (
          <ArticleCard key={post.slug} post={post} />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <button
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '10px 40px', fontSize: '13px', fontWeight: 600,
              color: '#1a2744', backgroundColor: '#fff',
              border: '1px solid #1a2744', borderRadius: '3px',
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            もっと見る
          </button>
        </div>
      )}
    </div>
  )
}
