'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REDIRECTS = {
  '/blog/2026-03-30-asaが月周回ステーション-ゲートウェイ-を凍結-3兆円を月面基地建設へ':
    '/blog/2026-03-30-nasaが月周回ステーション-ゲートウェイ-を凍結-3兆円を月面基地建設へ',
  '/blog/2026-03-31-ispace-米国ミッション打ち上げを2030年に延期-新ランダー-ultra-':
    '/blog/2026-03-31-ispace-月面着陸船打ち上げを延期-事業転換も発表',
  '/blog/2026-04-01-タイトル-ロケットラボ-ドイツ企業mynaricの買収承認を取得-レーザー通信を':
    '/blog/2026-04-01-ロケットラボ-ドイツ企業mynaricの買収承認を取得',
  '/blog/2026-04-03-アルテミスiiを月へ送り出したロケット-sls-とは-スペースシャトルの遺産と巨':
    '/blog/2026-04-03-sls-とは-スペースシャトルの遺産と巨大プロジェクトの全貌',
  '/blog/2026-04-06-ulaがamazon-leoの衛星29機を低軌道に投入-starlinkを追うa':
    '/blog/2026-04-06-ulaがamazon-leoの衛星29機を低軌道に投入-amazonの衛星通信が本格化',
}

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    const path = decodeURIComponent(window.location.pathname)
    const destination = REDIRECTS[path]
    if (destination) {
      router.replace(destination)
    }
  }, [router])

  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>
      <p style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em' }}>
        404 - PAGE NOT FOUND
      </p>
    </div>
  )
}
