import Link from 'next/link'

export const metadata = {
  title: '宇宙便について - 宇宙便',
  description: '宇宙便（うちゅうびん）はロケット打ち上げ速報・スケジュール・宇宙開発ニュースをお届けする宇宙情報メディアです。',
  openGraph: {
    title: '宇宙便について - 宇宙便',
    description: '宇宙便（うちゅうびん）はロケット打ち上げ速報・スケジュール・宇宙開発ニュースをお届けする宇宙情報メディアです。',
    url: 'https://www.uchu-bin.jp/about',
    siteName: '宇宙便',
    type: 'website',
    locale: 'ja_JP',
  },
}

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <Link
        href="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: '#1a2744', textDecoration: 'none',
          marginBottom: '24px', fontWeight: 600, letterSpacing: '0.04em',
        }}
      >
        ← ホームへ
      </Link>

      <h1 style={{
        fontSize: '24px', fontWeight: 800, color: '#111',
        lineHeight: 1.6, margin: '0 0 32px 0',
      }}>
        宇宙便について
      </h1>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>このサイトについて</h2>
        <p style={paragraph}>
          宇宙便（うちゅうびん）は、世界中のロケット打ち上げ速報・打ち上げスケジュール・宇宙開発ニュースをお届けする宇宙情報メディアです。
        </p>
        <p style={paragraph}>
          打ち上げの成功・失敗をいち早くお届けすることを第一の目的とし、各国の宇宙機関や民間企業による打ち上げを幅広くカバーしています。
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>主なコンテンツ</h2>
        <ul style={{ ...paragraph, paddingLeft: '20px', lineHeight: 2.2 }}>
          <li>ロケット打ち上げ速報（打ち上げ完了後に記事を公開）</li>
          <li>打ち上げスケジュール（カウントダウン付き）</li>
          <li>宇宙開発に関するニュース記事</li>
          <li>月面探査機マップ・火星探査機マップ</li>
        </ul>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>情報ソース</h2>
        <p style={paragraph}>
          打ち上げスケジュールおよび打ち上げ結果の情報は、主に以下のソースに基づいています。
        </p>
        <ul style={{ ...paragraph, paddingLeft: '20px', lineHeight: 2.2 }}>
          <li>Launch Library 2 (The Space Devs)</li>
          <li>各宇宙機関の公式発表（NASA、JAXA、ESA、CNSA 等）</li>
          <li>各企業の公式プレスリリース（SpaceX、Rocket Lab 等）</li>
        </ul>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>運営者</h2>
        <p style={paragraph}>
          宇宙便は個人が運営する宇宙情報メディアです。
        </p>
        <table style={{ fontSize: '14px', lineHeight: 2, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={labelCell}>サイト名</td>
              <td style={valueCell}>宇宙便（うちゅうびん）</td>
            </tr>
            <tr>
              <td style={labelCell}>URL</td>
              <td style={valueCell}>https://www.uchu-bin.jp</td>
            </tr>
            <tr>
              <td style={labelCell}>X (Twitter)</td>
              <td style={valueCell}>
                <a href="https://x.com/uchubin_jp" target="_blank" rel="noopener noreferrer"
                  style={{ color: '#1565c0', textDecoration: 'none' }}>
                  @uchubin_jp
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>免責事項</h2>
        <p style={paragraph}>
          当サイトに掲載される情報は、正確性を期していますが、その完全性・正確性を保証するものではありません。打ち上げスケジュールは予告なく変更される場合があります。最新の情報は各宇宙機関や企業の公式発表をご確認ください。
        </p>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={sectionTitle}>お問い合わせ</h2>
        <p style={paragraph}>
          ご意見・ご要望は <a href="https://x.com/uchubin_jp" target="_blank" rel="noopener noreferrer"
            style={{ color: '#1565c0', textDecoration: 'none' }}>X (Twitter) @uchubin_jp</a> へお気軽にどうぞ。
        </p>
      </section>
    </div>
  )
}

const sectionTitle = {
  fontSize: '16px', fontWeight: 700, color: '#1a2744',
  marginBottom: '12px', paddingBottom: '8px',
  borderBottom: '2px solid #1a2744',
}

const paragraph = {
  fontSize: '14px', lineHeight: 1.9, color: '#333', margin: '0 0 12px 0',
}

const labelCell = {
  padding: '6px 16px 6px 0', color: '#666', fontWeight: 600,
  whiteSpace: 'nowrap', verticalAlign: 'top', borderBottom: '1px solid #eee',
}

const valueCell = {
  padding: '6px 0', color: '#111', borderBottom: '1px solid #eee',
}
