import Link from 'next/link'

export default function Header() {
  return (
    <header style={{ backgroundColor: '#1a2744', borderBottom: '2px solid #2e4a7a' }}>
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
          {/* 右下のマークをclip-pathで隠す */}
          <div style={{
            width: '280px',
            height: '70px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <img
              src="/logo.jpg"
              alt="宇宙便"
              style={{
                width: '105%',
                height: '115%',
                objectFit: 'cover',
                objectPosition: 'left top',
                display: 'block',
                marginLeft: '-2%',
              }}
            />
          </div>
        </Link>
      </div>
    </header>
  )
}
