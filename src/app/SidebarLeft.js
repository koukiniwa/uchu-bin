'use client'

export default function SidebarLeft() {
  return (
    <div className="sidebar-left">
      <a
        href="https://space-map-git-main-koukiniwas-projects.vercel.app/moon"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          textDecoration: 'none',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #e0e0e0',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <img
          src="/moon-map-og.png"
          alt="月面探査機マップ"
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
        />
        <div style={{ padding: '10px 12px 12px', background: '#fff' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2744', marginBottom: '4px' }}>
            月面探査機マップ
          </div>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.5 }}>
            人類が月に送り込んだ全探査機を3Dマップで探索
          </div>
        </div>
      </a>
    </div>
  )
}
