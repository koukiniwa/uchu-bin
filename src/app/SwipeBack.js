'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false })
  const history = useRef([])
  const prevPathname = useRef(null)

  // ページ遷移のたびに履歴を積む
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

    function onTouchStart(e) {
      const t = e.touches[0]
      state.current = { startX: t.clientX, startY: t.clientY, swiping: false }
      threshold = window.innerWidth * 0.3
      underlayLoaded = false
    }

    function onTouchMove(e) {
      const t = e.touches[0]
      const dx = t.clientX - state.current.startX
      const dy = Math.abs(t.clientY - state.current.startY)

      if (!state.current.swiping) {
        if (dx > 10 && dx > dy * 1.5) {
          if (history.current.length === 0) return
          state.current.swiping = true

          container.style.display = 'block'
          html.style.overflow = 'hidden'

          // 前のページのURLをiframeで読み込む
          if (!underlayLoaded) {
            const prevUrl = history.current[history.current.length - 1]
            underlay.src = prevUrl
            underlayLoaded = true
          }
        } else if (dy > 10) {
          return
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
          history.current.pop()
          router.back()
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
