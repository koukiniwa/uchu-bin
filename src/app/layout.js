import './globals.css'
import Link from 'next/link'

export const metadata = {
  metadataBase: new URL('https://www.uchu-bin.jp'),
  title: '宇宙便 - 宇宙情報メディア',
  description: 'ロケット打ち上げ速報・スケジュール・宇宙開発ニュースをリアルタイムでお届け。',
  keywords: ['宇宙便', '宇宙ニュース', 'ロケット', '打ち上げ', '宇宙開発', 'JAXA', 'NASA', 'SpaceX', 'カウントダウン', 'launch schedule'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    apple: '/icon-192.png',
  },
  openGraph: {
    title: '宇宙便 - 宇宙情報メディア',
    description: 'ロケット打ち上げ速報・スケジュール・宇宙開発ニュースをリアルタイムでお届け。',
    url: 'https://www.uchu-bin.jp',
    siteName: '宇宙便',
    type: 'website',
    locale: 'ja_JP',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: '宇宙便' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '宇宙便 - 宇宙情報メディア',
    description: 'ロケット打ち上げ速報・スケジュール・宇宙開発ニュースをリアルタイムでお届け。',
    images: ['/icon-512.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="8ZWuL1GijqKfjMQHI9PYIsRNPV67sPpKsd2_Zeoyzok" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: '宇宙便',
            alternateName: 'うちゅうびん',
            url: 'https://www.uchu-bin.jp',
            logo: 'https://www.uchu-bin.jp/icon-512.png',
            description: 'ロケット打ち上げ速報・スケジュール・宇宙開発ニュースをリアルタイムでお届けする宇宙情報メディア。',
            sameAs: [],
          })}}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: '宇宙便',
            url: 'https://www.uchu-bin.jp',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://www.uchu-bin.jp/?category={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          })}}
        />
      </head>
      <body style={{ backgroundColor: '#f8f9fa', color: '#111111' }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 40%, #1a2744 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            maxWidth: '900px', margin: '0 auto', padding: '0 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '56px',
          }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" alt="宇宙便" style={{
                height: '36px', width: 'auto', display: 'block', mixBlendMode: 'screen',
              }} />
            </Link>
            <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <Link href="/" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', letterSpacing: '0.08em' }}>
                HOME
              </Link>
              <a href="https://x.com/hgS9nGJWWF17545" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', letterSpacing: '0.08em' }}>
                X / Twitter
              </a>
            </nav>
          </div>
        </header>

        <main style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '24px 20px', minHeight: 'calc(100vh - 200px)',
        }}>
          {children}
        </main>

        <footer style={{
          borderTop: '1px solid #e0e0e0',
          marginTop: '40px',
          backgroundColor: '#0f1629',
          color: '#ffffff',
        }}>
          <div style={{
            maxWidth: '900px', margin: '0 auto',
            padding: '32px 20px 24px',
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.12em', color: '#fff', marginBottom: '4px' }}>
                宇宙便
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                ロケット打ち上げ速報・スケジュール
              </div>
            </div>
            {/* Map links */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <a href="https://space-map-git-main-koukiniwas-projects.vercel.app/moon"
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#4fc3f7', textDecoration: 'none' }}>
                月面探査機マップ
              </a>
              <a href="https://space-map-koukiniwas-projects.vercel.app/mars"
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#4fc3f7', textDecoration: 'none' }}>
                火星探査機マップ
              </a>
            </div>
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '8px',
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                &copy; 2026 宇宙便. ALL RIGHTS RESERVED.
              </span>
              <span style={{ fontSize: '10px', color: '#4fc3f7', letterSpacing: '0.1em', fontWeight: 600 }}>
                UCHU-BIN.JP
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
