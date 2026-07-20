'use client'

import { useState, useEffect } from 'react'

const COUNTRY_NAMES = {
  US: 'USA', CN: '中国', IN: 'インド', JP: '日本', RU: 'ロシア',
  FR: '欧州', EU: '欧州', DE: 'ドイツ', KR: '韓国', NZ: 'NZ',
  GB: 'UK', BR: 'ブラジル', IL: 'イスラエル', IR: 'イラン', AU: '豪州',
}

function countryName(code) {
  if (!code) return ''
  const iso2 = code.length === 2 ? code : {
    USA: 'US', CHN: 'CN', IND: 'IN', JPN: 'JP', RUS: 'RU', FRA: 'FR',
    GUF: 'FR', KOR: 'KR', NZL: 'NZ', GBR: 'GB', DEU: 'DE', BRA: 'BR',
    IRN: 'IR', ISR: 'IL', KAZ: 'KZ', AUS: 'AU', MHL: 'MH',
  }[code] || code.slice(0, 2)
  return COUNTRY_NAMES[iso2] || iso2
}

function formatDate(dateStr, timeStr, tentative) {
  if (!dateStr) return { date: 'TBD', time: '' }
  const [, m, d] = dateStr.split('-')
  const month = parseInt(m)
  const day = parseInt(d)
  if (tentative) return { date: `${month}月`, time: '' }
  if (timeStr) {
    const [h, min] = timeStr.split(':')
    let jstH = parseInt(h) + 9
    let jstDay = day
    if (jstH >= 24) { jstH -= 24; jstDay += 1 }
    return { date: `${month}/${jstDay}`, time: `${String(jstH).padStart(2, '0')}:${min}` }
  }
  return { date: `${month}/${day}`, time: '' }
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const launch = new Date(dateStr + 'T00:00:00Z')
  return Math.floor((launch - now) / (1000 * 60 * 60 * 24))
}

export default function UpcomingLaunches() {
  const [launches, setLaunches] = useState([])
  const [recent, setRecent] = useState([])

  useEffect(() => {
    const load = () => {
      fetch(`/data/launches.json?t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          setLaunches(data.launches || [])
          setRecent(data.recent || [])
        })
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (launches.length === 0 && recent.length === 0) return null

  const visible = launches.slice(0, recent.length > 0 ? 8 : 10)

  return (
    <div style={{
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0',
      background: '#fff',
    }}>
      <div style={{
        background: '#0f1629',
        padding: '11px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.1em',
        }}>
          LAUNCH SCHEDULE
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
          Starlink除く
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #1a2744' }}>
            <th style={{ padding: '6px 8px 6px 14px', textAlign: 'left', fontSize: '9px', fontWeight: 700, color: '#999', letterSpacing: '0.08em' }}>日時</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: '9px', fontWeight: 700, color: '#999', letterSpacing: '0.08em' }}>ロケット</th>
            <th style={{ padding: '6px 14px 6px 8px', textAlign: 'right', fontSize: '9px', fontWeight: 700, color: '#999', letterSpacing: '0.08em' }}>国</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((l, i) => {
            const { date } = formatDate(l.date, null, false)
            const country = countryName(l.country)
            const isSuccess = l.result === 'success'
            const resultColor = isSuccess ? '#2e7d32' : '#c62828'
            const resultBg = isSuccess ? '#e8f5e9' : '#fbe9e7'
            return (
              <tr key={`r-${l.id || i}`} style={{
                borderBottom: '1px solid #f0f0f0',
                background: resultBg,
                borderLeft: `3px solid ${resultColor}`,
              }}>
                <td style={{ padding: '6px 8px 6px 11px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: '#555', fontSize: '11px' }}>{date}</div>
                </td>
                <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: '#333', fontSize: '11.5px', lineHeight: 1.3 }}>
                    {l.rocket}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: resultColor,
                    background: isSuccess ? '#c8e6c9' : '#ffcdd2',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    letterSpacing: '0.05em',
                  }}>
                    {l.resultLabel}
                  </span>
                </td>
                <td style={{
                  padding: '6px 14px 6px 8px',
                  verticalAlign: 'top',
                  textAlign: 'right',
                  fontSize: '10px',
                  color: '#888',
                }}>
                  {country}
                </td>
              </tr>
            )
          })}
          {recent.length > 0 && visible.length > 0 && (
            <tr><td colSpan={3} style={{ padding: 0, borderBottom: '2px solid #e0e0e0' }} /></tr>
          )}
          {visible.map((l, i) => {
            const { date, time } = formatDate(l.date, l.time, l.tentative)
            const days = getDaysUntil(l.date)
            const isImminent = days !== null && days <= 3
            const country = countryName(l.country)
            const missionText = l.mission && l.mission !== 'Unknown Payload' ? l.mission : ''

            return (
              <tr key={l.id || i} style={{
                borderBottom: i < visible.length - 1 ? '1px solid #f0f0f0' : 'none',
                background: isImminent ? '#fafafa' : 'transparent',
              }}>
                <td style={{ padding: '8px 8px 8px 14px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: isImminent ? '#c62828' : '#1a2744', fontSize: '12px' }}>
                    {date}
                  </div>
                  {time && (
                    <div style={{ fontSize: '9px', color: '#999', marginTop: '1px' }}>{time}</div>
                  )}
                </td>
                <td style={{ padding: '8px 8px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: '#1a2744', fontSize: '12px', lineHeight: 1.3 }}>
                    {l.rocket}
                  </div>
                  {missionText && (
                    <div style={{
                      fontSize: '10px',
                      color: '#999',
                      marginTop: '1px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '120px',
                    }}>
                      {missionText}
                    </div>
                  )}
                </td>
                <td style={{
                  padding: '8px 14px 8px 8px',
                  verticalAlign: 'top',
                  textAlign: 'right',
                  fontSize: '10px',
                  color: '#888',
                  whiteSpace: 'nowrap',
                }}>
                  {country}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
