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
  'long march 3': 'longmarch3_001.jpg',
  'long march 5': 'longmarch5_001.jpg',
  'long march 7': 'longmarch7_001.jpg',
  'long march 8': 'longmarch8_001.jpg',
  'long march': 'longmarch5_001.jpg',
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
    date: `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`,
    time: `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`,
    fullDate: utc,
  }
}

function relativeDate(dateStr, timeStr, tentative) {
  if (!dateStr || tentative) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = timeStr
    ? new Date(Date.UTC(y, m - 1, d, ...timeStr.split(':').map(Number)))
    : new Date(Date.UTC(y, m - 1, d))
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const todayStart = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate()))
  const targetStart = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()))
  const diffDays = Math.round((targetStart - todayStart) / 86400000)
  if (diffDays < -1) return `${Math.abs(diffDays)}日前`
  if (diffDays === -1) return '昨日'
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  if (diffDays === 2) return '明後日'
  if (diffDays <= 7) return `${diffDays}日後`
  return null
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
    const now = new Date()
    const upcoming = launches.filter(l => {
      if (l.tentative || !l.time) return false
      const utc = new Date(l.date + 'T' + l.time + ':00Z')
      return utc.getTime() > now.getTime()
    })
    const first = upcoming[0]
    if (!first) return
    const { fullDate } = toJST(first.date, first.time)
    setNextLaunch({ ...first, fullDate })
  }, [launches, countdown])

  useEffect(() => {
    if (!nextLaunch?.fullDate) return
    const tick = () => setCountdown(getCountdown(nextLaunch.fullDate))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [nextLaunch])

  const now = new Date()
  const futureLaunches = launches.filter(l => {
    if (l.tentative || !l.time) return true
    const utc = new Date(l.date + 'T' + l.time + ':00Z')
    return utc.getTime() > now.getTime()
  })
  const upcomingCards = nextLaunch
    ? futureLaunches.filter(l => l.id !== nextLaunch.id).slice(0, 10)
    : futureLaunches.slice(0, 10)
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
          {/* スマホ用: 背景画像 */}
          {heroImage && (
            <div className="countdown-hero-bg">
              <img src={heroImage} alt="" />
            </div>
          )}
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

      {/* === 打ち上げスケジュール（結果+予定を統一カード形式で） === */}
      {upcomingCards.length > 0 && (
        <div className="launch-section" style={{ marginBottom: '20px' }}>
          <div className="launch-section-title" style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
            color: '#999', marginBottom: '10px',
          }}>
            打ち上げスケジュール
            <span style={{ fontSize: '9px', color: '#ccc', marginLeft: '10px', letterSpacing: '0.04em', fontWeight: 400 }}>
              Starlink除く
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="scroll-arrow scroll-arrow-left" onClick={() => {
              const el = document.querySelector('.launch-cards')
              if (el) el.scrollBy({ left: -200, behavior: 'smooth' })
            }}>&#8249;</button>
            <button className="scroll-arrow scroll-arrow-right" onClick={() => {
              const el = document.querySelector('.launch-cards')
              if (el) el.scrollBy({ left: 200, behavior: 'smooth' })
            }}>&#8250;</button>
            <div className="launch-cards">
              {upcomingCards.map((l, i) => {
                const { date, time } = toJST(l.date, l.time, l.tentative)
                const rel = relativeDate(l.date, l.time, l.tentative)
                const country = countryName(l.country)
                const mission = l.mission && l.mission !== 'Unknown Payload' ? l.mission : ''
                const rocketImg = getRocketImage(l.rocket)
                const dateLabel = rel
                  ? (time ? `${rel} ${time}` : rel)
                  : (l.tentative ? date : `${date} ${time || ''}`)
                return (
                  <div key={l.id || i} style={{
                    background: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '3px',
                    minWidth: '155px',
                    flex: '1 0 155px',
                    overflow: 'hidden',
                  }}>
                    {rocketImg && (
                      <div style={{ height: '80px', overflow: 'hidden' }}>
                        <img src={rocketImg} alt={l.rocket} style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                        }} />
                      </div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a2744', marginBottom: '3px' }}>
                        {dateLabel}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2744', marginBottom: '2px', lineHeight: 1.3 }}>
                        {l.rocket}
                      </div>
                      {mission && (
                        <div style={{ fontSize: '10px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mission}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{country}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
