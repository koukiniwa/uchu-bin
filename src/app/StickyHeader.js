'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'

export default function StickyHeader() {
  const [visible, setVisible] = useState(false)
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 120)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: '#1a2a50',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.25s ease',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
      }}>
        {/* ロゴ */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '140px', height: '36px', overflow: 'hidden', position: 'relative' }}>
            <img
              src="/logo.jpg"
              alt="宇宙便"
              style={{
                width: '105%',
                height: '115%',
                objectFit: 'cover',
                objectPosition: 'left top',
                display: 'block',
                marginLeft: '-2%',
              }}
            />
          </div>
        </Link>

        {/* カテゴリリンク */}
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
          {CATEGORIES.map(cat => {
            const isActive = cat === 'ニュース'
              ? (!currentCategory || currentCategory === 'ニュース')
              : currentCategory === cat
            return (
              <Link
                key={cat}
                href={`/?category=${encodeURIComponent(cat)}`}
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  borderBottom: isActive ? '2px solid #4fc3f7' : '2px solid transparent',
                  transition: 'color 0.15s',
                }}
              >
                {cat}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
