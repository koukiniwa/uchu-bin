import { getAllPosts } from '@/lib/posts'
import Link from 'next/link'

const ROCKETS = [
  { slug: 'falcon-9', name: 'Falcon 9', ja: 'ファルコン9', provider: 'SpaceX', country: 'US', keywords: ['falcon 9', 'falcon9'] },
  { slug: 'falcon-heavy', name: 'Falcon Heavy', ja: 'ファルコンヘビー', provider: 'SpaceX', country: 'US', keywords: ['falcon heavy', 'falconheavy'] },
  { slug: 'starship', name: 'Starship', ja: 'スターシップ', provider: 'SpaceX', country: 'US', keywords: ['starship'] },
  { slug: 'electron', name: 'Electron', ja: 'エレクトロン', provider: 'Rocket Lab', country: 'NZ', keywords: ['electron'] },
  { slug: 'h3', name: 'H3', ja: 'H3ロケット', provider: 'JAXA / MHI', country: 'JP', keywords: ['h3'] },
  { slug: 'ariane-6', name: 'Ariane 6', ja: 'アリアン6', provider: 'Arianespace', country: 'EU', keywords: ['ariane 6', 'ariane6', 'ariane 62', 'ariane 64'] },
  { slug: 'soyuz', name: 'Soyuz', ja: 'ソユーズ', provider: 'Roscosmos', country: 'RU', keywords: ['soyuz'] },
  { slug: 'long-march', name: 'Long March', ja: '長征', provider: 'CASC', country: 'CN', keywords: ['long march', 'long-march'] },
  { slug: 'vega', name: 'Vega', ja: 'ヴェガ', provider: 'Arianespace', country: 'EU', keywords: ['vega'] },
  { slug: 'vulcan', name: 'Vulcan Centaur', ja: 'ヴァルカン', provider: 'ULA', country: 'US', keywords: ['vulcan'] },
  { slug: 'new-glenn', name: 'New Glenn', ja: 'ニューグレン', provider: 'Blue Origin', country: 'US', keywords: ['new glenn'] },
  { slug: 'pslv', name: 'PSLV', ja: 'PSLV', provider: 'ISRO', country: 'IN', keywords: ['pslv'] },
  { slug: 'gslv', name: 'GSLV / LVM3', ja: 'GSLV', provider: 'ISRO', country: 'IN', keywords: ['gslv', 'lvm3', 'lvm-3'] },
  { slug: 'zhuque', name: 'Zhuque', ja: '朱雀', provider: 'LandSpace', country: 'CN', keywords: ['zhuque'] },
  { slug: 'kuaizhou', name: 'Kuaizhou', ja: '快舟', provider: 'ExPace', country: 'CN', keywords: ['kuaizhou'] },
]

const ROCKET_IMAGES = {
  'falcon-9': 'falcon9_001.jpg', 'falcon-heavy': 'falconheavy_001.jpg',
  'starship': 'starship_001.jpg', 'electron': 'electron_001.jpg',
  'h3': 'h3_001.jpg', 'ariane-6': 'ariane6_001.jpg',
  'soyuz': 'soyuz_001.jpg', 'long-march': 'longmarch5_001.jpg',
  'vega': 'vegac_001.jpg', 'vulcan': 'vulcan_001.jpg',
  'new-glenn': 'newglenn_001.jpg', 'pslv': 'pslv_001.jpg',
  'gslv': 'gslv_001.jpg', 'zhuque': 'zhuque_001.jpg',
  'kuaizhou': 'kuaizhou_001.jpg',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr.slice(0, 10)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`
}

function getRocket(slug) {
  return ROCKETS.find(r => r.slug === slug)
}

function getPostsForRocket(rocket) {
  const allPosts = getAllPosts()
  return allPosts.filter(post => {
    const lower = (post.title + ' ' + post.slug).toLowerCase()
    return rocket.keywords.some(kw => lower.includes(kw))
  })
}

export const dynamicParams = false

export async function generateStaticParams() {
  return ROCKETS.map(r => ({ slug: r.slug }))
}

export async function generateMetadata({ params }) {
  const rocket = getRocket(params.slug)
  if (!rocket) return {}
  const year = new Date().getFullYear()
  return {
    title: `${rocket.name}（${rocket.ja}）打ち上げニュース ${year} - 宇宙便`,
    description: `${rocket.name}（${rocket.ja}）の打ち上げニュース・結果・スケジュールをまとめて掲載。${rocket.provider}による最新の打ち上げ情報。`,
    keywords: [rocket.name, rocket.ja, '打ち上げ', 'ロケット', rocket.provider, '宇宙便'],
    openGraph: {
      title: `${rocket.name}（${rocket.ja}）打ち上げニュース - 宇宙便`,
      description: `${rocket.name}の打ち上げニュース・結果・スケジュールをまとめて掲載。`,
      url: `https://www.uchu-bin.jp/rockets/${rocket.slug}`,
      siteName: '宇宙便',
      type: 'website',
      locale: 'ja_JP',
      images: [{ url: `https://www.uchu-bin.jp/images/library/${ROCKET_IMAGES[rocket.slug] || 'rocketlaunch_001.jpg'}`, width: 1200, height: 630, alt: rocket.name }],
    },
  }
}

export default function RocketPage({ params }) {
  const rocket = getRocket(params.slug)
  if (!rocket) return <div>Not found</div>
  const posts = getPostsForRocket(rocket)
  const image = ROCKET_IMAGES[rocket.slug] || 'rocketlaunch_001.jpg'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#1a2744', textDecoration: 'none',
        marginBottom: '20px', fontWeight: 600,
      }}>
        ← ホームへ
      </Link>

      {/* ヘッダー */}
      <div style={{
        position: 'relative', borderRadius: '10px', overflow: 'hidden',
        marginBottom: '28px', height: '180px',
      }}>
        <img
          src={`/images/library/${image}`}
          alt={rocket.name}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'brightness(0.35)',
          }}
        />
        <div style={{
          position: 'relative', zIndex: 1, padding: '28px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          height: '100%',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
            {rocket.provider}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3 }}>
            {rocket.name}
          </h1>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {rocket.ja}
          </div>
        </div>
      </div>

      {/* 記事一覧 */}
      <h2 style={{
        fontSize: '15px', fontWeight: 700, color: '#1a2744',
        marginBottom: '16px', borderBottom: '2px solid #1a2744', paddingBottom: '6px',
      }}>
        関連ニュース（{posts.length}件）
      </h2>

      {posts.length === 0 ? (
        <p style={{ color: '#999', fontSize: '14px' }}>まだ記事がありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{
              textDecoration: 'none', display: 'flex', gap: '14px', alignItems: 'center',
              padding: '14px', backgroundColor: '#fff',
              border: '1px solid #e8e8e8', borderRadius: '8px',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }} className="mil-card">
              {post.image && (
                <img src={post.image} alt={post.title} loading="lazy" style={{
                  width: '100px', height: '68px', objectFit: 'cover',
                  flexShrink: 0, borderRadius: '4px',
                }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                  {formatDate(post.date)}
                </div>
                <div style={{
                  fontSize: '14px', color: '#111', fontWeight: 600, lineHeight: 1.55,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {post.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 他のロケット */}
      <h2 style={{
        fontSize: '15px', fontWeight: 700, color: '#1a2744',
        marginBottom: '16px', borderBottom: '2px solid #1a2744', paddingBottom: '6px',
      }}>
        他のロケット
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '8px', marginBottom: '32px',
      }}>
        {ROCKETS.filter(r => r.slug !== rocket.slug).map(r => (
          <Link key={r.slug} href={`/rockets/${r.slug}`} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 12px', borderRadius: '6px',
            backgroundColor: '#fff', border: '1px solid #e8e8e8',
            textDecoration: 'none', fontSize: '13px', fontWeight: 600,
            color: '#1a2744', transition: 'background 0.15s',
          }}>
            <img src={`/images/library/${ROCKET_IMAGES[r.slug] || 'rocketlaunch_001.jpg'}`}
              alt={r.name} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
            {r.name}
          </Link>
        ))}
      </div>

      {/* スケジュールへ */}
      <div style={{ textAlign: 'center', padding: '20px', marginBottom: '32px' }}>
        <a href="/schedule" style={{
          display: 'inline-block', padding: '12px 32px',
          backgroundColor: '#1a2744', color: '#fff', borderRadius: '8px',
          textDecoration: 'none', fontWeight: 700, fontSize: '14px',
        }}>
          打ち上げスケジュールを見る →
        </a>
      </div>
    </div>
  )
}
