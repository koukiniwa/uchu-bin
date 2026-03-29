import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const SITE_URL = 'https://www.uchu-bin.jp'

export default function sitemap() {
  const postsDir = path.join(process.cwd(), 'posts')
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'))

  const posts = files.map((file) => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8')
    const { data } = matter(content)
    const slug = file.replace('.md', '')
    return {
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: new Date(data.date || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...posts,
  ]
}
