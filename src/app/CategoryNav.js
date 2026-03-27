'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'

export default function CategoryNav() {
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')

  return (
    <nav style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e0e0e0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div
        className="cat-nav"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          overflowX: 'auto',
        }}
      >
        {CATEGORIES.map(cat => {
          const isActive = currentCategory === cat
          return (
            <Link
              key={cat}
              href={`/?category=${encodeURIComponent(cat)}`}
              style={{
                display: 'block',
                padding: '13px 18px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.04em',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                color: isActive ? '#1a2744' : '#555555',
                borderBottom: isActive ? '3px solid #1a2744' : '3px solid transparent',
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
