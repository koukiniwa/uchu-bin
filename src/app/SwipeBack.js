'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const state = useRef({ startX: 0, startY: 0, swiping: false })

  useEffect(() => {
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.3)', opacity: '0', pointerEvents: 'none',
      zIndex: '9998', transition: 'none',
    })
    document.body.appendChild(overlay)

    const page = document.querySelector('main')?.parentElement || document.body.firstElementChild
    let threshold = window.innerWidth * 0.35

    function onTouchStart(e) {
      const t = e.touches[0]
      state.current = { startX: t.clientX, startY: t.clientY, swiping: false }
      threshold = window.innerWidth * 0.35
    }

    function onTouchMove(e) {
      const t = e.touches[0]
      const dx = t.clientX - state.current.startX
      const dy = Math.abs(t.clientY - state.current.startY)

      if (!state.current.swiping) {
        if (dx > 10 && dx > dy * 1.5) {
          state.current.swiping = true
        } else if (dy > 10) {
          return
        } else {
          return
        }
      }

      if (!state.current.swiping) return

      const progress = Math.max(0, Math.min(dx / window.innerWidth, 1))
      page.style.transform = `translateX(${dx}px)`
      page.style.transition = 'none'
      overlay.style.opacity = String(1 - progress)
      overlay.style.transition = 'none'
      overlay.style.pointerEvents = 'auto'
    }

    function onTouchEnd(e) {
      if (!state.current.swiping) return
      state.current.swiping = false

      const t = e.changedTouches[0]
      const dx = t.clientX - state.current.startX

      if (dx > threshold) {
        // スライドアウトアニメーション後に戻る
        page.style.transition = 'transform 0.25s ease-out'
        page.style.transform = `translateX(${window.innerWidth}px)`
        overlay.style.transition = 'opacity 0.25s ease-out'
        overlay.style.opacity = '0'
        setTimeout(() => {
          router.back()
          // 戻った後にリセット
          requestAnimationFrame(() => {
            page.style.transition = 'none'
            page.style.transform = ''
            overlay.style.pointerEvents = 'none'
          })
        }, 250)
      } else {
        // 元に戻すアニメーション
        page.style.transition = 'transform 0.2s ease-out'
        page.style.transform = ''
        overlay.style.transition = 'opacity 0.2s ease-out'
        overlay.style.opacity = '0'
        setTimeout(() => {
          overlay.style.pointerEvents = 'none'
        }, 200)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      overlay.remove()
    }
  }, [router])

  return null
}
