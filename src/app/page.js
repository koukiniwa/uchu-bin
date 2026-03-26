import Link from 'next/link'
import { getAllPosts } from '../lib/posts'

export default function Home() {
  const posts = getAllPosts()

  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">最新のニュース</h2>
      <div className="grid gap-6">
        {posts.map((post) => (
          <article key={post.slug} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
            <Link href={`/blog/${post.slug}`}>
              <h3 className="text-xl font-bold mb-2 text-blue-600 hover:underline">
                {post.title}
              </h3>
            </Link>
            <p className="text-gray-500 text-sm mb-3">{post.date}</p>
            <p className="text-gray-700">{post.description}</p>
            <Link href={`/blog/${post.slug}`}>
              <span className="text-blue-600 hover:underline mt-4 inline-block">
                続きを読む →
              </span>
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
