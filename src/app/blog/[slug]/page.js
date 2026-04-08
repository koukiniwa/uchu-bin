import { getPostBySlug, getAllPosts } from '@/lib/posts'
import Link from 'next/link'
import Markdown from 'markdown-to-jsx'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug)
  const url = `https://uchu-bin.jp/blog/${params.slug}`
  const image = post.image || '/icon-512.png'
  return {
    title: `${post.title} - 宇宙便`,
    description: post.description,
    keywords: ['宇宙便', post.category, 'ロケット', '宇宙ニュース', 'JAXA', 'NASA'],
    openGraph: {
      title: `${post.title} - 宇宙便`,
      description: post.description,
      url,
      siteName: '宇宙便',
      type: 'article',
      locale: 'ja_JP',
      publishedTime: post.date,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} - 宇宙便`,
      description: post.description,
      images: [image],
    },
  }
}

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    image: post.image ? [post.image] : ['https://uchu-bin.jp/icon-512.png'],
    publisher: {
      '@type': 'Organization',
      name: '宇宙便',
      logo: { '@type': 'ImageObject', url: 'https://uchu-bin.jp/icon-512.png' },
    },
    mainEntityOfPage: `https://uchu-bin.jp/blog/${params.slug}`,
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* 戻るリンク */}
      <Link
        href="/"
        className="post-back"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: '#1a2744',
          textDecoration: 'none',
          marginBottom: '24px',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        ← 記事一覧へ
      </Link>

      {/* タイトルエリア */}
      <div style={{ marginBottom: '28px' }}>
        {/* カテゴリバッジ */}
        <div style={{ marginBottom: '14px' }}>
          <Link
            href={`/?category=${encodeURIComponent(post.category)}`}
            style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
              color: '#1565c0', padding: '3px 10px',
              border: '1px solid #1565c0', textDecoration: 'none',
            }}
          >
            {post.category}
          </Link>
        </div>

        {/* タイトル */}
        <h1 className="post-title" style={{
          fontSize: '28px', fontWeight: 800, color: '#111111',
          lineHeight: 1.6, margin: '0 0 16px 0',
        }}>
          {post.title}
        </h1>

        {/* 日付 */}
        <div style={{
          fontSize: '12px', color: '#999999',
          borderBottom: '1px solid #e0e0e0', paddingBottom: '20px',
        }}>
          {post.date}
        </div>
      </div>

      {/* ヒーロー画像 */}
      {post.image && (
        <div className="post-hero-img" style={{ width: '100%', height: '420px', overflow: 'hidden', marginBottom: '40px' }}>
          <img
            src={post.image}
            alt={post.title}
            fetchPriority="high"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* 本文 */}
      <div className="post-body">
        <Markdown>{post.content}</Markdown>
      </div>

      {/* フッター */}
      <div style={{
        marginTop: '56px',
        paddingTop: '20px',
        borderTop: '1px solid #e0e0e0',
      }}>
        {/* Xシェアボタン */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title + ' - 宇宙便')}&url=${encodeURIComponent('https://uchu-bin.jp/blog/' + post.slug)}&hashtags=宇宙便,宇宙ニュース`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '10px 24px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            𝕏 でシェアする
          </a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#1a2744', textDecoration: 'none', fontWeight: 600 }}>
            ← 記事一覧へ
          </Link>
          <Link
            href={`/?category=${encodeURIComponent(post.category)}`}
            style={{ fontSize: '13px', color: '#1a2744', textDecoration: 'none', fontWeight: 600 }}
          >
            {post.category}の記事一覧 →
          </Link>
        </div>
      </div>
    </div>
  )
}
