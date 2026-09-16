'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false, decided: false })
  const historyStack = useRef([])
  const prevPathname = useRef(null)

  useEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname
      return
    }
    if (prevPathname.current !== pathname) {
      historyStack.current.push(prevPathname.current)
      if (historyStack.current.length > 10) historyStack.current.shift()
      prevPathname.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    let threshold = 0
    let savedScrollY = 0

    function getWrapper() {
      return document.getElementById('page-wrapper')
    }

    function isSubPage() {
      const p = window.location.pathname
      return p !== '/' && p !== ''
    }

    function getBackUrl() {
      if (historyStack.current.length > 0) {
        return historyStack.current[historyStack.current.length - 1]
      }
      if (window.location.pathname.startsWith('/blog/')) return '/'
      if (window.location.pathname.startsWith('/rockets/')) return '/rockets'
      return '/'
    }

    function canSwipeBack() {
      if (!isSubPage()) return false
      return historyStack.current.length > 0 || window.history.length > 1
    }

    function onTouchStart(e) {
      const t = e.touches[0]
      state.current = { startX: t.clientX, startY: t.clientY, swiping: false, decided: false }
      threshold = window.innerWidth * 0.2
    }

    function onTouchMove(e) {
      const t = e.touches[0]
      const dx = t.clientX - state.current.startX
      const dy = Math.abs(t.clientY - state.current.startY)

      if (state.current.decided && !state.current.swiping) return

      if (!state.current.swiping) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 15) return

        state.current.decided = true

        if (dx > 0 && dx >= dy * 0.7) {
          if (!canSwipeBack()) return
          const w = getWrapper()
          if (!w) return

          state.current.swiping = true
          savedScrollY = window.scrollY

          w.style.position = 'fixed'
          w.style.top = `-${savedScrollY}px`
          w.style.left = '0'
          w.style.right = '0'
          w.style.zIndex = '2'
          w.style.boxShadow = '-8px 0 24px rgba(0,0,0,0.2)'
        } else {
          return
        }
      }

      if (!state.current.swiping) return

      const w = getWrapper()
      if (!w) return

      const clampedDx = Math.max(0, dx)
      w.style.transform = `translateX(${clampedDx}px)`
      w.style.transition = 'none'
    }

    function onTouchEnd(e) {
      if (!state.current.swiping) return
      state.current.swiping = false

      const t = e.changedTouches[0]
      const dx = t.clientX - state.current.startX
      const w = getWrapper()
      if (!w) return

      if (dx > threshold) {
        // スライドアウトして戻る
        w.style.transition = 'transform 0.2s ease-out'
        w.style.transform = `translateX(${window.innerWidth}px)`

        setTimeout(() => {
          // スタイルを即リセットしてからナビゲーション
          w.style.cssText = 'background-color:#f8f9fa;min-height:100vh;'
          if (historyStack.current.length > 0) {
            historyStack.current.pop()
            router.back()
          } else {
            router.push(getBackUrl())
          }
        }, 200)
      } else {
        // キャンセル
        w.style.transition = 'transform 0.2s ease-out'
        w.style.transform = 'translateX(0)'

        setTimeout(() => {
          w.style.position = ''
          w.style.top = ''
          w.style.left = ''
          w.style.right = ''
          w.style.zIndex = ''
          w.style.transform = ''
          w.style.transition = ''
          w.style.boxShadow = ''
          window.scrollTo(0, savedScrollY)
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
    }
  }, [router])

  return null
}
