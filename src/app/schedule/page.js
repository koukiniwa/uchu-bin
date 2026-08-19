import fs from 'fs'
import path from 'path'
import ScheduleCountdown from './ScheduleCountdown'

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
  'vega': 'vegac_001.jpg',
  'pslv': 'pslv_001.jpg',
  'gslv': 'gslv_001.jpg',
  'lvm3': 'lvm3_001.jpg',
  'sls': 'sls_001.jpg',
  'vikram': 'vikram1_001.jpg',
  'kairos': 'kairos_001.jpg',
  'epsilon': 'epsilon_001.jpg',
  'gravity-1': 'gravity1_001.jpg',
  'kinetica': 'kinetica1_001.jpg',
  'spectrum': 'spectrum_001.jpg',
  'firefly': 'fireflyalpha_001.jpg',
  'angara': 'angara_001.jpg',
  'zhuque': 'zhuque_001.jpg',
  'pallas': 'pallas_001.jpg',
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
  if (!dateStr) return { display: 'TBD', sortKey: '', short: 'TBD' }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!timeStr) return { display: `${m}月${d}日（時刻未定）`, sortKey: dateStr, short: `${m}/${d}` }
  const [h, min] = timeStr.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, h, min))
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const jstMonth = jst.getUTCMonth() + 1
  const jstDate = jst.getUTCDate()
  const jstH = String(jst.getUTCHours()).padStart(2, '0')
  const jstM = String(jst.getUTCMinutes()).padStart(2, '0')
  return {
    display: `${jstMonth}月${jstDate}日 ${jstH}:${jstM} JST`,
    sortKey: dateStr + 'T' + timeStr,
    short: `${jstMonth}/${jstDate} ${jstH}:${jstM}`,
  }
}

function getLaunches() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'launches.json')
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return data
  } catch {
    return { launches: [], recent: [], updated: '' }
  }
}

function isNotable(l) {
  const m = (l.mission || '').toLowerCase()
  const r = (l.rocket || '').toLowerCase()
  if (m.includes('starlink')) return false
  if (m === 'unknown payload') return false
  if (m.includes('demo flight') || m.includes('flight 2') || m.includes('flight 1')) return true
  if (r.includes('starship') || r.includes('falcon heavy') || r.includes('sls')) return true
  if (r.includes('h3') || r.includes('h-3')) return true
  if (m.includes('crew') || m.includes('chang\'e') || m.includes('roman') || m.includes('mmx')) return true
  if (m.includes('michibiki') || m.includes('progress') || m.includes('soyuz ms')) return true
  if (r.includes('ariane')) return true
  if (r.includes('zhuque') || r.includes('spectrum') || r.includes('mir') || r.includes('pallas')) return true
  if (r.includes('electron') && !m.includes('starlink')) return true
  return false
}

const year = new Date().getFullYear()

export const metadata = {
  title: `ロケット打ち上げ予定スケジュール ${year} - 宇宙便`,
  description: `${year}年のロケット打ち上げ予定を一覧で掲載。SpaceX Falcon 9、H3ロケット、Starship、Long Marchなど世界中の打ち上げスケジュールをリアルタイム更新。`,
  keywords: ['ロケット打ち上げ予定', '打ち上げスケジュール', `${year}`, 'H3', 'Starship', 'Falcon 9', 'SpaceX', 'JAXA', '宇宙便'],
  openGraph: {
    title: `ロケット打ち上げ予定スケジュール ${year} - 宇宙便`,
    description: `${year}年のロケット打ち上げ予定を一覧で掲載。世界中の打ち上げスケジュールをリアルタイム更新。`,
    url: 'https://www.uchu-bin.jp/schedule',
    siteName: '宇宙便',
    type: 'website',
    locale: 'ja_JP',
  },
}

export default function SchedulePage() {
  const data = getLaunches()
  const launches = data.launches || []
  const recent = data.recent || []
  const updated = data.updated

  const firstTimed = launches.find(l => l.time && !l.tentative)
  const notableLaunches = launches.filter(isNotable).slice(0, 5)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <a href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#1a2744', textDecoration: 'none',
        marginBottom: '20px', fontWeight: 600,
      }}>
        ← ホームへ
      </a>

      <h1 style={{
        fontSize: '22px', fontWeight: 800, color: '#111',
        lineHeight: 1.6, margin: '0 0 6px 0',
      }}>
        ロケット打ち上げ予定スケジュール {year}
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 20px 0' }}>
        世界中のロケット打ち上げ予定を日本時間（JST）で掲載。データは自動更新されます。
      </p>

      {/* カウントダウン（画像付き） */}
      {firstTimed && (
        <div style={{
          position: 'relative', borderRadius: '6px', overflow: 'hidden',
          marginBottom: '28px', height: '180px',
        }}>
          <img
            src={getRocketImage(firstTimed.rocket)}
            alt={firstTimed.rocket}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'brightness(0.35)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              次の打ち上げ
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
              {firstTimed.rocket}
            </div>
            {firstTimed.mission && firstTimed.mission !== 'Unknown Payload' && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                {firstTimed.mission}
              </div>
            )}
            <ScheduleCountdown
              rocket={firstTimed.rocket}
              date={firstTimed.date}
              time={firstTimed.time}
              mission={firstTimed.mission}
            />
          </div>
        </div>
      )}

      {/* 今月の注目打ち上げ */}
      {notableLaunches.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a2744', marginBottom: '14px', borderBottom: '2px solid #1a2744', paddingBottom: '6px' }}>
            注目の打ち上げ
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {notableLaunches.map((l, i) => {
              const { display } = toJST(l.date, l.time)
              const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : ''
              return (
                <div key={l.id || i} style={{
                  borderRadius: '4px', overflow: 'hidden', border: '1px solid #e8e8e8',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ position: 'relative', height: '110px' }}>
                    <img
                      src={getRocketImage(l.rocket)}
                      alt={l.rocket}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '8px 10px 6px', color: '#fff',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{l.rocket}</div>
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    {mission && (
                      <div style={{ fontSize: '12px', color: '#333', fontWeight: 600, marginBottom: '4px', lineHeight: 1.4 }}>
                        {mission}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {display}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      📍 {shortenPad(l.pad)}{l.country ? `（${countryName(l.country)}）` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 打ち上げ予定一覧 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a2744', marginBottom: '14px', borderBottom: '2px solid #1a2744', paddingBottom: '6px' }}>
          打ち上げ予定一覧
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={th}></th>
                <th style={th}>日時 (JST)</th>
                <th style={th}>ロケット</th>
                <th style={th}>ミッション</th>
                <th style={th}>射場</th>
                <th style={th}>状態</th>
              </tr>
            </thead>
            <tbody>
              {launches.map((l, i) => {
                const { display } = toJST(l.date, l.time)
                const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : '-'
                const status = l.status || ''
                const statusLabel = status === 'Go' ? '確定'
                  : status === 'TBC' ? '暫定'
                  : status === 'TBD' ? '未定'
                  : status
                const statusColor = status === 'Go' ? '#2e7d32'
                  : status === 'TBC' ? '#e65100'
                  : status === 'TBD' ? '#999'
                  : '#333'
                return (
                  <tr key={l.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...td, padding: '6px 4px', width: '36px' }}>
                      <img
                        src={getRocketImage(l.rocket)}
                        alt={l.rocket}
                        style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '3px' }}
                      />
                    </td>
                    <td style={{ ...td, fontSize: '12px', whiteSpace: 'nowrap' }}>{display}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#1a2744' }}>{l.rocket}</td>
                    <td style={td}>{mission}</td>
                    <td style={{ ...td, fontSize: '12px', color: '#888' }}>{shortenPad(l.pad)}</td>
                    <td style={{ ...td, color: statusColor, fontWeight: 600, fontSize: '12px' }}>{statusLabel}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 最近の打ち上げ結果 */}
      {recent.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a2744', marginBottom: '14px', borderBottom: '2px solid #1a2744', paddingBottom: '6px' }}>
            最近の打ち上げ結果
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent.map((r, i) => {
              const isSuccess = r.result === 'success'
              return (
                <div key={r.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '4px',
                  backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <img
                    src={getRocketImage(r.rocket)}
                    alt={r.rocket}
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>
                      {isSuccess ? '✅' : '❌'} {r.rocket} / {r.mission || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      {r.date} — {r.resultLabel || (isSuccess ? '成功' : '失敗')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ステータス凡例 */}
      <div style={{
        fontSize: '12px', color: '#888', lineHeight: 2,
        padding: '16px', background: '#f5f5f5', borderRadius: '4px',
        marginBottom: '32px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '4px', color: '#555' }}>ステータスの見方</div>
        <div><span style={{ color: '#2e7d32', fontWeight: 600 }}>確定</span> — 打ち上げ日時が確定</div>
        <div><span style={{ color: '#e65100', fontWeight: 600 }}>暫定</span> — 日時は暫定（変更の可能性あり）</div>
        <div><span style={{ color: '#999', fontWeight: 600 }}>未定</span> — 日時未定</div>
      </div>

      {/* SEO用テキスト */}
      <section style={{ fontSize: '13px', color: '#555', lineHeight: 1.9, marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2744', marginBottom: '8px' }}>
          ロケット打ち上げスケジュールについて
        </h2>
        <p>
          このページでは、世界各国のロケット打ち上げ予定を日本時間（JST）で一覧表示しています。
          SpaceXのFalcon 9やStarship、JAXAのH3ロケット、中国の長征シリーズ、
          欧州のAriane 6など、主要なロケットの打ち上げスケジュールを網羅しています。
        </p>
        <p>
          データはLaunch Library 2 APIから自動取得され、定期的に更新されます。
          打ち上げ日時は各国の宇宙機関や打ち上げ事業者の発表に基づいていますが、
          天候やロケットの整備状況により変更される場合があります。
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

const th = {
  textAlign: 'left', padding: '8px 6px', fontSize: '11px',
  fontWeight: 700, color: '#555', letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '8px 6px', verticalAlign: 'middle', color: '#333',
}
