'use client'

import { useState, useEffect } from 'react'

function getCountdown(date, time) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const target = new Date(Date.UTC(y, m - 1, d, h, min))
  const diff = target - new Date()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

export default function ScheduleCountdown({ rocket, date, time, mission }) {
  const [cd, setCd] = useState(null)

  useEffect(() => {
    const tick = () => setCd(getCountdown(date, time))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [date, time])

  if (!cd) return null

  const missionLabel = mission && mission !== 'Unknown Payload' ? mission : null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 40%, #1a2744 100%)',
      borderRadius: '6px', padding: '20px 24px', marginBottom: '24px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
        次の打ち上げ
      </div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
        {rocket}
      </div>
      {missionLabel && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
          {missionLabel}
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {[
          { v: cd.days, l: '日' },
          { v: cd.hours, l: '時間' },
          { v: cd.minutes, l: '分' },
          { v: cd.seconds, l: '秒' },
        ].map(({ v, l }) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>
              {String(v).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
