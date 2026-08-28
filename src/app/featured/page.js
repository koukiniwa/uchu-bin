import fs from 'fs'
import path from 'path'

const COUNTRY_NAMES = {
  US: 'アメリカ', CN: '中国', IN: 'インド', JP: '日本', RU: 'ロシア',
  FR: '欧州', EU: '欧州', DE: 'ドイツ', KR: '韓国', NZ: 'ニュージーランド',
  GB: 'イギリス', BR: 'ブラジル', IL: 'イスラエル', AU: 'オーストラリア',
}

const COUNTRY_FLAGS = {
  US: '🇺🇸', CN: '🇨🇳', IN: '🇮🇳', JP: '🇯🇵', RU: '🇷🇺',
  FR: '🇪🇺', EU: '🇪🇺', DE: '🇩🇪', KR: '🇰🇷', NZ: '🇳🇿',
  GB: '🇬🇧', BR: '🇧🇷', IL: '🇮🇱', AU: '🇦🇺',
}

const PAD_SHORT = {
  'Kennedy': 'ケネディ宇宙センター',
  'Cape Canaveral': 'ケープカナベラル',
  'Vandenberg': 'ヴァンデンバーグ',
  'Starbase': 'スターベース',
  'Boca Chica': 'スターベース',
  'Wenchang': '文昌',
  'Jiuquan': '酒泉',
  'Taiyuan': '太原',
  'Xichang': '西昌',
  'Tanegashima': '種子島',
  'Uchinoura': '内之浦',
  'Mahia': 'マヒア半島',
  'Sriharikota': 'サティッシュ・ダワン',
  'Kourou': 'クールー',
  'Guiana': 'クールー',
  'Plesetsk': 'プレセツク',
  'Baikonur': 'バイコヌール',
  'Vostochny': 'ボストチヌイ',
}

const ROCKET_IMAGES = {
  'starship': 'starship_001.jpg',
  'falcon 9': 'falcon9_001.jpg',
  'falcon heavy': 'falconheavy_001.jpg',
  'electron': 'electron_001.jpg',
  'neutron': 'neutron_001.jpg',
  'h3': 'h3_001.jpg',
  'h-3': 'h3_001.jpg',
  'ariane 6': 'ariane6_001.jpg',
  'ariane 5': 'ariane5_001.jpg',
  'soyuz': 'soyuz_001.jpg',
  'long march 10': 'longmarch10_001.jpg',
  'long march 12': 'longmarch12_001.jpg',
  'long march 2': 'longmarch2_001.jpg',
  'long march 3': 'longmarch3_001.jpg',
  'long march 5': 'longmarch5_001.jpg',
  'long march 6': 'longmarch6_001.jpg',
  'long march 7': 'longmarch7_001.jpg',
  'long march 8': 'longmarch8_001.jpg',
  'long march': 'logo_cnsa_001.jpg',
  'smart dragon': 'smartdragon3_001.jpg',
  'kuaizhou': 'kuaizhou_001.jpg',
  'ceres': 'ceres1_001.jpg',
  'vulcan': 'vulcan_001.jpg',
  'new glenn': 'newglenn_001.jpg',
  'new shepard': 'newshepard_001.jpg',
  'vega': 'vegac_001.jpg',
  'pslv': 'pslv_001.jpg',
  'gslv': 'gslv_001.jpg',
  'lvm3': 'lvm3_001.jpg',
  'sls': 'sls_001.jpg',
  'vikram': 'vikram1_001.jpg',
  'kairos': 'kairos_001.jpg',
  'epsilon': 'epsilon_001.jpg',
  'nuri': 'nuri_001.jpg',
  'gravity-1': 'gravity1_001.jpg',
  'kinetica': 'kinetica1_001.jpg',
  'spectrum': 'spectrum_001.jpg',
  'terran': 'terranr_001.jpg',
  'firefly': 'fireflyalpha_001.jpg',
  'angara': 'angara_001.jpg',
  'proton': 'proton_001.jpg',
  'zhuque': 'zhuque_001.jpg',
  'pallas': 'pallas_001.jpg',
  'lijian': 'lijian_001.jpg',
  'agnibaan': 'agnibaan_001.jpg',
  'eris': 'eris_001.jpg',
  'delta iv': 'deltaiv_001.jpg',
  'atlas': 'atlasv_001.jpg',
  'miura': 'miura_001.jpg',
  'rfa': 'rocketlaunch_001.jpg',
  'mir': 'mir_001.jpg',
}

function getRocketImage(rocketName) {
  if (!rocketName) return null
  const lower = rocketName.toLowerCase()
  for (const [key, file] of Object.entries(ROCKET_IMAGES)) {
    if (lower.includes(key)) return `/images/library/${file}`
  }
  return '/images/library/rocketlaunch_001.jpg'
}

function shortenPad(pad) {
  if (!pad) return ''
  for (const [key, val] of Object.entries(PAD_SHORT)) {
    if (pad.includes(key)) return val
  }
  return pad.split(',')[0].trim()
}

function countryName(code) {
  if (!code) return ''
  const iso2 = code.length === 2 ? code : {
    USA: 'US', CHN: 'CN', IND: 'IN', JPN: 'JP', RUS: 'RU', FRA: 'FR',
    GUF: 'FR', KOR: 'KR', NZL: 'NZ', GBR: 'GB', DEU: 'DE', BRA: 'BR',
    ISR: 'IL', AUS: 'AU',
  }[code] || code.slice(0, 2)
  return COUNTRY_NAMES[iso2] || code
}

function countryFlag(code) {
  if (!code) return ''
  const iso2 = code.length === 2 ? code : {
    USA: 'US', CHN: 'CN', IND: 'IN', JPN: 'JP', RUS: 'RU', FRA: 'FR',
    GUF: 'FR', KOR: 'KR', NZL: 'NZ', GBR: 'GB', DEU: 'DE', BRA: 'BR',
    ISR: 'IL', AUS: 'AU',
  }[code] || code.slice(0, 2)
  return COUNTRY_FLAGS[iso2] || ''
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function toJST(dateStr, timeStr) {
  if (!dateStr) return { datePart: 'TBD', timePart: '' }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!timeStr) {
    const dow = WEEKDAYS[new Date(y, m - 1, d).getDay()]
    return { datePart: `${m}月${d}日（${dow}）`, timePart: '時刻未定' }
  }
  const [h, min] = timeStr.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, h, min))
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const jstMonth = jst.getUTCMonth() + 1
  const jstDate = jst.getUTCDate()
  const jstH = String(jst.getUTCHours()).padStart(2, '0')
  const jstM = String(jst.getUTCMinutes()).padStart(2, '0')
  const dow = WEEKDAYS[new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())).getUTCDay()]
  return { datePart: `${jstMonth}月${jstDate}日（${dow}）`, timePart: `${jstH}:${jstM} JST` }
}

function getFeatured() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'featured.json')
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return { featured: [], updated: '' }
  }
}

const year = new Date().getFullYear()

export const metadata = {
  title: `注目のロケット打ち上げ ${year} - 宇宙便`,
  description: `${year}年の注目ロケット打ち上げを厳選紹介。Starship、H3ロケット、有人飛行など、見逃せない打ち上げの注目ポイントを解説。`,
  keywords: ['注目 打ち上げ', 'ロケット打ち上げ', `${year}`, 'Starship', 'H3', '有人飛行', '宇宙便'],
  openGraph: {
    title: `注目のロケット打ち上げ ${year} - 宇宙便`,
    description: `${year}年の注目ロケット打ち上げを厳選紹介。見逃せない打ち上げの注目ポイントを解説。`,
    url: 'https://www.uchu-bin.jp/featured',
    siteName: '宇宙便',
    type: 'website',
    locale: 'ja_JP',
    images: [{ url: 'https://www.uchu-bin.jp/images/library/starship_001.jpg', width: 1200, height: 630, alt: '注目のロケット打ち上げ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `注目のロケット打ち上げ ${year} - 宇宙便`,
    description: `${year}年の注目ロケット打ち上げを厳選紹介。見逃せない打ち上げの注目ポイントを解説。`,
    images: ['https://www.uchu-bin.jp/images/library/starship_001.jpg'],
  },
}

export default function FeaturedPage() {
  const data = getFeatured()
  const featured = data.featured || []
  const updated = data.updated

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <a href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#1a2744', textDecoration: 'none',
        marginBottom: '20px', fontWeight: 600,
      }}>
        &larr; ホームへ
      </a>

      <h1 style={{
        fontSize: '22px', fontWeight: 800, color: '#111',
        lineHeight: 1.6, margin: '0 0 6px 0',
      }}>
        注目のロケット打ち上げ {year}
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px 0' }}>
        世界中の打ち上げから注目ミッションを厳選。なぜ注目なのか、背景とともに紹介します。
      </p>

      {featured.length === 0 && (
        <p style={{ color: '#999', fontSize: '14px' }}>現在、注目の打ち上げ情報はありません。</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        {featured.map((f, i) => {
          const { datePart, timePart } = toJST(f.date, f.time)
          const mission = f.mission && f.mission !== 'Unknown Payload' ? f.mission : ''
          const country = countryName(f.country)
          const flag = countryFlag(f.country)
          const pad = shortenPad(f.pad)
          const rocketImg = getRocketImage(f.rocket)
          const statusLabel = f.status === 'Go' ? '確定'
            : f.status === 'TBC' ? '暫定'
            : f.status === 'TBD' ? '未定'
            : f.status
          const statusColor = f.status === 'Go' ? '#2e7d32'
            : f.status === 'TBC' ? '#e65100'
            : f.status === 'TBD' ? '#777'
            : '#333'
          const statusBg = f.status === 'Go' ? '#e8f5e9'
            : f.status === 'TBC' ? '#fff3e0'
            : '#f5f5f5'

          return (
            <article key={f.id || i} className="featured-card" style={{
              borderRadius: '10px', overflow: 'hidden',
              border: '1px solid #e0e0e0', backgroundColor: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              {/* ヘッダー画像 */}
              <div style={{ position: 'relative', overflow: 'hidden' }}
                className="featured-card-img">
                <img
                  src={rocketImg}
                  alt={f.rocket}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: 'brightness(0.6)',
                  }}
                />
                {/* 左上: 日付バッジ */}
                <div style={{
                  position: 'absolute', top: '12px', left: '12px',
                  backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '6px',
                  padding: '6px 10px', textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                    {datePart.replace(/（.+）/, '')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '1px' }}>
                    {datePart.match(/（(.+)）/)?.[1] || ''}
                    {timePart && timePart !== '時刻未定' ? ` ${timePart}` : ''}
                  </div>
                </div>
                {/* 右上: ステータス */}
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: '10px',
                    fontSize: '11px', fontWeight: 600,
                    color: '#fff',
                    backgroundColor: f.status === 'Go' ? 'rgba(46,125,50,0.85)'
                      : f.status === 'TBC' ? 'rgba(230,81,0,0.85)'
                      : 'rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {statusLabel}
                  </span>
                </div>
                {/* 下部: ロケット名 */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '24px 24px 20px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                }}>
                  <div style={{
                    fontSize: '22px', fontWeight: 800, color: '#fff',
                    lineHeight: 1.3, marginBottom: '4px',
                  }}>
                    {f.rocket}
                  </div>
                  {mission && (
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>
                      {mission}
                    </div>
                  )}
                </div>
              </div>

              {/* コンテンツ */}
              <div style={{ padding: '20px 24px' }}>
                {/* 注目ポイント */}
                {f.highlight && (
                  <div style={{
                    padding: '16px 18px', marginBottom: '16px',
                    backgroundColor: '#f8f9ff', borderRadius: '8px',
                    borderLeft: '3px solid #1a2744',
                  }}>
                    <div style={{
                      fontSize: '11px', fontWeight: 700, color: '#1a2744',
                      letterSpacing: '0.1em', marginBottom: '8px',
                    }}>
                      注目ポイント
                    </div>
                    <div style={{
                      fontSize: '14px', color: '#333', lineHeight: 1.8,
                    }}>
                      {f.highlight}
                    </div>
                  </div>
                )}

                {/* 詳細情報 */}
                <div className="featured-details" style={{
                  display: 'grid',
                  gap: '8px', fontSize: '13px', color: '#555',
                }}>
                  {pad && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#999', fontSize: '14px', width: '20px', textAlign: 'center' }}>📍</span>
                      <span>{flag} {pad}{country ? `（${country}）` : ''}</span>
                    </div>
                  )}
                  {f.provider && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#999', fontSize: '14px', width: '20px', textAlign: 'center' }}>🏢</span>
                      <span>{f.provider}</span>
                    </div>
                  )}
                  {f.orbit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#999', fontSize: '14px', width: '20px', textAlign: 'center' }}>🌍</span>
                      <span>{f.orbit}</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* スケジュールページへの導線 */}
      <div style={{
        textAlign: 'center', padding: '20px', marginBottom: '32px',
      }}>
        <a href="/schedule" style={{
          display: 'inline-block', padding: '14px 36px',
          backgroundColor: '#1a2744', color: '#fff', borderRadius: '8px',
          textDecoration: 'none', fontWeight: 700, fontSize: '14px',
          transition: 'background-color 0.2s',
        }}>
          全打ち上げスケジュールを見る &rarr;
        </a>
      </div>

      {/* SEO用テキスト */}
      <section style={{ fontSize: '13px', color: '#555', lineHeight: 1.9, marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2744', marginBottom: '8px' }}>
          注目の打ち上げについて
        </h2>
        <p>
          このページでは、今後予定されているロケット打ち上げの中から、
          特に注目度の高いミッションを厳選して紹介しています。
          新型ロケットの初飛行、有人宇宙飛行、惑星探査ミッション、
          日本のH3ロケットなど、宇宙開発の最前線をお届けします。
        </p>
        <p>
          注目ポイントはAIによる自動生成で、各ミッションの背景や意義をわかりやすく解説しています。
          データはLaunch Library 2 APIから取得し、定期的に更新されます。
        </p>
      </section>

      {updated && (
        <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'right' }}>
          最終更新: {new Date(updated).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
        </div>
      )}
    </div>
  )
}
