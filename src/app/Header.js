import Link from 'next/link'

export default function Header() {
  return (
    <header style={{ backgroundColor: '#1a2744' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '72px',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '4px', height: '40px', backgroundColor: '#5a8fd4', flexShrink: 0 }} />
          <div style={{
            fontSize: '30px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            color: '#ffffff',
            lineHeight: 1,
          }}>
            宇宙便
          </div>
        </Link>
      </div>
      <div style={{ height: '2px', backgroundColor: '#2e4a7a' }} />
    </header>
  )
}
