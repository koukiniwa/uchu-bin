'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false, decided: false })
  const history = useRef([])
  const prevPathname = useRef(null)

  useEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname
      return
    }
    if (prevPathname.current !== pathname) {
      history.current.push(prevPathname.current)
      if (history.current.length > 10) history.current.shift()
      prevPathname.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    const html = document.documentElement

    const container = document.createElement('div')
    Object.assign(container.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '99999', pointerEvents: 'none', overflow: 'hidden',
      display: 'none',
    })
    html.appendChild(container)

    const underlay = document.createElement('iframe')
    Object.assign(underlay.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      border: 'none', transform: 'translateX(-30%)',
      backgroundColor: '#f8f9fa',
    })
    underlay.setAttribute('aria-hidden', 'true')
    container.appendChild(underlay)

    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)',
    })
    container.appendChild(overlay)

    const shadow = document.createElement('div')
    Object.assign(shadow.style, {
      position: 'absolute', top: '0', width: '16px', height: '100%',
      background: 'linear-gradient(to right, rgba(0,0,0,0.15), transparent)',
      opacity: '0',
    })
    container.appendChild(shadow)

    const body = document.body
    let threshold = 0
    let underlayLoaded = false

    function isSubPage() {
      const p = window.location.pathname
      return p !== '/' && p !== ''
    }

    // 戻り先URLを決定
    function getBackUrl() {
      // クライアント側の履歴があればそれを使う
      if (history.current.length > 0) {
        return history.current[history.current.length - 1]
      }
      // 記事ページならトップへ
      if (window.location.pathname.startsWith('/blog/')) {
        return '/'
      }
      // ロケット詳細ならロケット図鑑へ
      if (window.location.pathname.startsWith('/rockets/')) {
        return '/rockets'
      }
      // その他の下層ページならトップへ
      return '/'
    }

    // スワイプバックが可能か
    function canSwipeBack() {
      if (!isSubPage()) return false
      // ブラウザ履歴があるか、下層ページであればOK
      return history.current.length > 0 || window.history.length > 1
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
          state.current.swiping = true

          container.style.display = 'block'
          html.style.overflow = 'hidden'

          if (!underlayLoaded) {
            underlay.src = getBackUrl()
            underlayLoaded = true
          }
        } else {
          return
        }
      }

      if (!state.current.swiping) return

      const clampedDx = Math.max(0, dx)
      const progress = Math.min(clampedDx / window.innerWidth, 1)

      body.style.transform = `translateX(${clampedDx}px)`
      body.style.transition = 'none'

      underlay.style.transform = `translateX(${-30 + 30 * progress}%)`
      underlay.style.transition = 'none'

      overlay.style.opacity = String(1 - progress)
      overlay.style.transition = 'none'

      shadow.style.opacity = String(Math.min(progress * 3, 1))
      shadow.style.left = `${clampedDx - 16}px`
    }

    function onTouchEnd(e) {
      if (!state.current.swiping) return
      state.current.swiping = false

      const t = e.changedTouches[0]
      const dx = t.clientX - state.current.startX
      const dur = '0.25s'

      if (dx > threshold) {
        body.style.transition = `transform ${dur} ease-out`
        body.style.transform = `translateX(${window.innerWidth}px)`
        underlay.style.transition = `transform ${dur} ease-out`
        underlay.style.transform = 'translateX(0%)'
        overlay.style.transition = `opacity ${dur} ease-out`
        overlay.style.opacity = '0'

        setTimeout(() => {
          if (history.current.length > 0) {
            history.current.pop()
            router.back()
          } else {
            // 履歴がない場合はトップ等に遷移
            router.push(getBackUrl())
          }
          requestAnimationFrame(() => resetStyles())
        }, 250)
      } else {
        body.style.transition = `transform ${dur} ease-out`
        body.style.transform = ''
        underlay.style.transition = `transform ${dur} ease-out`
        underlay.style.transform = 'translateX(-30%)'
        overlay.style.transition = `opacity ${dur} ease-out`
        overlay.style.opacity = '0.5'
        shadow.style.transition = `opacity ${dur} ease-out`
        shadow.style.opacity = '0'
        setTimeout(() => resetStyles(), 250)
      }
    }

    function resetStyles() {
      body.style.transition = ''
      body.style.transform = ''
      html.style.overflow = ''
      container.style.display = 'none'
      underlay.style.transform = 'translateX(-30%)'
      underlay.src = 'about:blank'
      overlay.style.opacity = '0.5'
      shadow.style.opacity = '0'
      underlayLoaded = false
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      container.remove()
    }
  }, [router])

  return null
}
