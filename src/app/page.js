import { Suspense } from 'react'
import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import LaunchDashboard from './LaunchDashboard'

function ArticleCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex' }}>
      <article className="mil-card" style={{
        width: '100%', overflow: 'hidden', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#ffffff', border: '1px solid #e8e8e8',
        borderRadius: '8px',
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
      }}>
        <div className="card-img" style={{
          position: 'relative', height: '200px',
          backgroundColor: '#1a2744', flexShrink: 0,
          borderRadius: '8px 8px 0 0', overflow: 'hidden',
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

export default function Home() {
  const posts = getAllPosts()
  return (
    <div>
      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: '12px', letterSpacing: '0.1em' }}>
          LOADING...
        </div>
      }>
        <LaunchDashboard />
      </Suspense>

      {/* ARTICLES */}
      <div style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
        color: '#999', marginBottom: '14px',
        paddingBottom: '10px', borderBottom: '1px solid #e8e8e8',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>ニュース</span>
        <span style={{ fontWeight: 400, letterSpacing: '0.05em' }}>{posts.length}件</span>
      </div>

      <div className="article-grid">
        {posts.slice(0, 12).map(post => (
          <ArticleCard key={post.slug} post={post} />
        ))}
      </div>

      {posts.length > 12 && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link href="/?page=all" style={{
            display: 'inline-block', padding: '10px 32px',
            fontSize: '13px', fontWeight: 600, color: '#1a2744',
            border: '1px solid #1a2744', borderRadius: '6px',
            textDecoration: 'none',
          }}>
            すべての記事を見る
          </Link>
        </div>
      )}
    </div>
  )
}
