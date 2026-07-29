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
  if (!dateStr) return { display: 'TBD', sortKey: '' }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!timeStr) return { display: `${y}年${m}月${d}日（時刻未定）`, sortKey: dateStr }
  const [h, min] = timeStr.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, h, min))
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const jstStr = `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日 ${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')} JST`
  return { display: jstStr, sortKey: dateStr + 'T' + timeStr }
}

function getLaunches() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'launches.json')
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return data
  } catch {
    return { launches: [], updated: '' }
  }
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
  const updated = data.updated

  // 最初の時刻確定済み打ち上げ（カウントダウン用）
  const firstTimed = launches.find(l => l.time && !l.tentative)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <a href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#1a2744', textDecoration: 'none',
        marginBottom: '24px', fontWeight: 600,
      }}>
        ← ホームへ
      </a>

      <h1 style={{
        fontSize: '22px', fontWeight: 800, color: '#111',
        lineHeight: 1.6, margin: '0 0 8px 0',
      }}>
        ロケット打ち上げ予定スケジュール {year}
      </h1>
      <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px 0' }}>
        世界中のロケット打ち上げ予定を日本時間（JST）で掲載しています。データは自動更新されます。
      </p>

      {/* カウントダウン（クライアントコンポーネント） */}
      {firstTimed && (
        <ScheduleCountdown
          rocket={firstTimed.rocket}
          date={firstTimed.date}
          time={firstTimed.time}
          mission={firstTimed.mission}
        />
      )}

      {/* 打ち上げ一覧テーブル */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse', fontSize: '13px',
          marginBottom: '32px',
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1a2744' }}>
              <th style={th}>日時 (JST)</th>
              <th style={th}>ロケット</th>
              <th style={th}>ミッション</th>
              <th style={th}>射場</th>
              <th style={th}>国</th>
              <th style={th}>状態</th>
            </tr>
          </thead>
          <tbody>
            {launches.map((l, i) => {
              const { display } = toJST(l.date, l.time)
              const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : '-'
              const status = l.status || ''
              const statusColor = status === 'Go' ? '#2e7d32'
                : status === 'TBC' ? '#e65100'
                : status === 'TBD' ? '#999'
                : '#333'
              return (
                <tr key={l.id || i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{display}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#1a2744' }}>{l.rocket}</td>
                  <td style={td}>{mission}</td>
                  <td style={td}>{shortenPad(l.pad)}</td>
                  <td style={td}>{countryName(l.country)}</td>
                  <td style={{ ...td, color: statusColor, fontWeight: 600 }}>{status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ステータス凡例 */}
      <div style={{
        fontSize: '12px', color: '#888', lineHeight: 2,
        padding: '16px', background: '#f5f5f5', borderRadius: '4px',
        marginBottom: '32px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '4px', color: '#555' }}>ステータスの見方</div>
        <div><span style={{ color: '#2e7d32', fontWeight: 600 }}>Go</span> — 打ち上げ日時確定</div>
        <div><span style={{ color: '#e65100', fontWeight: 600 }}>TBC</span> — 日時は暫定（変更の可能性あり）</div>
        <div><span style={{ color: '#999', fontWeight: 600 }}>TBD</span> — 日時未定</div>
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
  textAlign: 'left', padding: '10px 8px', fontSize: '11px',
  fontWeight: 700, color: '#555', letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '10px 8px', verticalAlign: 'top', color: '#333',
}
