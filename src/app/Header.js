import Link from 'next/link'

export default function Header() {
  return (
    <header style={{ backgroundColor: '#050814', borderBottom: '1px solid #1e2a3a' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '96px',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '4px', height: '52px', backgroundColor: '#4fc3f7', flexShrink: 0 }} />
          <div>
            <div style={{
              fontSize: '34px',
              fontWeight: 900,
              letterSpacing: '0.2em',
              color: '#ffffff',
              lineHeight: 1,
            }}>
              宇宙便
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.15em',
              marginTop: '6px',
            }}>
              ロケット・衛星・宇宙開発の最新情報
            </div>
          </div>
        </Link>
      </div>
    </header>
  )
}
