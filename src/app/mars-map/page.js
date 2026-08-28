export const metadata = {
  title: '火星探査機マップ | 宇宙便',
  description: '火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化。バイキングからパーサヴィアランスまで全ミッションを網羅。',
  openGraph: {
    title: '火星探査機マップ | 宇宙便',
    description: '火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化',
    url: 'https://www.uchu-bin.jp/mars-map',
    images: [{ url: 'https://www.uchu-bin.jp/mars-map-og.png', width: 1200, height: 630 }],
    type: 'website',
    siteName: '宇宙便',
  },
  twitter: {
    card: 'summary_large_image',
    title: '火星探査機マップ | 宇宙便',
    description: '火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化',
    images: ['https://www.uchu-bin.jp/mars-map-og.png'],
  },
  alternates: { canonical: 'https://www.uchu-bin.jp/mars-map' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '火星探査機マップ',
  description: '火星に着陸した探査機・ローバーの位置をインタラクティブな3Dマップで可視化',
  url: 'https://www.uchu-bin.jp/mars-map',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  publisher: {
    '@type': 'Organization',
    name: '宇宙便',
    url: 'https://www.uchu-bin.jp',
  },
}

export default function MarsMapPage() {
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
          火星探査機マップ
        </h1>
        <p style={{
          fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: 1.6,
        }}>
          火星に着陸した探査機・ローバーの位置を3Dマップで確認できます。マーカーをクリックして各ミッションの詳細を見てみましょう。
        </p>
        <div style={{
          position: 'relative', width: '100%', paddingBottom: '70%',
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid #e0e0e0', background: '#000',
        }}>
          <iframe
            src="https://space-map-koukiniwas-projects.vercel.app/mars"
            title="火星探査機マップ"
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
            <li>ドラッグで火星を回転</li>
            <li>スクロール（またはピンチ）でズームイン・アウト</li>
            <li>マーカーまたはリストをクリックで探査機の詳細を表示</li>
            <li>フィルターで時代・成否を絞り込み</li>
          </ul>
        </div>
        <div style={{
          marginTop: '20px', marginBottom: '40px',
          display: 'flex', gap: '12px', flexWrap: 'wrap',
        }}>
          <a href="/moon-map" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', background: '#1a2744', color: '#fff',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
          }}>
            月面探査機マップを見る →
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
