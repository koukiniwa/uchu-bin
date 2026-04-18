'use client'
import { useEffect } from 'react'
export default function TweetLoader() {
  useEffect(() => {
    if (window.twttr?.widgets) {
      window.twttr.widgets.load()
    }
  }, [])
  return null
}
