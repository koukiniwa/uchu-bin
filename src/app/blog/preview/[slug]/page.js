import fs from 'fs'
import path from 'path'
import Link from 'next/link'

const PREVIEWS_DIR = path.join(process.cwd(), 'public', 'data', 'previews')
const LAUNCHES_JSON = path.join(process.cwd(), 'public', 'data', 'launches.json')

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function getPreview(slug) {
  try {
    return JSON.parse(fs.readFileSync(path.join(PREVIEWS_DIR, `${slug}.json`), 'utf-8'))
  } catch { return null }
}

function getAllPreviews() {
  try {
    const index = JSON.parse(fs.readFileSync(path.join(PREVIEWS_DIR, 'index.json'), 'utf-8'))
    return index.previews || []
  } catch { return [] }
}

// launches.jsonから最新の日時を取得
function getLatestLaunchData(missionName) {
  try {
    const data = JSON.parse(fs.readFileSync(LAUNCHES_JSON, 'utf-8'))
    return (data.launches || []).find(l => {
      if (!l.mission) return false
      return l.mission.toLowerCase() === missionName.toLowerCase()
    })
  } catch { return null }
}

function formatJST(dateStr) {
  const utc = new Date(dateStr)
  const jst = new Date(utc.getTime() + 9 * 3600000)
  const y = jst.getUTCFullYear()
  const m = jst.getUTCMonth() + 1
  const d = jst.getUTCDate()
  const dow = WEEKDAYS[new Date(Date.UTC(y, jst.getUTCMonth(), d)).getUTCDay()]
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const min = String(jst.getUTCMinutes()).padStart(2, '0')
  return {
    dateStr: `${y}年${m}月${d}日（${dow}）`,
    timeStr: `${h}:${min} JST`,
    shortDate: `${m}月${d}日（${dow}）`,
  }
}

export async function generateStaticParams() {
  const previews = getAllPreviews()
  return previews.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const preview = getPreview(params.slug)
  if (!preview) return { title: '記事が見つかりません - 宇宙便' }
  const baseUrl = 'https://www.uchu-bin.jp'
  const image = preview.image ? `${baseUrl}${preview.image}` : `${baseUrl}/icon-512.png`
  return {
    title: `${preview.title}【宇宙便】`,
    description: preview.description,
    keywords: ['宇宙便', preview.rocketJa, preview.missionName, '打ち上げ予定', '日本時間'],
    openGraph: {
      title: `${preview.title}【宇宙便】`,
      description: preview.description,
      url: `${baseUrl}/blog/preview/${params.slug}`,
      siteName: '宇宙便',
      type: 'article',
      locale: 'ja_JP',
      images: [{ url: image, width: 1200, height: 630, alt: preview.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${preview.title}【宇宙便】`,
      description: preview.description,
      images: [image],
    },
  }
}

export default function PreviewArticle({ params }) {
  const preview = getPreview(params.slug)
  if (!preview) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px', color: '#333' }}>記事が見つかりません</h1>
        <Link href="/schedule" style={{ color: '#1565c0' }}>打ち上げ予定スケジュールへ</Link>
      </div>
    )
  }

  // launches.jsonから最新の日時を取得
  const latestData = getLatestLaunchData(preview.missionName)
  const jst = latestData
    ? formatJST(latestData.date + 'T' + (latestData.time || '00:00') + ':00Z')
    : formatJST(preview.net)
  const isConfirmed = latestData ? latestData.status === 'Go' || !latestData.tentative : preview.status === 'Go for Launch'
  const isTentative = latestData ? latestData.tentative : false

  const baseUrl = 'https://www.uchu-bin.jp'
  const articleUrl = `${baseUrl}/blog/preview/${params.slug}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: preview.title,
    description: preview.description,
    datePublished: preview.firstGenerated,
    dateModified: preview.generated,
    url: articleUrl,
    inLanguage: 'ja',
    articleSection: preview.category,
    image: preview.image ? [`${baseUrl}${preview.image}`] : [`${baseUrl}/icon-512.png`],
    author: { '@type': 'Organization', name: '宇宙便編集部', url: baseUrl },
    publisher: { '@type': 'Organization', name: '宇宙便', url: baseUrl, logo: { '@type': 'ImageObject', url: `${baseUrl}/icon-512.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* 戻るリンク */}
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: '#1a2744', textDecoration: 'none',
        marginBottom: '24px', fontWeight: 600,
      }}>
        ← 記事一覧へ
      </Link>

      {/* 予定記事バナー（最新日時を動的表示） */}
      <div style={{
        margin: '0 0 20px 0', padding: '16px 18px',
        background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
        borderRadius: '8px', borderLeft: '4px solid #1565c0',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0d47a1', marginBottom: '6px' }}>
          打ち上げ予定の解説記事
        </div>
        <div style={{ fontSize: '13px', color: '#0d47a1', marginBottom: '4px' }}>
          <strong>最新の予定: {jst.shortDate} {jst.timeStr}</strong>
          {isConfirmed && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#2e7d32', fontWeight: 700 }}>✅ 確定</span>}
          {isTentative && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#e65100', fontWeight: 700 }}>⏳ 暫定</span>}
        </div>
        <div style={{ fontSize: '12px', color: '#1565c0' }}>
          日時は変更される可能性があります。最新情報は打ち上げスケジュールで自動更新されます。
        </div>
      </div>

      {/* カテゴリバッジ */}
      <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
          color: '#1565c0', padding: '3px 10px',
          border: '1px solid #1565c0',
        }}>
          {preview.category}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
          color: '#e65100', padding: '3px 10px',
          border: '1px solid #e65100', borderRadius: '2px',
        }}>
          打ち上げ予定
        </span>
      </div>

      {/* タイトル */}
      <h1 style={{
        fontSize: '28px', fontWeight: 800, color: '#111',
        lineHeight: 1.6, margin: '0 0 16px 0',
      }}>
        {preview.missionName} 打ち上げ予定
      </h1>

      {/* 日付 */}
      <div style={{
        fontSize: '12px', color: '#999',
        borderBottom: '1px solid #e0e0e0', paddingBottom: '20px', marginBottom: '28px',
      }}>
        {jst.dateStr} {jst.timeStr} 打ち上げ予定
      </div>

      {/* ロケット画像 */}
      {preview.image && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ width: '100%', overflow: 'hidden', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
            <img
              src={preview.image}
              alt={`${preview.rocketJa}ロケット`}
              fetchPriority="high"
              style={{ maxWidth: '100%', maxHeight: '500px', width: 'auto', height: 'auto', display: 'inline-block' }}
            />
          </div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
            {preview.rocketJa}（{preview.rocketName}）
          </div>
        </div>
      )}

      {/* 本文 */}
      <div className="post-body">
        <h2>{preview.missionName} 打ち上げ予定：日本時間 {jst.shortDate} {jst.timeStr}</h2>

        <p>
          {preview.provider}による{preview.missionName}ミッションが、日本時間{jst.dateStr}{jst.timeStr}に打ち上げ予定です。
          {preview.rocketJa}（{preview.rocketName}）ロケットで{preview.padName}から打ち上げられます。
        </p>

        {/* 情報テーブル */}
        <table>
          <tbody>
            <tr><th>打ち上げ日時</th><td>{jst.dateStr} {jst.timeStr}</td></tr>
            <tr><th>ロケット</th><td>{preview.rocketJa}（{preview.rocketName}）</td></tr>
            <tr><th>射場</th><td>{preview.padName}</td></tr>
            <tr><th>運用機関</th><td>{preview.provider}</td></tr>
            {preview.orbit && <tr><th>投入軌道</th><td>{preview.orbit}</td></tr>}
            <tr><th>ステータス</th><td>{isConfirmed ? '確定（Go）' : isTentative ? '暫定' : preview.status}</td></tr>
          </tbody>
        </table>

        {/* ミッション概要 */}
        {preview.missionDescription && (
          <>
            <h2>ミッション概要</h2>
            <p>{preview.missionDescription}</p>
          </>
        )}

        {/* ライブ配信 */}
        {preview.vidURLs && preview.vidURLs.length > 0 && (
          <>
            <h2>ライブ配信</h2>
            <p>以下の公式チャンネルでライブ配信が予定されています。</p>
            <ul>
              {preview.vidURLs.map((v, i) => (
                <li key={i}>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0' }}>
                    {v.title || '公式配信'}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* 参考記事 */}
        <h2>参考情報</h2>
        <ul>
          <li>
            <a href={`https://ll.thespacedevs.com/2.2.0/launch/${preview.launchId}/`} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0' }}>
              Launch Library 2 - {preview.missionName}
            </a>
          </li>
        </ul>
      </div>

      {/* フッター */}
      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
        {/* Xシェアボタン */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(preview.title + ' - 宇宙便')}&url=${encodeURIComponent(articleUrl)}&hashtags=宇宙便`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#000', color: '#fff',
              padding: '10px 24px', borderRadius: '4px',
              textDecoration: 'none', fontSize: '14px', fontWeight: 600,
            }}
          >
            𝕏 でシェアする
          </a>
        </div>
      </div>

      {/* サイト回遊セクション */}
      <div style={{ margin: '32px 0', display: 'grid', gap: '10px' }} className="site-links-grid">
        <a href="/schedule" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>📅</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>打ち上げスケジュール</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>世界中の打ち上げ予定を一覧で確認</div>
          </div>
        </a>
        <a href="/rockets" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #0a0e1a, #1a2744)',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>🚀</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>ロケット図鑑</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>成功率・スペック・打ち上げ履歴を比較</div>
          </div>
        </a>
      </div>
    </div>
  )
}
