import fs from 'fs'
import path from 'path'
import { getAllPosts } from '@/lib/posts'
import Link from 'next/link'

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'rockets')
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const COUNTRY_FLAGS = {
  US: '\u{1F1FA}\u{1F1F8}', EU: '\u{1F1EA}\u{1F1FA}', CN: '\u{1F1E8}\u{1F1F3}',
  RU: '\u{1F1F7}\u{1F1FA}', JP: '\u{1F1EF}\u{1F1F5}', IN: '\u{1F1EE}\u{1F1F3}',
  NZ: '\u{1F1F3}\u{1F1FF}', KR: '\u{1F1F0}\u{1F1F7}', DE: '\u{1F1E9}\u{1F1EA}',
}

const STATUS_LABEL = {
  active: { label: '運用中', color: '#4caf50' },
  development: { label: '開発中', color: '#ff9800' },
  retired: { label: '退役', color: '#9e9e9e' },
}

// ロケットslugとキーワードのマッピング（記事マッチング用）
const ROCKET_KEYWORDS = {
  'falcon-9': ['falcon 9', 'falcon9'],
  'falcon-heavy': ['falcon heavy', 'falconheavy'],
  'starship': ['starship'],
  'electron': ['electron'],
  'h3': ['h3'],
  'ariane-6': ['ariane 6', 'ariane6', 'ariane 62', 'ariane 64'],
  'soyuz': ['soyuz'],
  'long-march': ['long march', 'long-march'],
  'vega': ['vega'],
  'vulcan': ['vulcan'],
  'new-glenn': ['new glenn'],
  'pslv': ['pslv'],
  'gslv': ['gslv', 'lvm3', 'lvm-3'],
  'zhuque': ['zhuque'],
  'kuaizhou': ['kuaizhou'],
}

function getAllRocketSlugs() {
  try {
    const index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf-8'))
    return (index.rockets || []).map(r => r.slug)
  } catch { return [] }
}

function getRocketData(slug) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${slug}.json`), 'utf-8'))
  } catch { return null }
}

function getPostsForRocket(slug) {
  const keywords = ROCKET_KEYWORDS[slug] || [slug]
  const allPosts = getAllPosts()
  return allPosts.filter(post => {
    const lower = (post.title + ' ' + post.slug).toLowerCase()
    return keywords.some(kw => lower.includes(kw))
  }).slice(0, 15)
}

export const dynamicParams = false

export function generateStaticParams() {
  return getAllRocketSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }) {
  const data = getRocketData(params.slug)
  if (!data) return { title: 'ロケット - 宇宙便' }
  const url = `https://www.uchu-bin.jp/rockets/${params.slug}`
  const image = data.image ? `https://www.uchu-bin.jp${data.image}` : 'https://www.uchu-bin.jp/icon-512.png'
  return {
    title: `${data.nameJa}（${data.nameEn}）打ち上げ実績・成功率・スペック | 宇宙便`,
    description: `${data.nameJa}の打ち上げ成功率${data.stats?.successRate || 0}%、通算${data.stats?.total || 0}回。${data.operator}が運用。${data.description?.slice(0, 50) || ''}`,
    keywords: [data.nameJa, data.nameEn, `${data.nameJa} 打ち上げ`, `${data.nameJa} 成功率`, `${data.nameEn} launch`, 'ロケット図鑑', data.operator, '宇宙便'],
    openGraph: {
      title: `${data.nameJa}（${data.nameEn}）打ち上げ実績・成功率 | 宇宙便`,
      description: `${data.nameJa}の打ち上げ成功率${data.stats?.successRate || 0}%、通算${data.stats?.total || 0}回。`,
      url,
      siteName: '宇宙便',
      type: 'article',
      locale: 'ja_JP',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.nameJa}（${data.nameEn}） | 宇宙便`,
      description: `打ち上げ成功率${data.stats?.successRate || 0}%、通算${data.stats?.total || 0}回。`,
      images: [image],
    },
  }
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
}

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr.slice(0, 10)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`
}

export default function RocketDetailPage({ params }) {
  const data = getRocketData(params.slug)
  if (!data) return <div>ロケットが見つかりません</div>

  const flag = COUNTRY_FLAGS[data.country] || ''
  const statusInfo = STATUS_LABEL[data.status] || STATUS_LABEL.active
  const stats = data.stats || {}
  const yearlyStats = stats.yearlyStats || {}
  const thisYear = stats.thisYear || { total: 0, success: 0, failure: 0 }

  // 記事をpostsから動的に取得（データ生成時のキャッシュより新しい記事も含む）
  const posts = getPostsForRocket(params.slug)

  // 年別データ（直近7年分）
  const currentYear = new Date().getFullYear()
  const yearRange = []
  for (let y = currentYear; y >= currentYear - 6; y--) {
    if (yearlyStats[y]) yearRange.push({ year: y, ...yearlyStats[y] })
  }
  yearRange.reverse()
  const maxYearTotal = Math.max(...yearRange.map(y => y.total), 1)

  // 他のロケット一覧
  let otherRockets = []
  try {
    const index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf-8'))
    otherRockets = (index.rockets || []).filter(r => r.slug !== params.slug)
  } catch {}

  // 構造化データ
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${data.nameJa}（${data.nameEn}） - ロケット図鑑`,
    description: data.description,
    url: `https://www.uchu-bin.jp/rockets/${params.slug}`,
    image: data.image ? `https://www.uchu-bin.jp${data.image}` : undefined,
    author: { '@type': 'Organization', name: '宇宙便', url: 'https://www.uchu-bin.jp' },
    publisher: { '@type': 'Organization', name: '宇宙便', url: 'https://www.uchu-bin.jp', logo: { '@type': 'ImageObject', url: 'https://www.uchu-bin.jp/icon-512.png' } },
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      {/* パンくず */}
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
        <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>宇宙便</Link>
        {' > '}
        <Link href="/rockets" style={{ color: '#888', textDecoration: 'none' }}>ロケット図鑑</Link>
        {' > '}
        <span style={{ color: '#333' }}>{data.nameJa}</span>
      </div>

      {/* ヒーロー */}
      <div style={{
        position: 'relative', height: '280px', borderRadius: '12px', overflow: 'hidden',
        marginBottom: '28px', background: '#0a0e1a',
      }}>
        <img
          src={data.image}
          alt={`${data.nameJa}（${data.nameEn}）`}
          fetchPriority="high"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
        />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '24px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '24px' }}>{flag}</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>
              {data.nameJa}
            </h1>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)' }}>{data.nameEn}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{data.operator}</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#fff',
              background: statusInfo.color, padding: '2px 8px', borderRadius: '10px',
            }}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* 概要 */}
      {data.description && data.description !== 'データ準備中' && (
        <p style={{ fontSize: '15px', color: '#333', lineHeight: 1.8, marginBottom: '28px' }}>
          {data.description}
        </p>
      )}

      {/* 統計カード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}
        className="rocket-stats-grid"
      >
        <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>通算打ち上げ</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#111' }}>{stats.total || 0}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>回</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>成功率</div>
          <div style={{
            fontSize: '28px', fontWeight: 800,
            color: (stats.successRate || 0) >= 95 ? '#4caf50' : (stats.successRate || 0) >= 80 ? '#ff9800' : '#f44336',
          }}>
            {stats.successRate || 0}%
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>{stats.success || 0}成功 / {stats.failure || 0}失敗</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>{currentYear}年</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#111' }}>{thisYear.total}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>回</div>
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>初飛行</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#333', marginTop: '6px' }}>
            {data.firstFlight ? (() => {
              const d = new Date(data.firstFlight)
              return isNaN(d) ? '-' : `${d.getFullYear()}年`
            })() : '-'}
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            {data.firstFlight ? (() => {
              const d = new Date(data.firstFlight)
              return isNaN(d) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`
            })() : ''}
          </div>
        </div>
      </div>

      {/* スペック */}
      {data.specs && Object.keys(data.specs).length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '12px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
            スペック
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {[
              { key: 'height', label: '全長' },
              { key: 'diameter', label: '直径' },
              { key: 'stages', label: '段数' },
              { key: 'liftoffMass', label: '打ち上げ質量' },
              { key: 'payloadLEO', label: 'LEOペイロード' },
              { key: 'payloadGTO', label: 'GTOペイロード' },
            ].filter(s => data.specs[s.key] && data.specs[s.key] !== '-').map(s => (
              <div key={s.key} style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#333' }}>{data.specs[s.key]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 年別打ち上げ回数 */}
      {yearRange.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '16px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
            年別打ち上げ回数
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', padding: '0 4px' }}>
            {yearRange.map(y => {
              const barHeight = Math.max((y.total / maxYearTotal) * 110, 4)
              const failureHeight = y.failure > 0 ? Math.max((y.failure / maxYearTotal) * 110, 3) : 0
              return (
                <div key={y.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '4px' }}>{y.total}</div>
                  <div style={{ width: '100%', maxWidth: '48px' }}>
                    <div style={{ height: `${barHeight}px`, background: '#1a2744', borderRadius: '3px 3px 0 0' }} />
                    {failureHeight > 0 && (
                      <div style={{ height: `${failureHeight}px`, background: '#f44336', borderRadius: '0 0 3px 3px' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{y.year}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '10px', color: '#888' }}>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#1a2744', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />成功</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f44336', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />失敗</span>
          </div>
        </div>
      )}

      {/* 直近の打ち上げ履歴 */}
      {data.recentLaunches && data.recentLaunches.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '12px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
            直近の打ち上げ
          </h2>
          <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            {data.recentLaunches.map((l, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderBottom: i < data.recentLaunches.length - 1 ? '1px solid #f0f0f0' : 'none',
                fontSize: '13px',
              }}>
                <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>
                  {l.status === 'success' ? '\u2705' : l.status === 'failure' ? '\u274C' : '\u2B1C'}
                </span>
                <span style={{ color: '#888', fontSize: '12px', fontFamily: 'monospace', minWidth: '80px' }}>
                  {formatDateShort(l.date)}
                </span>
                <span style={{ color: '#333', fontWeight: 500, flex: 1 }}>{l.mission}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 次の打ち上げ予定 */}
      {data.upcoming && data.upcoming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '12px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
            次の打ち上げ予定
          </h2>
          {data.upcoming.map((u, i) => {
            const utc = u.date && u.time ? new Date(u.date + 'T' + u.time + ':00Z') : null
            const jst = utc ? new Date(utc.getTime() + 9 * 3600000) : null
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 14px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{u.rocket}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{u.mission}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {jst ? (
                    <>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a2744' }}>
                        {jst.getUTCMonth() + 1}/{jst.getUTCDate()}（{WEEKDAYS[new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())).getUTCDay()]}）
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>
                        {String(jst.getUTCHours()).padStart(2, '0')}:{String(jst.getUTCMinutes()).padStart(2, '0')} JST
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#888' }}>日時未定</div>
                  )}
                </div>
              </div>
            )
          })}
          <Link href="/schedule" style={{ fontSize: '13px', color: '#1565c0', textDecoration: 'none', fontWeight: 600 }}>
            全スケジュールを見る →
          </Link>
        </div>
      )}

      {/* 関連記事 */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '12px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
          {data.nameJa}の最新記事（{posts.length}件）
        </h2>
        {posts.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px' }}>まだ記事がありません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {posts.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{
                textDecoration: 'none', display: 'flex', gap: '14px', alignItems: 'center',
                padding: '12px 14px', border: '1px solid #e8e8e8', borderRadius: '6px',
              }}>
                {post.image && (
                  <img src={post.image} alt={post.title} loading="lazy" style={{
                    width: '90px', height: '60px', objectFit: 'cover', flexShrink: 0, borderRadius: '4px',
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>
                    {formatDateFull(post.date)}
                  </div>
                  <div style={{
                    fontSize: '14px', color: '#111', fontWeight: 600, lineHeight: 1.5,
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
      </div>

      {/* 他のロケット */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '12px', borderLeft: '3px solid #1a2744', paddingLeft: '10px' }}>
          他のロケット
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
          {otherRockets.map(r => (
            <Link key={r.slug} href={`/rockets/${r.slug}`} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', borderRadius: '6px',
              border: '1px solid #e8e8e8', textDecoration: 'none',
              fontSize: '13px', fontWeight: 600, color: '#1a2744',
            }}>
              <img src={r.image} alt={r.nameEn} loading="lazy"
                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
              <div>
                <div>{r.nameJa}</div>
                <div style={{ fontSize: '10px', color: '#888', fontWeight: 400 }}>{r.successRate}% / {r.total}回</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* サイト回遊 */}
      <div style={{ margin: '32px 0', display: 'grid', gap: '10px' }} className="site-links-grid">
        <Link href="/rockets" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>🚀</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>ロケット図鑑</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>世界の主要ロケットを一覧で比較</div>
          </div>
        </Link>
        <Link href="/schedule" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>📅</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>打ち上げスケジュール</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>世界中の打ち上げ予定を一覧で確認</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
