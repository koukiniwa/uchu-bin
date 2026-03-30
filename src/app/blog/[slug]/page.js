import { getPostBySlug, getAllPosts } from '@/lib/posts'
import Link from 'next/link'
import Markdown from 'markdown-to-jsx'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug)
  return {
    title: `${post.title} - 宇宙便`,
    description: post.description,
  }
}

export default function BlogPost({ params }) {
  const post = getPostBySlug(params.slug)

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* 戻るリンク */}
      <Link
        href="/"
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
        <h1 style={{
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
        <div style={{ width: '100%', height: '420px', overflow: 'hidden', marginBottom: '40px' }}>
          <img
            src={post.image}
            alt={post.title}
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link
          href="/"
          style={{
            fontSize: '13px',
            color: '#1a2744',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← 記事一覧へ
        </Link>
        <Link
          href={`/?category=${encodeURIComponent(post.category)}`}
          style={{
            fontSize: '13px',
            color: '#1a2744',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {post.category}の記事一覧 →
        </Link>
      </div>
    </div>
  )
}
