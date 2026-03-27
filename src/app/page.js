import { Suspense } from 'react'
import { getAllPosts } from '@/lib/posts'
import CategoryFilter from './CategoryFilter'

export default function Home() {
  const posts = getAllPosts()
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#444', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em' }}>
        LOADING...
      </div>
    }>
      <CategoryFilter posts={posts} />
    </Suspense>
  )
}
