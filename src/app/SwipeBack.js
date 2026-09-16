'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false, decided: false })
  const historyStack = useRef([])
  const prevPathname = useRef(null)
  const navigating = useRef(false)

  useEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname
      return
    }
    if (prevPathname.current !== pathname) {
      if (!navigating.current) {
        historyStack.current.push(prevPathname.current)
        if (historyStack.current.length > 10) historyStack.current.shift()
      }
      prevPathname.current = pathname
      navigating.current = false

      // 遷移完了 → 残っている要素をクリーンアップ
      const w = document.getElementById('page-wrapper')
      if (w) {
        w.style.cssText = 'background-color:#f8f9fa;min-height:100vh;'
      }
      const underlay = document.getElementById('swipe-underlay')
      const overlay = document.getElementById('swipe-overlay')
      if (underlay) { underlay.style.display = 'none'; underlay.src = 'about:blank' }
      if (overlay) overlay.style.display = 'none'
    }
  }, [pathname])

  useEffect(() => {
    const underlay = document.createElement('iframe')
    underlay.id = 'swipe-underlay'
    Object.assign(underlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      border: 'none', zIndex: '0',
      transform: 'translateX(-30%)',
      backgroundColor: '#f8f9fa',
      display: 'none',
    })
    underlay.setAttribute('aria-hidden', 'true')
    document.body.appendChild(underlay)

    const overlay = document.createElement('div')
    overlay.id = 'swipe-overlay'
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', zIndex: '1',
      display: 'none', pointerEvents: 'none',
    })
    document.body.appendChild(overlay)

    let threshold = 0
    let underlayLoaded = false
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
      underlayLoaded = false
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
          w.style.boxShadow = '-8px 0 24px rgba(0,0,0,0.18)'

          underlay.style.display = 'block'
          overlay.style.display = 'block'

          if (!underlayLoaded) {
            underlay.src = getBackUrl()
            underlayLoaded = true
          }
        } else {
          return
        }
      }

      if (!state.current.swiping) return

      const w = getWrapper()
      if (!w) return

      const clampedDx = Math.max(0, dx)
      const progress = Math.min(clampedDx / window.innerWidth, 1)

      w.style.transform = `translateX(${clampedDx}px)`
      w.style.transition = 'none'

      underlay.style.transform = `translateX(${-30 + 30 * progress}%)`
      underlay.style.transition = 'none'

      overlay.style.opacity = String(1 - progress)
      overlay.style.transition = 'none'
    }

    function onTouchEnd(e) {
      if (!state.current.swiping) return
      state.current.swiping = false

      const t = e.changedTouches[0]
      const dx = t.clientX - state.current.startX
      const dur = '0.25s'
      const w = getWrapper()
      if (!w) return

      if (dx > threshold) {
        // スライドアウト
        w.style.transition = `transform ${dur} ease-out`
        w.style.transform = `translateX(${window.innerWidth}px)`
        underlay.style.transition = `transform ${dur} ease-out`
        underlay.style.transform = 'translateX(0%)'
        overlay.style.transition = `opacity ${dur} ease-out`
        overlay.style.opacity = '0'

        setTimeout(() => {
          // wrapperを非表示にしてからナビゲーション → 点滅しない
          w.style.opacity = '0'
          navigating.current = true
          if (historyStack.current.length > 0) {
            historyStack.current.pop()
            router.back()
          } else {
            router.push(getBackUrl())
          }
        }, 260)
      } else {
        // キャンセル
        w.style.transition = `transform ${dur} ease-out`
        w.style.transform = 'translateX(0)'
        underlay.style.transition = `transform ${dur} ease-out`
        underlay.style.transform = 'translateX(-30%)'
        overlay.style.transition = `opacity ${dur} ease-out`
        overlay.style.opacity = '0'

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
          underlay.style.display = 'none'
          underlay.src = 'about:blank'
          overlay.style.display = 'none'
          underlayLoaded = false
        }, 260)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      underlay.remove()
      overlay.remove()
    }
  }, [router])

  return null
}
