'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-navy py-5" style={{ backgroundColor: '#0a1628' }}>
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
        <div className="w-10" />
        <Link href="/">
          <h1 className="text-3xl font-bold text-white tracking-widest">宇宙便</h1>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="text-white flex flex-col gap-1.5 w-10 items-end"
          aria-label="メニュー"
        >
          <span className="block w-6 h-0.5 bg-white" />
          <span className="block w-6 h-0.5 bg-white" />
          <span className="block w-6 h-0.5 bg-white" />
        </button>
      </div>

      {open && (
        <nav className="max-w-4xl mx-auto px-4 pt-4 pb-2">
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/" onClick={() => setOpen(false)} className="block text-white py-2 border-b border-white/20 hover:opacity-70">
                ホーム
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
