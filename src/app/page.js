import { Suspense } from 'react'
import { getAllPosts } from '@/lib/posts'
import CategoryFilter from './CategoryFilter'
import Sidebar from './Sidebar'

export default function Home() {
  const posts = getAllPosts()
  return (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
      <div className="sidebar-wrapper" style={{ width: '200px', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em' }}>
            LOADING...
          </div>
        }>
          <CategoryFilter posts={posts} />
        </Suspense>
      </div>
      <div className="sidebar-wrapper">
        <Sidebar />
      </div>
    </div>
  )
}
