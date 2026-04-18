'use client'
import { useEffect, useRef } from 'react'

export default function TweetEmbed({ url }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current

    const load = () => {
      if (window.twttr?.widgets) window.twttr.widgets.load(el)
    }

    if (window.twttr?.ready) {
      window.twttr.ready(load)
    } else {
      const id = setInterval(() => {
        if (window.twttr?.ready) {
          window.twttr.ready(load)
          clearInterval(id)
        }
      }, 100)
      return () => clearInterval(id)
    }
  }, [url])

  return (
    <div ref={ref} style={{ margin: '1.5rem auto', maxWidth: '550px' }}>
      <blockquote className="twitter-tweet" data-lang="ja">
        <a href={url}></a>
      </blockquote>
    </div>
  )
}
