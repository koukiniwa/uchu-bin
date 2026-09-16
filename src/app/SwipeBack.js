'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false })
  const snapshots = useRef([])
  const prevPathname = useRef(null)
  const pendingSnapshot = useRef(null)

  useEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname
      return
    }
    if (prevPathname.current !== pathname && pendingSnapshot.current) {
      snapshots.current.push(pendingSnapshot.current)
      if (snapshots.current.length > 5) snapshots.current.shift()
    }
    prevPathname.current = pathname
  }, [pathname])

  useEffect(() => {
    const timer = setTimeout(() => {
      const scrollY = window.scrollY
      const clone = document.documentElement.cloneNode(true)
      clone.querySelectorAll('script').forEach(s => s.remove())
      pendingSnapshot.current = { html: clone.outerHTML, scrollY, path: pathname }
    }, 500)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    // コンテナ：画面全体を覆い、前のページと現在のページを横並びに管理
    const container = document.createElement('div')
    Object.assign(container.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      zIndex: '99999', pointerEvents: 'none', overflow: 'hidden',
      display: 'none',
    })
    document.body.appendChild(container)

    // 前のページ（iframe）
    const underlay = document.createElement('iframe')
    Object.assign(underlay.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      border: 'none', transform: 'translateX(-30%)',
    })
    underlay.setAttribute('sandbox', 'allow-same-origin')
    underlay.setAttribute('aria-hidden', 'true')
    container.appendChild(underlay)

    // 前のページの上の暗いオーバーレイ
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)',
    })
    container.appendChild(overlay)

    // 現在ページの左端の影
    const shadow = document.createElement('div')
    Object.assign(shadow.style, {
      position: 'absolute', top: '0', width: '16px', height: '100%',
      background: 'linear-gradient(to right, rgba(0,0,0,0.15), transparent)',
      opacity: '0',
    })
    container.appendChild(shadow)

    let threshold = 0
    const body = document.body

    function onTouchStart(e) {
      const t = e.touches[0]
      state.current = { startX: t.clientX, startY: t.clientY, swiping: false }
      threshold = window.innerWidth * 0.3
    }

    function onTouchMove(e) {
      const t = e.touches[0]
      const dx = t.clientX - state.current.startX
      const dy = Math.abs(t.clientY - state.current.startY)

      if (!state.current.swiping) {
        if (dx > 10 && dx > dy * 1.5) {
          // スナップショットが無ければスワイプしない
          if (snapshots.current.length === 0) return
          state.current.swiping = true

          // コンテナを表示
          container.style.display = 'block'
          body.style.overflow = 'hidden'

          // 前のページをiframeに表示
          const snap = snapshots.current[snapshots.current.length - 1]
          if (snap) {
            try {
              const doc = underlay.contentDocument
              doc.open()
              doc.write(snap.html)
              doc.close()
              underlay.contentWindow.scrollTo(0, snap.scrollY)
            } catch (err) { /* ignore */ }
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

      // body全体をスライド（現在のページ）
      body.style.transform = `translateX(${clampedDx}px)`
      body.style.transition = 'none'

      // 前のページが左から出てくる
      const underlayX = -30 + (30 * progress)
      underlay.style.transform = `translateX(${underlayX}%)`
      underlay.style.transition = 'none'

      // オーバーレイを薄く
      overlay.style.opacity = String(1 - progress)
      overlay.style.transition = 'none'

      // 影
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
          snapshots.current.pop()
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
      body.style.overflow = ''
      container.style.display = 'none'
      underlay.style.transform = 'translateX(-30%)'
      overlay.style.opacity = '0.5'
      shadow.style.opacity = '0'
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
