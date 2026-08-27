import fs from 'fs'
import path from 'path'

const COUNTRY_NAMES = {
  US: 'アメリカ', CN: '中国', IN: 'インド', JP: '日本', RU: 'ロシア',
  FR: '欧州', EU: '欧州', DE: 'ドイツ', KR: '韓国', NZ: 'ニュージーランド',
  GB: 'イギリス', BR: 'ブラジル', IL: 'イスラエル', AU: 'オーストラリア',
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

function toJST(dateStr, timeStr) {
  if (!dateStr) return { display: 'TBD' }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!timeStr) return { display: `${m}月${d}日（時刻未定）` }
  const [h, min] = timeStr.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, h, min))
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const jstMonth = jst.getUTCMonth() + 1
  const jstDate = jst.getUTCDate()
  const jstH = String(jst.getUTCHours()).padStart(2, '0')
  const jstM = String(jst.getUTCMinutes()).padStart(2, '0')
  return { display: `${jstMonth}月${jstDate}日 ${jstH}:${jstM} JST` }
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        {featured.map((f, i) => {
          const { display } = toJST(f.date, f.time)
          const mission = f.mission && f.mission !== 'Unknown Payload' ? f.mission : ''
          const country = countryName(f.country)
          const pad = shortenPad(f.pad)
          const rocketImg = getRocketImage(f.rocket)
          const statusLabel = f.status === 'Go' ? '確定'
            : f.status === 'TBC' ? '暫定'
            : f.status === 'TBD' ? '未定'
            : f.status
          const statusColor = f.status === 'Go' ? '#2e7d32'
            : f.status === 'TBC' ? '#e65100'
            : f.status === 'TBD' ? '#999'
            : '#333'

          return (
            <article key={f.id || i} style={{
              borderRadius: '6px', overflow: 'hidden',
              border: '1px solid #e0e0e0', backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {/* ヘッダー画像 */}
              <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                <img
                  src={rocketImg}
                  alt={f.rocket}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: 'brightness(0.5)',
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '20px 24px 16px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                }}>
                  <div style={{
                    fontSize: '22px', fontWeight: 800, color: '#fff',
                    lineHeight: 1.3, marginBottom: '4px',
                  }}>
                    {f.rocket}
                  </div>
                  {mission && (
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                      {mission}
                    </div>
                  )}
                </div>
              </div>

              {/* コンテンツ */}
              <div style={{ padding: '20px 24px' }}>
                {/* 注目ポイント */}
                {f.highlight && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '14px', color: '#333', lineHeight: 1.8,
                    }}>
                      {f.highlight}
                    </div>
                  </div>
                )}

                {/* 詳細情報 */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '10px', fontSize: '13px', color: '#555',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#333' }}>日時: </span>
                    {display}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#333' }}>状態: </span>
                    <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                  </div>
                  {pad && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#333' }}>射場: </span>
                      {pad}
                    </div>
                  )}
                  {country && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#333' }}>国: </span>
                      {country}
                    </div>
                  )}
                  {f.provider && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#333' }}>運用: </span>
                      {f.provider}
                    </div>
                  )}
                  {f.orbit && (
                    <div>
                      <span style={{ fontWeight: 700, color: '#333' }}>軌道: </span>
                      {f.orbit}
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
          display: 'inline-block', padding: '12px 32px',
          backgroundColor: '#1a2744', color: '#fff', borderRadius: '6px',
          textDecoration: 'none', fontWeight: 700, fontSize: '14px',
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
