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
          marginBottom: '20px',
          fontWeight: 600,
        }}
      >
        ← 記事一覧へ
      </Link>

      {/* 記事ヘッダーブロック */}
      <div style={{
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        marginBottom: '32px',
      }}>
        {/* ヒーロー画像 */}
        {post.image && (
          <div style={{ width: '100%', height: '400px', overflow: 'hidden' }}>
            <img
              src={post.image}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* タイトルエリア */}
        <div style={{
          padding: '24px 28px',
          borderTop: post.image ? '3px solid #1a2744' : 'none',
          borderLeft: !post.image ? '4px solid #1a2744' : 'none',
        }}>
          {/* カテゴリバッジ */}
          <div style={{ marginBottom: '14px' }}>
            <Link
              href={`/?category=${encodeURIComponent(post.category)}`}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#1a2744',
                padding: '3px 8px',
                border: '1px solid #1a2744',
                textDecoration: 'none',
              }}
            >
              {post.category}
            </Link>
          </div>

          {/* タイトル */}
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#111111',
            lineHeight: 1.55,
            margin: '0 0 18px 0',
          }}>
            {post.title}
          </h1>

          {/* 日付 */}
          <div style={{
            fontSize: '12px',
            color: '#999999',
            borderTop: '1px solid #e0e0e0',
            paddingTop: '12px',
          }}>
            {post.date}
          </div>
        </div>
      </div>

      {/* 本文 */}
      <div className="post-body">
        <Markdown>{post.content}</Markdown>
      </div>

      {/* フッター */}
      <div style={{
        marginTop: '48px',
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
