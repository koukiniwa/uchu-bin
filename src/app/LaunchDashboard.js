'use client'

import { useState, useEffect } from 'react'

const COUNTRY_NAMES = {
  US: 'USA', CN: '中国', IN: 'インド', JP: '日本', RU: 'ロシア',
  FR: '欧州', EU: '欧州', DE: 'ドイツ', KR: '韓国', NZ: 'NZ',
  GB: 'UK', BR: 'ブラジル', IL: 'イスラエル', AU: '豪州',
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

function toJST(dateStr, timeStr) {
  if (!dateStr) return { date: 'TBD', time: '', fullDate: null }
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!timeStr) return { date: `${m}月`, time: '', fullDate: null }
  const [h, min] = timeStr.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, h, min))
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  return {
    date: `${jst.getMonth() + 1}/${jst.getDate()}`,
    time: `${String(jst.getHours()).padStart(2, '0')}:${String(jst.getMinutes()).padStart(2, '0')}`,
    fullDate: utc,
  }
}

function getCountdown(targetDate) {
  if (!targetDate) return null
  const diff = targetDate - new Date()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

function CountdownUnit({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '36px',
        fontWeight: 800,
        color: '#fff',
        fontFamily: 'monospace',
        lineHeight: 1,
        minWidth: '56px',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{
        fontSize: '9px',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.15em',
        marginTop: '6px',
      }}>
        {label}
      </div>
    </div>
  )
}

function Separator() {
  return (
    <div style={{
      fontSize: '24px',
      fontWeight: 300,
      color: 'rgba(255,255,255,0.2)',
      padding: '0 4px',
      lineHeight: 1,
    }}>:</div>
  )
}

export default function LaunchDashboard() {
  const [launches, setLaunches] = useState([])
  const [recent, setRecent] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [nextLaunch, setNextLaunch] = useState(null)

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
    const fetchInterval = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(fetchInterval)
  }, [])

  useEffect(() => {
    if (launches.length === 0) return
    const first = launches.find(l => !l.tentative && l.time)
    if (!first) return
    const { fullDate } = toJST(first.date, first.time)
    setNextLaunch({ ...first, fullDate })
  }, [launches])

  useEffect(() => {
    if (!nextLaunch?.fullDate) return
    const tick = () => setCountdown(getCountdown(nextLaunch.fullDate))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [nextLaunch])

  const upcomingCards = launches.slice(nextLaunch ? 1 : 0, 6)
  const nextJST = nextLaunch ? toJST(nextLaunch.date, nextLaunch.time) : null

  return (
    <div>
      {/* === HERO: Next Launch Countdown === */}
      {nextLaunch && (
        <div style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 40%, #1a2744 100%)',
          borderRadius: '12px',
          padding: '40px 32px 36px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            backgroundImage: `
              radial-gradient(1px 1px at 10% 20%, #fff, transparent),
              radial-gradient(1.5px 1.5px at 30% 60%, #fff, transparent),
              radial-gradient(1px 1px at 50% 15%, #fff, transparent),
              radial-gradient(1.5px 1.5px at 70% 45%, #fff, transparent),
              radial-gradient(1px 1px at 85% 75%, #fff, transparent),
              radial-gradient(1px 1px at 95% 30%, #fff, transparent)
            `,
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.35)', marginBottom: '16px',
            }}>
              NEXT LAUNCH
            </div>
            <div style={{
              fontSize: '28px', fontWeight: 800, color: '#fff',
              marginBottom: '4px', lineHeight: 1.2,
            }}>
              {nextLaunch.rocket}
            </div>
            <div style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.5)',
              marginBottom: '28px',
            }}>
              {nextLaunch.mission && nextLaunch.mission !== 'Unknown Payload' ? nextLaunch.mission + ' | ' : ''}
              {nextLaunch.provider || ''} | {countryName(nextLaunch.country)}
            </div>

            {countdown && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '20px',
              }}>
                <CountdownUnit value={countdown.days} label="DAYS" />
                <Separator />
                <CountdownUnit value={countdown.hours} label="HRS" />
                <Separator />
                <CountdownUnit value={countdown.minutes} label="MIN" />
                <Separator />
                <CountdownUnit value={countdown.seconds} label="SEC" />
              </div>
            )}

            {nextJST && (
              <div style={{
                fontSize: '12px', color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.05em',
              }}>
                {nextJST.date} {nextJST.time} JST
              </div>
            )}
          </div>
        </div>
      )}

      {/* === UPCOMING LAUNCHES === */}
      {upcomingCards.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            color: '#999', marginBottom: '14px',
          }}>
            UPCOMING
            <span style={{ fontSize: '9px', color: '#ccc', marginLeft: '12px', letterSpacing: '0.05em', fontWeight: 400 }}>
              Starlink除く
            </span>
          </div>
          <div className="launch-cards">
            {upcomingCards.map((l, i) => {
              const { date, time } = toJST(l.date, l.time, l.tentative)
              const country = countryName(l.country)
              const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : ''
              return (
                <div key={l.id || i} style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  minWidth: '160px',
                  flex: '1 0 160px',
                }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 700, color: '#c62828',
                    marginBottom: '8px',
                  }}>
                    {l.tentative ? `${date}` : `${date} ${time || ''}`}
                  </div>
                  <div style={{
                    fontSize: '14px', fontWeight: 700, color: '#1a2744',
                    marginBottom: '4px', lineHeight: 1.3,
                  }}>
                    {l.rocket}
                  </div>
                  {mission && (
                    <div style={{
                      fontSize: '11px', color: '#999',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {mission}
                    </div>
                  )}
                  <div style={{
                    fontSize: '10px', color: '#aaa', marginTop: '6px',
                  }}>
                    {country}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === RECENT RESULTS === */}
      {recent.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
            color: '#999', marginBottom: '14px',
          }}>
            RECENT RESULTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recent.map((l, i) => {
              const isSuccess = l.result === 'success'
              const { date } = toJST(l.date, null, false)
              const country = countryName(l.country)
              return (
                <div key={`r-${l.id || i}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  background: isSuccess ? '#f6faf6' : '#fef6f5',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${isSuccess ? '#2e7d32' : '#c62828'}`,
                }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    color: isSuccess ? '#2e7d32' : '#c62828',
                    background: isSuccess ? '#c8e6c9' : '#ffcdd2',
                    padding: '2px 8px', borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}>
                    {l.resultLabel}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#333', flex: 1 }}>
                    {l.rocket}
                  </span>
                  <span style={{ fontSize: '11px', color: '#999' }}>{country}</span>
                  <span style={{ fontSize: '11px', color: '#bbb' }}>{date}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
