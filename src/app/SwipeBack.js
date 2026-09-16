'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()

  useEffect(() => {
    let startX = 0
    let startY = 0

    function onTouchStart(e) {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
    }

    function onTouchEnd(e) {
      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX
      const dy = Math.abs(touch.clientY - startY)
      // 右に100px以上スワイプ、かつ縦移動より横移動が大きい場合のみ戻る
      if (dx > 100 && dx > dy * 2) {
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
