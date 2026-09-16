'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()

  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false

    function onTouchStart(e) {
      const touch = e.touches[0]
      if (touch.clientX < 30) {
        startX = touch.clientX
        startY = touch.clientY
        tracking = true
      }
    }

    function onTouchEnd(e) {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX
      const dy = Math.abs(touch.clientY - startY)
      if (dx > 80 && dy < 100) {
        router.back()
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [router])

  return null
}
