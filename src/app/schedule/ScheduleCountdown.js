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

export default function ScheduleCountdown({ date, time }) {
  const [cd, setCd] = useState(null)

  useEffect(() => {
    const tick = () => setCd(getCountdown(date, time))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [date, time])

  if (!cd) return null

  return (
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
  )
}
