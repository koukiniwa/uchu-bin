import Link from 'next/link'

export default function Header() {
  return (
    <header style={{ backgroundColor: 'transparent' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100px',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img
            src="/logo.jpg"
            alt="宇宙便"
            style={{
              height: '80px',
              width: 'auto',
              display: 'block',
              mixBlendMode: 'screen',
            }}
          />
        </Link>
      </div>
    </header>
  )
}
