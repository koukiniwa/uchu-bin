import fs from 'fs'
import path from 'path'
import Link from 'next/link'

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

export const metadata = {
  title: 'ロケット図鑑 - 世界の主要ロケット一覧 | 宇宙便',
  description: '世界の主要ロケットの打ち上げ成功率・回数・スペックを一覧で比較。Falcon 9、H3、Ariane 6、長征、Soyuzなど15機種以上を網羅。',
  keywords: ['ロケット図鑑', 'ロケット一覧', '打ち上げ成功率', 'Falcon 9', 'H3', 'アリアン6', '長征', 'ソユーズ', '宇宙ロケット', 'スペック比較'],
  openGraph: {
    title: 'ロケット図鑑 - 世界の主要ロケット一覧 | 宇宙便',
    description: '世界の主要ロケットの打ち上げ成功率・回数・スペックを一覧で比較。',
    url: 'https://www.uchu-bin.jp/rockets',
    siteName: '宇宙便',
    type: 'website',
    locale: 'ja_JP',
    images: [{ url: 'https://www.uchu-bin.jp/images/library/falcon9_001.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ロケット図鑑 - 世界の主要ロケット一覧 | 宇宙便',
    description: '世界の主要ロケットの打ち上げ成功率・回数・スペックを一覧で比較。',
    images: ['https://www.uchu-bin.jp/images/library/falcon9_001.jpg'],
  },
}

export default function RocketsPage() {
  let data = { rockets: [] }
  try {
    data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'rockets', 'index.json'), 'utf-8'))
  } catch {}

  const rockets = data.rockets || []

  // 構造化データ
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ロケット図鑑',
    description: '世界の主要ロケットの打ち上げ成功率・回数・スペックを一覧で比較',
    url: 'https://www.uchu-bin.jp/rockets',
    publisher: { '@type': 'Organization', name: '宇宙便', url: 'https://www.uchu-bin.jp' },
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111', margin: '0 0 8px 0' }}>
          ロケット図鑑
        </h1>
        <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: 1.6 }}>
          世界の主要ロケットの打ち上げ実績・成功率・スペックを一覧で確認できます。
        </p>
      </div>

      {/* ロケットカード一覧 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {rockets.map(r => {
          const flag = COUNTRY_FLAGS[r.country] || ''
          const statusInfo = STATUS_LABEL[r.status] || STATUS_LABEL.active
          return (
            <Link
              key={r.slug}
              href={`/rockets/${r.slug}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s, transform 0.2s',
                background: '#fff',
              }} className="rocket-card">
                {/* 画像 */}
                <div style={{ position: 'relative', height: '180px', overflow: 'hidden', background: '#0a0e1a' }}>
                  <img
                    src={r.image}
                    alt={`${r.nameJa}（${r.nameEn}）`}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  />
                  {/* ステータスバッジ */}
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    fontSize: '10px', fontWeight: 700, color: '#fff',
                    background: statusInfo.color, padding: '3px 8px', borderRadius: '10px',
                    letterSpacing: '0.05em',
                  }}>
                    {statusInfo.label}
                  </div>
                  {/* 国旗 */}
                  {flag && (
                    <div style={{
                      position: 'absolute', top: '10px', left: '10px',
                      fontSize: '20px', lineHeight: 1,
                    }}>
                      {flag}
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#111' }}>{r.nameJa}</span>
                    <span style={{ fontSize: '12px', color: '#888' }}>{r.nameEn}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                    {r.operator}
                  </div>

                  {/* 統計バー */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '2px' }}>
                        成功率
                      </div>
                      <div style={{ fontWeight: 800, color: r.successRate >= 95 ? '#4caf50' : r.successRate >= 80 ? '#ff9800' : '#f44336' }}>
                        {r.successRate}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '2px' }}>
                        通算
                      </div>
                      <div style={{ fontWeight: 800, color: '#333' }}>
                        {r.total}回
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#999', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '2px' }}>
                        今年
                      </div>
                      <div style={{ fontWeight: 800, color: '#333' }}>
                        {r.thisYear}回
                      </div>
                    </div>
                    {r.lastLaunch && (
                      <div style={{ marginLeft: 'auto' }}>
                        <div style={{ color: '#999', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '2px' }}>
                          直近
                        </div>
                        <div style={{ fontWeight: 600, color: '#555', fontSize: '12px' }}>
                          {(() => {
                            const d = new Date(r.lastLaunch)
                            return `${d.getMonth() + 1}/${d.getDate()}`
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* サイト回遊 */}
      <div style={{ marginTop: '40px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/schedule" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '10px 18px', borderRadius: '6px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
        }}>
          打ち上げスケジュール →
        </Link>
        <Link href="/featured" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '10px 18px', borderRadius: '6px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
        }}>
          注目の打ち上げ →
        </Link>
      </div>
    </div>
  )
}
