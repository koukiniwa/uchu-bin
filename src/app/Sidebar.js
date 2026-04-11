'use client'

const sections = [
  {
    label: '宇宙機関',
    links: [
      { name: 'NASA', url: 'https://www.nasa.gov' },
      { name: 'JAXA', url: 'https://www.jaxa.jp' },
      { name: 'ESA', url: 'https://www.esa.int' },
      { name: 'ISRO（インド）', url: 'https://www.isro.gov.in' },
    ],
  },
  {
    label: 'ロケット',
    links: [
      { name: 'SpaceX', url: 'https://www.spacex.com' },
      { name: 'Blue Origin', url: 'https://www.blueorigin.com' },
      { name: 'Rocket Lab', url: 'https://www.rocketlabusa.com' },
      { name: 'ULA', url: 'https://www.ulalaunch.com' },
      { name: 'Arianespace', url: 'https://www.arianespace.com' },
    ],
  },
  {
    label: '月面着陸',
    links: [
      { name: 'ispace', url: 'https://ispace-inc.com' },
      { name: 'Astrobotic', url: 'https://www.astrobotic.com' },
      { name: 'Intuitive Machines', url: 'https://www.intuitivemachines.com' },
    ],
  },
  {
    label: '宇宙ステーション',
    links: [
      { name: 'Axiom Space', url: 'https://www.axiomspace.com' },
      { name: 'Vast Space', url: 'https://www.vastspace.com' },
      { name: 'Starlab', url: 'https://www.starlabspace.com' },
    ],
  },
  {
    label: '人工衛星',
    links: [
      { name: 'Planet Labs', url: 'https://www.planet.com' },
      { name: 'Maxar', url: 'https://www.maxar.com' },
      { name: 'Spire Global', url: 'https://spire.com' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside>
      {sections.map((section) => (
        <div key={section.label} style={{ marginBottom: '28px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#1a2744',
            fontFamily: 'monospace',
            borderBottom: '2px solid #1a2744',
            paddingBottom: '6px',
            marginBottom: '10px',
          }}>
            {section.label.toUpperCase()}
          </div>
          {section.links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                color: '#333',
                textDecoration: 'none',
                padding: '7px 8px',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background 0.15s, color 0.15s',
                borderRadius: '3px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f7ff'; e.currentTarget.style.color = '#1a2744' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#333' }}
            >
              <span>{link.name}</span>
              <span style={{ fontSize: '11px', color: '#aaa' }}>↗</span>
            </a>
          ))}
        </div>
      ))}
    </aside>
  )
}
