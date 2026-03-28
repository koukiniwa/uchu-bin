'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'

export default function CategoryNav() {
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')

  return (
    <nav style={{ backgroundColor: '#1a2744', borderBottom: '2px solid #2e4a7a' }}>
      <div
        className="cat-nav"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'center',
          overflowX: 'auto',
        }}
      >
        {CATEGORIES.map(cat => {
          const isActive = cat === 'ニュース'
            ? (!currentCategory || currentCategory === 'ニュース')
            : currentCategory === cat
          return (
            <Link
              key={cat}
              href={`/?category=${encodeURIComponent(cat)}`}
              style={{
                display: 'block',
                padding: '14px 28px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.06em',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                borderBottom: isActive ? '3px solid #5a8fd4' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'color 0.15s',
              }}
            >
              {cat}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
