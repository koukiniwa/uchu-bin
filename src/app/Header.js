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
          {/* 右下の星マークをコンテナで隠す */}
          <div style={{
            width: '270px',
            height: '72px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <img
              src="/logo.jpg"
              alt="宇宙便"
              style={{
                width: '270px',
                height: 'auto',
                display: 'block',
                marginTop: '-4px',
              }}
            />
          </div>
        </Link>
      </div>
    </header>
  )
}
