import fs from 'fs'
import path from 'path'
import ScheduleCountdown from './ScheduleCountdown'

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

function statusInfo(status) {
  if (status === 'Go') return { label: '確定', color: '#2e7d32', bg: '#e8f5e9' }
  if (status === 'TBC') return { label: '暫定', color: '#e65100', bg: '#fff3e0' }
  if (status === 'TBD') return { label: '未定', color: '#777', bg: '#f5f5f5' }
  return { label: status || '', color: '#333', bg: '#f5f5f5' }
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

      {/* カウントダウン */}
      {firstTimed && (
        <div className="schedule-countdown" style={{
          position: 'relative', borderRadius: '10px', overflow: 'hidden',
          marginBottom: '28px',
        }}>
          <img
            src={getRocketImage(firstTimed.rocket)}
            alt={firstTimed.rocket}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'brightness(0.3)',
            }}
          />
          <div style={{
            position: 'relative', zIndex: 1, padding: '28px 28px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase',
            }}>
              NEXT LAUNCH
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              {firstTimed.rocket}
            </div>
            {firstTimed.mission && firstTimed.mission !== 'Unknown Payload' && (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
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

      {/* 注目の打ち上げページへの導線 */}
      <section style={{ marginBottom: '28px' }}>
        <a href="/featured" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a2744 100%)',
          borderRadius: '8px', textDecoration: 'none', color: '#fff',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
              注目の打ち上げ
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Starship、H3、有人飛行など注目ミッションを厳選紹介
            </div>
          </div>
          <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)', marginLeft: '12px' }}>→</div>
        </a>
      </section>

      {/* 打ち上げ予定一覧 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '15px', fontWeight: 700, color: '#1a2744',
          marginBottom: '16px', borderBottom: '2px solid #1a2744', paddingBottom: '6px',
        }}>
          打ち上げ予定一覧
        </h2>

        {/* PC: テーブル表示 */}
        <div className="schedule-table-wrap">
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
                const si = statusInfo(l.status)
                return (
                  <tr key={l.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...td, padding: '8px 4px', width: '40px' }}>
                      <img
                        src={getRocketImage(l.rocket)}
                        alt={l.rocket}
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ ...td, fontSize: '12px', whiteSpace: 'nowrap' }}>{display}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#1a2744' }}>{l.rocket}</td>
                    <td style={td}>{mission}</td>
                    <td style={{ ...td, fontSize: '12px', color: '#888' }}>
                      {countryFlag(l.country)} {shortenPad(l.pad)}
                    </td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                        fontSize: '11px', fontWeight: 600,
                        color: si.color, backgroundColor: si.bg,
                      }}>
                        {si.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* スマホ: カード表示 */}
        <div className="schedule-cards-wrap">
          {launches.map((l, i) => {
            const { display } = toJST(l.date, l.time)
            const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : ''
            const si = statusInfo(l.status)
            const pad = shortenPad(l.pad)
            const flag = countryFlag(l.country)

            return (
              <div key={l.id || i} className="schedule-card" style={{
                display: 'flex', gap: '12px', padding: '14px',
                backgroundColor: '#fff', borderRadius: '8px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <img
                  src={getRocketImage(l.rocket)}
                  alt={l.rocket}
                  style={{
                    width: '64px', height: '64px', objectFit: 'cover',
                    borderRadius: '6px', flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1a2744' }}>
                      {l.rocket}
                    </span>
                    <span style={{
                      display: 'inline-block', padding: '1px 7px', borderRadius: '10px',
                      fontSize: '10px', fontWeight: 600,
                      color: si.color, backgroundColor: si.bg, flexShrink: 0,
                    }}>
                      {si.label}
                    </span>
                  </div>
                  {mission && (
                    <div style={{
                      fontSize: '12px', color: '#555', marginBottom: '4px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {mission}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#999', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{display}</span>
                    {pad && <span>{flag} {pad}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 最近の打ち上げ結果 */}
      {recent.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '15px', fontWeight: 700, color: '#1a2744',
            marginBottom: '14px', borderBottom: '2px solid #1a2744', paddingBottom: '6px',
          }}>
            最近の打ち上げ結果
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent.map((r, i) => {
              const isSuccess = r.result === 'success'
              return (
                <div key={r.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px',
                  backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <img
                    src={getRocketImage(r.rocket)}
                    alt={r.rocket}
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
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
        padding: '16px', background: '#f5f5f5', borderRadius: '8px',
        marginBottom: '32px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '4px', color: '#555' }}>ステータスの見方</div>
        <div><span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, fontSize: '11px', marginRight: '6px' }}>確定</span>打ち上げ日時が確定</div>
        <div><span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 600, fontSize: '11px', marginRight: '6px' }}>暫定</span>日時は暫定（変更の可能性あり）</div>
        <div><span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: '10px', backgroundColor: '#f0f0f0', color: '#777', fontWeight: 600, fontSize: '11px', marginRight: '6px' }}>未定</span>日時未定</div>
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
