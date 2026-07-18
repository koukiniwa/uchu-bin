'use client'

import { useState, useEffect } from 'react'

// 国コードから国旗絵文字に変換
function countryFlag(code) {
  if (!code || code.length !== 3) return ''
  // 3文字ISOを2文字に（よくあるもの）
  const map = { USA: 'US', CHN: 'CN', IND: 'IN', JPN: 'JP', RUS: 'RU', FRA: 'FR', GUF: 'FR', KOR: 'KR', NZL: 'NZ', GBR: 'GB', DEU: 'DE', BRA: 'BR', IRN: 'IR', ISR: 'IL', KAZ: 'KZ', AUS: 'AU', MHL: 'MH' }
  const iso2 = map[code] || code.slice(0, 2)
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function formatDate(dateStr, timeStr, tentative) {
  if (!dateStr) return 'TBD'
  const [, m, d] = dateStr.split('-')
  const month = parseInt(m)
  const day = parseInt(d)
  if (tentative) return `${month}/${day} TBD`
  if (timeStr) {
    const [h, min] = timeStr.split(':')
    const utcH = parseInt(h)
    const utcM = parseInt(min)
    // UTC -> JST (+9h)
    let jstH = utcH + 9
    let jstDay = day
    let jstMonth = month
    if (jstH >= 24) { jstH -= 24; jstDay += 1 }
    return `${jstMonth}/${jstDay} ${String(jstH).padStart(2, '0')}:${String(utcM).padStart(2, '0')} JST`
  }
  return `${month}/${day}`
}

export default function UpcomingLaunches() {
  const [launches, setLaunches] = useState([])
  const [updated, setUpdated] = useState('')

  useEffect(() => {
    fetch('/data/launches.json')
      .then(r => r.json())
      .then(data => {
        setLaunches(data.launches || [])
        if (data.updated) {
          const d = new Date(data.updated)
          setUpdated(`${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`)
        }
      })
      .catch(() => {})
  }, [])

  if (launches.length === 0) return null

  // 直近8件のみ表示
  const visible = launches.slice(0, 8)

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      overflow: 'hidden',
      marginTop: '12px',
      background: '#fff',
    }}>
      <div style={{
        background: '#0f1629',
        color: '#fff',
        padding: '10px 12px',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ fontSize: '15px' }}>🚀</span>
        注目の打ち上げ予定
      </div>
      <div style={{ padding: '4px 0' }}>
        {visible.map((l, i) => (
          <div key={l.id || i} style={{
            padding: '8px 12px',
            borderBottom: i < visible.length - 1 ? '1px solid #f0f0f0' : 'none',
            fontSize: '12px',
            lineHeight: 1.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontWeight: 700, color: '#1a2744', fontSize: '12px' }}>
                {countryFlag(l.country)} {l.rocket}
              </span>
              <span style={{
                fontSize: '10px',
                color: l.tentative ? '#999' : '#0066cc',
                fontWeight: l.tentative ? 400 : 600,
                whiteSpace: 'nowrap',
              }}>
                {formatDate(l.date, l.time, l.tentative)}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {l.mission && l.mission !== 'Unknown Payload' ? l.mission : l.provider}
            </div>
          </div>
        ))}
      </div>
      {updated && (
        <div style={{ padding: '4px 12px 6px', fontSize: '9px', color: '#bbb', textAlign: 'right' }}>
          更新: {updated}
        </div>
      )}
    </div>
  )
}
