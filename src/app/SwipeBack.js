'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false })
  const prevSnapshot = useRef(null)

  // ページ遷移のたびに、現在のページをスナップショットとして保存
  useEffect(() => {
    // 少し待ってからキャプチャ（レンダリング完了後）
    const timer = setTimeout(() => {
      const scrollY = window.scrollY
      const clone = document.documentElement.cloneNode(true)
      // script等を除去
      clone.querySelectorAll('script').forEach(s => s.remove())
      const html = clone.outerHTML
      prevSnapshot.current = { html, scrollY, path: pathname }
    }, 500)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    // 下レイヤー（前のページのスナップショットを表示するiframe）
    const underlay = document.createElement('iframe')
    Object.assign(underlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      border: 'none', zIndex: '-2', opacity: '0', pointerEvents: 'none',
    })
    underlay.setAttribute('sandbox', 'allow-same-origin')
    underlay.setAttribute('aria-hidden', 'true')
    document.body.appendChild(underlay)

    // 暗いオーバーレイ（前のページの上に重ねる）
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.4)', zIndex: '-1', opacity: '0', pointerEvents: 'none',
    })
    document.body.appendChild(overlay)

    let threshold = 0
    const body = document.body

    function getPageElements() {
      const els = []
      for (let i = 0; i < body.children.length; i++) {
        const el = body.children[i]
        if (el === underlay || el === overlay) continue
        els.push(el)
      }
      return els
    }

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
          state.current.swiping = true
          body.style.overflow = 'hidden'

          // スナップショットをiframeに書き込む
          if (prevSnapshot.current) {
            try {
              const doc = underlay.contentDocument
              doc.open()
              doc.write(prevSnapshot.current.html)
              doc.close()
              // スクロール位置を復元
              underlay.contentWindow.scrollTo(0, prevSnapshot.current.scrollY)
            } catch (err) { /* ignore */ }
          }
          underlay.style.opacity = '1'
          overlay.style.opacity = '1'
        } else if (dy > 10) {
          return
        } else {
          return
        }
      }

      if (!state.current.swiping) return

      const clampedDx = Math.max(0, dx)
      const progress = Math.min(clampedDx / window.innerWidth, 1)
      const els = getPageElements()

      for (const el of els) {
        el.style.transform = `translateX(${clampedDx}px)`
        el.style.transition = 'none'
      }

      // オーバーレイを薄くしていく
      overlay.style.opacity = String(0.4 * (1 - progress))
    }

    function onTouchEnd(e) {
      if (!state.current.swiping) return
      state.current.swiping = false

      const t = e.changedTouches[0]
      const dx = t.clientX - state.current.startX
      const els = getPageElements()

      if (dx > threshold) {
        for (const el of els) {
          el.style.transition = 'transform 0.2s ease-out'
          el.style.transform = `translateX(${window.innerWidth}px)`
        }
        overlay.style.transition = 'opacity 0.2s ease-out'
        overlay.style.opacity = '0'
        setTimeout(() => {
          router.back()
          requestAnimationFrame(() => resetStyles(els))
        }, 200)
      } else {
        for (const el of els) {
          el.style.transition = 'transform 0.2s ease-out'
          el.style.transform = ''
        }
        overlay.style.transition = 'opacity 0.2s ease-out'
        overlay.style.opacity = '0'
        setTimeout(() => resetStyles(els), 200)
      }
    }

    function resetStyles(els) {
      for (const el of els) {
        el.style.transition = ''
        el.style.transform = ''
      }
      underlay.style.opacity = '0'
      overlay.style.opacity = '0'
      body.style.overflow = ''
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
