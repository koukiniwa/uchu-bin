import './globals.css'
import { Suspense } from 'react'
import Header from './Header'
import CategoryNav from './CategoryNav'
import StickyHeader from './StickyHeader'

export const metadata = {
  title: '宇宙便 - 宇宙情報メディア',
  description: 'ロケット・衛星・宇宙開発の最新情報をいち早くお届け',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    apple: '/icon-192.png',
  },
  openGraph: {
    title: '宇宙便',
    description: 'ロケット・衛星・宇宙開発の最新情報',
    type: 'website',
    images: [{ url: '/icon-512.png' }],
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
      <body style={{ backgroundColor: '#f2f2f0', color: '#111111' }}>
        <Suspense fallback={null}>
          <StickyHeader />
        </Suspense>
        <div className="space-banner">
          <Header />
          <Suspense fallback={
            <div style={{ height: '46px' }} />
          }>
            <CategoryNav />
          </Suspense>
        </div>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </main>
        <footer style={{
          borderTop: '1px solid #e0e0e0',
          padding: '20px 16px',
          marginTop: '40px',
          backgroundColor: '#f8f8f8',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              &copy; 2026 宇宙便. ALL RIGHTS RESERVED.
            </span>
            <span style={{ fontSize: '11px', color: '#3d6b4e', fontFamily: 'monospace' }}>
              ▌ UCHU-BIN
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
