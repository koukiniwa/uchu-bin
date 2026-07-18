'use client'

import { useState, useEffect } from 'react'

function countryFlag(code) {
  if (!code || code.length < 2) return ''
  const iso2 = code.length === 2 ? code : {
    USA: 'US', CHN: 'CN', IND: 'IN', JPN: 'JP', RUS: 'RU', FRA: 'FR',
    GUF: 'FR', KOR: 'KR', NZL: 'NZ', GBR: 'GB', DEU: 'DE', BRA: 'BR',
    IRN: 'IR', ISR: 'IL', KAZ: 'KZ', AUS: 'AU', MHL: 'MH',
  }[code] || code.slice(0, 2)
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function formatDate(dateStr, timeStr, tentative) {
  if (!dateStr) return { date: 'TBD', time: '' }
  const [, m, d] = dateStr.split('-')
  const month = parseInt(m)
  const day = parseInt(d)
  if (tentative) return { date: `${month}/${day}`, time: 'TBD' }
  if (timeStr) {
    const [h, min] = timeStr.split(':')
    let jstH = parseInt(h) + 9
    let jstDay = day
    if (jstH >= 24) { jstH -= 24; jstDay += 1 }
    return { date: `${month}/${jstDay}`, time: `${String(jstH).padStart(2, '0')}:${min} JST` }
  }
  return { date: `${month}/${day}`, time: '' }
}

// 日付が近いものにラベルをつける
function getUrgencyLabel(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const launch = new Date(dateStr + 'T00:00:00Z')
  const diffDays = Math.floor((launch - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'TODAY'
  if (diffDays <= 1) return 'TOMORROW'
  if (diffDays <= 3) return 'SOON'
  return null
}

export default function UpcomingLaunches() {
  const [launches, setLaunches] = useState([])

  useEffect(() => {
    fetch('/data/launches.json')
      .then(r => r.json())
      .then(data => setLaunches(data.launches || []))
      .catch(() => {})
  }, [])

  if (launches.length === 0) return null

  const visible = launches.slice(0, 10)

  return (
    <div style={{
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
      background: '#fff',
    }}>
      {/* ヘッダー */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1629 0%, #1a2744 100%)',
        color: '#fff',
        padding: '12px 14px 10px',
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '16px' }}>🚀</span>
          打ち上げ予定
        </div>
        <div style={{
          fontSize: '9px',
          color: 'rgba(255,255,255,0.45)',
          marginTop: '4px',
          letterSpacing: '0.04em',
        }}>
          Starlink定期便を除く全世界の打ち上げ
        </div>
      </div>

      {/* 打ち上げリスト */}
      <div>
        {visible.map((l, i) => {
          const { date, time } = formatDate(l.date, l.time, l.tentative)
          const urgency = getUrgencyLabel(l.date)
          const flag = countryFlag(l.country)
          const missionText = l.mission && l.mission !== 'Unknown Payload' ? l.mission : l.provider

          return (
            <div key={l.id || i} style={{
              padding: '10px 14px',
              borderBottom: i < visible.length - 1 ? '1px solid #f0f0f0' : 'none',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}>
              {/* 日付カラム */}
              <div style={{
                minWidth: '44px',
                textAlign: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: urgency ? '#d32f2f' : '#1a2744',
                  lineHeight: 1.2,
                }}>
                  {date}
                </div>
                {time && (
                  <div style={{
                    fontSize: '9px',
                    color: l.tentative ? '#bbb' : '#666',
                    marginTop: '2px',
                  }}>
                    {time}
                  </div>
                )}
                {urgency && (
                  <div style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#fff',
                    background: urgency === 'TODAY' ? '#d32f2f' : urgency === 'TOMORROW' ? '#e65100' : '#f57c00',
                    borderRadius: '3px',
                    padding: '1px 4px',
                    marginTop: '3px',
                    display: 'inline-block',
                  }}>
                    {urgency}
                  </div>
                )}
              </div>

              {/* 詳細カラム */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1a2744',
                  lineHeight: 1.3,
                }}>
                  {flag && <span style={{ marginRight: '4px' }}>{flag}</span>}
                  {l.rocket}
                </div>
                {missionText && (
                  <div style={{
                    fontSize: '11px',
                    color: '#777',
                    marginTop: '2px',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {missionText}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
