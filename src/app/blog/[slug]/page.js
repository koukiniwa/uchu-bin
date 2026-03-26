import { getPostBySlug, getAllPosts } from '../../lib/posts'
import Link from 'next/link'
import Markdown from 'markdown-to-jsx'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
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
    <div>
      <Link href="/">
        <span className="text-blue-600 hover:underline mb-8 inline-block">
          ← 記事一覧に戻る
        </span>
      </Link>

      <article className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <p className="text-gray-500 mb-8">{post.date}</p>

        <div className="prose max-w-none">
          <Markdown>{post.content}</Markdown>
        </div>
      </article>
    </div>
  )
}
