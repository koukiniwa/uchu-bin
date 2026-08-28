export const metadata = {
  title: '月面探査機マップ | 宇宙便',
  description: '人類が月面に送り込んだ全探査機の着陸地点をインタラクティブな3Dマップで探索。アポロ計画から最新の月面着陸ミッションまで網羅。',
  openGraph: {
    title: '月面探査機マップ | 宇宙便',
    description: '人類が月面に送り込んだ全探査機の着陸地点をインタラクティブな3Dマップで探索',
    url: 'https://www.uchu-bin.jp/moon-map',
    images: [{ url: 'https://www.uchu-bin.jp/moon-map-og.png', width: 1200, height: 630 }],
    type: 'website',
    siteName: '宇宙便',
  },
  twitter: {
    card: 'summary_large_image',
    title: '月面探査機マップ | 宇宙便',
    description: '人類が月面に送り込んだ全探査機の着陸地点をインタラクティブな3Dマップで探索',
    images: ['https://www.uchu-bin.jp/moon-map-og.png'],
  },
  alternates: { canonical: 'https://www.uchu-bin.jp/moon-map' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '月面探査機マップ',
  description: '人類が月面に送り込んだ全探査機の着陸地点をインタラクティブな3Dマップで探索',
  url: 'https://www.uchu-bin.jp/moon-map',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  publisher: {
    '@type': 'Organization',
    name: '宇宙便',
    url: 'https://www.uchu-bin.jp',
  },
}

export default function MoonMapPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
        <h1 style={{
          fontSize: '22px', fontWeight: 800, color: '#1a2744',
          margin: '32px 0 8px', letterSpacing: '0.02em',
        }}>
          月面探査機マップ
        </h1>
        <p style={{
          fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: 1.6,
        }}>
          人類が月面に送り込んだ全探査機の着陸地点を3Dマップで探索できます。マーカーをクリックして詳細を確認しましょう。
        </p>
        <div style={{
          position: 'relative', width: '100%', paddingBottom: '70%',
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid #e0e0e0', background: '#000',
        }}>
          <iframe
            src="https://space-map-git-main-koukiniwas-projects.vercel.app/moon"
            title="月面探査機マップ"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', border: 'none',
            }}
            allow="fullscreen"
            loading="lazy"
          />
        </div>
        <div style={{
          marginTop: '24px', padding: '20px', background: '#f8f9fc',
          borderRadius: '10px', border: '1px solid #e8eaf0',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2744', marginBottom: '12px' }}>
            操作方法
          </h2>
          <ul style={{ fontSize: '13px', color: '#555', lineHeight: 2, margin: 0, paddingLeft: '20px' }}>
            <li>ドラッグで月面を回転</li>
            <li>スクロール（またはピンチ）でズームイン・アウト</li>
            <li>マーカーまたはリストをクリックで探査機の詳細を表示</li>
            <li>フィルターで時代・成否を絞り込み</li>
          </ul>
        </div>
        <div style={{
          marginTop: '20px', marginBottom: '40px',
          display: 'flex', gap: '12px', flexWrap: 'wrap',
        }}>
          <a href="/mars-map" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', background: '#1a2744', color: '#fff',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
          }}>
            火星探査機マップを見る →
          </a>
          <a href="/schedule" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', background: '#fff', color: '#1a2744',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
            border: '1px solid #d0d5dd',
          }}>
            打ち上げスケジュール →
          </a>
        </div>
      </div>
    </>
  )
}
