'use client'

import { useState, useEffect } from 'react'

const COUNTRY_NAMES = {
  US: 'USA', CN: '中国', IN: 'インド', JP: '日本', RU: 'ロシア',
  FR: '欧州', EU: '欧州', DE: 'ドイツ', KR: '韓国', NZ: 'NZ',
  GB: 'UK', BR: 'ブラジル', IL: 'イスラエル', AU: '豪州',
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
  'long march': 'longmarch5_001.jpg',
  'long march 5': 'longmarch5_001.jpg',
  'long march 7': 'longmarch7_001.jpg',
  'long march 8': 'longmarch8_001.jpg',
  'long march 3': 'longmarch5_001.jpg',
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
      <div className="countdown-value" style={{
        fontSize: '36px', fontWeight: 800, color: '#fff',
        fontFamily: 'monospace', lineHeight: 1, minWidth: '56px',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="countdown-label" style={{
        fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.08em', marginTop: '6px',
      }}>
        {label}
      </div>
    </div>
  )
}

function Separator() {
  return (
    <div className="countdown-sep" style={{
      fontSize: '24px', fontWeight: 300, color: 'rgba(255,255,255,0.2)',
      padding: '0 4px', lineHeight: 1,
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
  const heroImage = nextLaunch ? getRocketImage(nextLaunch.rocket) : null

  return (
    <div>
      {/* === HERO: 次の打ち上げカウントダウン === */}
      {nextLaunch && (
        <div className="countdown-hero" style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 40%, #1a2744 100%)',
          borderRadius: '4px',
          padding: '0',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {/* 左: カウントダウン情報 */}
          <div style={{
            flex: 1, padding: '28px 24px 24px',
            position: 'relative', zIndex: 1,
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.12,
              backgroundImage: `
                radial-gradient(1px 1px at 10% 20%, #fff, transparent),
                radial-gradient(1.5px 1.5px at 30% 60%, #fff, transparent),
                radial-gradient(1px 1px at 50% 15%, #fff, transparent),
                radial-gradient(1.5px 1.5px at 70% 45%, #fff, transparent),
                radial-gradient(1px 1px at 85% 75%, #fff, transparent)
              `,
            }} />
            <div style={{ position: 'relative' }}>
              <div className="countdown-title" style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.35)', marginBottom: '14px',
              }}>
                次の打ち上げ
              </div>
              <div className="countdown-rocket" style={{
                fontSize: '26px', fontWeight: 800, color: '#fff',
                marginBottom: '4px', lineHeight: 1.2,
              }}>
                {nextLaunch.rocket}
              </div>
              <div className="countdown-info" style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                marginBottom: '18px',
              }}>
                {nextLaunch.mission && nextLaunch.mission !== 'Unknown Payload' ? nextLaunch.mission + ' | ' : ''}
                {nextLaunch.provider || ''} | {countryName(nextLaunch.country)}
              </div>

              {countdown && (
                <div className="countdown-numbers" style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '16px',
                }}>
                  <CountdownUnit value={countdown.days} label="日" />
                  <Separator />
                  <CountdownUnit value={countdown.hours} label="時間" />
                  <Separator />
                  <CountdownUnit value={countdown.minutes} label="分" />
                  <Separator />
                  <CountdownUnit value={countdown.seconds} label="秒" />
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

          {/* 右: ロケット画像 */}
          {heroImage && (
            <div className="hero-rocket-img" style={{
              width: '280px', flexShrink: 0,
              position: 'relative',
            }}>
              <img src={heroImage} alt={nextLaunch.rocket} style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: 0.7,
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to right, #0f1629 0%, transparent 40%)',
              }} />
            </div>
          )}
        </div>
      )}

      {/* === 打ち上げスケジュール（テーブル形式） === */}
      {(upcomingCards.length > 0 || recent.length > 0) && (
        <div className="launch-section" style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            {recent.length > 0 && (
              <>
                <thead>
                  <tr>
                    <td colSpan={4} style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                      color: '#999', padding: '0 0 6px', borderBottom: '2px solid #e0e0e0',
                    }}>
                      最近の結果
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l, i) => {
                    const isSuccess = l.result === 'success'
                    const { date } = toJST(l.date, null, false)
                    return (
                      <tr key={`r-${l.id || i}`} style={{
                        borderBottom: '1px solid #f0f0f0',
                        background: isSuccess ? '#f8fbf8' : '#fef8f7',
                      }}>
                        <td style={{ padding: '7px 0', width: '80px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700,
                            color: isSuccess ? '#2e7d32' : '#c62828',
                            background: isSuccess ? '#c8e6c9' : '#ffcdd2',
                            padding: '2px 6px', borderRadius: '2px',
                          }}>
                            {l.resultLabel}
                          </span>
                        </td>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: '#333' }}>
                          {l.rocket}
                        </td>
                        <td style={{ padding: '7px 8px', color: '#999', fontSize: '12px', textAlign: 'right' }}>
                          {countryName(l.country)}
                        </td>
                        <td style={{ padding: '7px 0', color: '#bbb', fontSize: '12px', textAlign: 'right', width: '50px' }}>
                          {date}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </>
            )}
            {upcomingCards.length > 0 && (
              <>
                <thead>
                  <tr>
                    <td colSpan={4} style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                      color: '#999', padding: `${recent.length > 0 ? '14px' : '0'} 0 6px`,
                      borderBottom: '2px solid #e0e0e0',
                    }}>
                      今後の打ち上げ
                      <span style={{ fontSize: '9px', color: '#ccc', marginLeft: '8px', fontWeight: 400 }}>
                        Starlink除く
                      </span>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {upcomingCards.map((l, i) => {
                    const { date, time } = toJST(l.date, l.time, l.tentative)
                    const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : ''
                    return (
                      <tr key={l.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{
                          padding: '7px 0', fontWeight: 700, fontSize: '12px',
                          color: '#c62828', whiteSpace: 'nowrap', width: '80px',
                        }}>
                          {l.tentative ? date : `${date}`}
                          {!l.tentative && time && (
                            <span style={{ color: '#999', fontWeight: 400, marginLeft: '4px' }}>{time}</span>
                          )}
                        </td>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: '#1a2744' }}>
                          {l.rocket}
                          {mission && (
                            <span style={{ color: '#aaa', fontWeight: 400, marginLeft: '6px', fontSize: '11px' }}>
                              {mission}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 0', color: '#999', fontSize: '12px', textAlign: 'right' }} colSpan={2}>
                          {countryName(l.country)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
