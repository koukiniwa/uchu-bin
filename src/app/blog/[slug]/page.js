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
          color: '#4fc3f7',
          textDecoration: 'none',
          marginBottom: '24px',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        ← 記事一覧へ
      </Link>

      {/* 記事ヘッダーブロック */}
      <div style={{
        border: '1px solid #1e2a3a',
        overflow: 'hidden',
        marginBottom: '40px',
      }}>
        {/* ヒーロー画像 */}
        {post.image && (
          <div style={{ width: '100%', height: '420px', overflow: 'hidden', position: 'relative' }}>
            <img
              src={post.image}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.8 }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(to top, #0f1629, transparent)',
            }} />
          </div>
        )}

        {/* タイトルエリア */}
        <div style={{
          padding: '28px 32px',
          backgroundColor: '#0f1629',
          borderTop: post.image ? '3px solid #4fc3f7' : 'none',
          borderLeft: !post.image ? '4px solid #4fc3f7' : 'none',
        }}>
          {/* カテゴリバッジ */}
          <div style={{ marginBottom: '16px' }}>
            <Link
              href={`/?category=${encodeURIComponent(post.category)}`}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#4fc3f7',
                padding: '3px 10px',
                border: '1px solid rgba(79,195,247,0.6)',
                textDecoration: 'none',
              }}
            >
              {post.category}
            </Link>
          </div>

          {/* タイトル */}
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#f0f2f8',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
          }}>
            {post.title}
          </h1>

          {/* 日付 */}
          <div style={{
            fontSize: '12px',
            color: '#3a4a5c',
            borderTop: '1px solid #1e2a3a',
            paddingTop: '14px',
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
        marginTop: '56px',
        paddingTop: '20px',
        borderTop: '1px solid #1e2a3a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link
          href="/"
          style={{
            fontSize: '13px',
            color: '#4fc3f7',
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
            color: '#4fc3f7',
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
