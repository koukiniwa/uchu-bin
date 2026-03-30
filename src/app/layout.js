import './globals.css'
import { Suspense } from 'react'
import Header from './Header'
import CategoryNav from './CategoryNav'
import StickyHeader from './StickyHeader'

export const metadata = {
  title: '宇宙便 - 宇宙情報メディア',
  description: 'ロケット・衛星・宇宙開発の最新情報をいち早くお届け',
  openGraph: {
    title: '宇宙便',
    description: 'ロケット・衛星・宇宙開発の最新情報',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="8ZWuL1GijqKfjMQHI9PYIsRNPV67sPpKsd2_Zeoyzok" />
      </head>
      <body style={{ backgroundColor: '#0a0e1a', color: '#e8eaf0' }}>
        <Suspense fallback={null}>
          <StickyHeader />
        </Suspense>
        <Header />
        <Suspense fallback={
          <div style={{ height: '42px', backgroundColor: '#070d1a', borderBottom: '1px solid #1e2a3a' }} />
        }>
          <CategoryNav />
        </Suspense>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </main>
        <footer style={{
          borderTop: '1px solid #1e2a3a',
          padding: '24px 16px',
          marginTop: '48px',
          backgroundColor: '#050814',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', color: '#3a4a5c', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              &copy; 2026 宇宙便. ALL RIGHTS RESERVED.
            </span>
            <span style={{ fontSize: '11px', color: '#4fc3f7', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              ▌ UCHU-BIN
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
