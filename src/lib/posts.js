import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'posts')

export function getAllPosts() {
  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames
    .filter(fileName => fileName.endsWith('.md') && !fileName.startsWith('~'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)
      return {
        slug,
        date: data.date || '',
        title: data.title || slug,
        description: data.description || '',
        category: data.category || '未分類',
        image: data.image || '',
      }
    })
    .sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date)
      if (dateDiff !== 0) return dateDiff
      // 同じ日付の場合はファイル名の降順（後から作られた方が上）
      return b.slug.localeCompare(a.slug)
    })
}

export function getPostBySlug(slug) {
  const decoded = decodeURIComponent(slug)
  const fullPath = path.join(postsDirectory, `${decoded}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const matterResult = matter(fileContents)
  return {
    slug,
    content: matterResult.content,
    category: matterResult.data.category || '未分類',
    ...matterResult.data,
  }
}
