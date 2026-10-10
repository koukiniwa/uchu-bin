import { Suspense } from 'react'
import { getAllPosts } from '@/lib/posts'
import LaunchDashboard from './LaunchDashboard'
import ArticleList from './ArticleList'

function MapCard({ href, img, alt, title, desc }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="map-card"
      style={{ display: 'block', textDecoration: 'none', borderRadius: '3px',
        overflow: 'hidden', border: '1px solid #e0e0e0', marginBottom: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s, transform 0.15s' }}
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
  // ニュース一覧から予定記事を除外
  const newsPosts = posts.filter(p => p.type !== 'preview')
  // 予定記事のslugとタイトルをLaunchDashboardに渡す（手動 + 自動生成）
  const manualPreviews = posts
    .filter(p => p.type === 'preview')
    .map(p => ({ slug: p.slug, title: p.title, url: `/blog/${p.slug}` }))
  // 自動生成のpreview記事
  let autoPreviews = []
  try {
    const fs = require('fs')
    const path = require('path')
    const index = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'previews', 'index.json'), 'utf-8'))
    autoPreviews = (index.previews || []).map(p => ({
      slug: p.slug, title: p.title, missionName: p.missionName,
      url: `/blog/preview/${p.slug}`,
    }))
  } catch {}
  const previewArticles = [...manualPreviews, ...autoPreviews]
  return (
    <div style={{ position: 'relative' }}>
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
        <LaunchDashboard previewArticles={previewArticles} />
      </Suspense>


      <div style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
        color: '#999', marginBottom: '14px',
        paddingBottom: '10px', borderBottom: '1px solid #e8e8e8',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>ニュース</span>
        <span style={{ fontWeight: 400, letterSpacing: '0.05em' }}>{newsPosts.length}件</span>
      </div>

      <ArticleList posts={newsPosts} />
    </div>
  )
}
