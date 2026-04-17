'use client'
import { useEffect, useRef } from 'react'

export default function TweetEmbed({ url }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (window.twttr && window.twttr.widgets) {
      window.twttr.widgets.load(ref.current)
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
