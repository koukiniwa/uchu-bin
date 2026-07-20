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

function MapCard({ href, img, alt, title, desc }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none', borderRadius: '3px',
        overflow: 'hidden', border: '1px solid #e0e0e0', marginBottom: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <img src={img} alt={alt} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
      <div style={{ padding: '8px 10px 10px', background: '#fff' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2744', marginBottom: '3px' }}>{title}</div>
        <div style={{ fontSize: '10px', color: '#888', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </a>
  )
}

export default function Home() {
  const posts = getAllPosts()
  return (
    <div style={{ position: 'relative' }}>
      {/* 右サイドバー: マップカード */}
      <div className="sidebar-right">
        <MapCard
          href="https://space-map-git-main-koukiniwas-projects.vercel.app/moon"
          img="/moon-map-og.png" alt="月面探査機マップ"
          title="月面探査機マップ" desc="月に送り込んだ全探査機を3Dマップで探索"
        />
        <MapCard
          href="https://space-map-koukiniwas-projects.vercel.app/mars"
          img="/mars-map-og.png" alt="火星探査機マップ"
          title="火星探査機マップ" desc="火星のローバー位置を3Dマップで可視化"
        />
      </div>
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
        {posts.map(post => (
          <ArticleCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  )
}
