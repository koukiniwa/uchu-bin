'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SwipeBack() {
  const router = useRouter()
  const pathname = usePathname()
  const state = useRef({ startX: 0, startY: 0, swiping: false })
  const prevSnapshot = useRef(null)

  // ページ遷移のたびに現在ページのスナップショットを保存
  useEffect(() => {
    const timer = setTimeout(() => {
      const scrollY = window.scrollY
      const clone = document.documentElement.cloneNode(true)
      clone.querySelectorAll('script').forEach(s => s.remove())
      const html = clone.outerHTML
      prevSnapshot.current = { html, scrollY, path: pathname }
    }, 500)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    // 前のページを表示するiframe（左側に少し引っ込んだ位置）
    const underlay = document.createElement('iframe')
    Object.assign(underlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      border: 'none', zIndex: '-2', opacity: '0', pointerEvents: 'none',
      transform: 'translateX(-30%)',
    })
    underlay.setAttribute('sandbox', 'allow-same-origin')
    underlay.setAttribute('aria-hidden', 'true')
    document.body.appendChild(underlay)

    // 前のページの上に乗る暗いオーバーレイ
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', zIndex: '-1', opacity: '0', pointerEvents: 'none',
    })
    document.body.appendChild(overlay)

    // 現在ページの左端の影
    const shadow = document.createElement('div')
    Object.assign(shadow.style, {
      position: 'fixed', top: '0', left: '0', width: '16px', height: '100%',
      background: 'linear-gradient(to right, rgba(0,0,0,0.2), transparent)',
      zIndex: '9999', opacity: '0', pointerEvents: 'none',
    })
    document.body.appendChild(shadow)

    let threshold = 0
    const body = document.body

    function getPageElements() {
      const els = []
      for (let i = 0; i < body.children.length; i++) {
        const el = body.children[i]
        if (el === underlay || el === overlay || el === shadow) continue
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

          // 前のページをiframeに表示
          if (prevSnapshot.current) {
            try {
              const doc = underlay.contentDocument
              doc.open()
              doc.write(prevSnapshot.current.html)
              doc.close()
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

      // 現在のページを右にスライド
      for (const el of els) {
        el.style.transform = `translateX(${clampedDx}px)`
        el.style.transition = 'none'
      }

      // 前のページが左から出てくる（-30% → 0%）
      const underlayX = -30 + (30 * progress)
      underlay.style.transform = `translateX(${underlayX}%)`
      underlay.style.transition = 'none'

      // オーバーレイを薄くしていく
      overlay.style.opacity = String(0.5 * (1 - progress))
      overlay.style.transition = 'none'

      // 影を現在ページの左端に配置
      shadow.style.opacity = String(Math.min(progress * 3, 1))
      shadow.style.transform = `translateX(${clampedDx - 16}px)`
      shadow.style.transition = 'none'
    }

    function onTouchEnd(e) {
      if (!state.current.swiping) return
      state.current.swiping = false

      const t = e.changedTouches[0]
      const dx = t.clientX - state.current.startX
      const els = getPageElements()
      const dur = '0.25s'

      if (dx > threshold) {
        // 戻る：現在ページを右に飛ばす、前のページを中央に
        for (const el of els) {
          el.style.transition = `transform ${dur} ease-out`
          el.style.transform = `translateX(${window.innerWidth}px)`
        }
        underlay.style.transition = `transform ${dur} ease-out`
        underlay.style.transform = 'translateX(0%)'
        overlay.style.transition = `opacity ${dur} ease-out`
        overlay.style.opacity = '0'
        shadow.style.transition = `opacity ${dur} ease-out`
        shadow.style.opacity = '0'

        setTimeout(() => {
          router.back()
          requestAnimationFrame(() => resetStyles(els))
        }, 250)
      } else {
        // キャンセル：元に戻す
        for (const el of els) {
          el.style.transition = `transform ${dur} ease-out`
          el.style.transform = ''
        }
        underlay.style.transition = `transform ${dur} ease-out`
        underlay.style.transform = 'translateX(-30%)'
        overlay.style.transition = `opacity ${dur} ease-out`
        overlay.style.opacity = '0'
        shadow.style.transition = `opacity ${dur} ease-out`
        shadow.style.opacity = '0'
        setTimeout(() => resetStyles(els), 250)
      }
    }

    function resetStyles(els) {
      for (const el of els) {
        el.style.transition = ''
        el.style.transform = ''
      }
      underlay.style.opacity = '0'
      underlay.style.transform = 'translateX(-30%)'
      overlay.style.opacity = '0'
      shadow.style.opacity = '0'
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
      shadow.remove()
    }
  }, [router])

  return null
}
