const fs = require('fs')
const path = require('path')

const postsDir = path.join(__dirname, '..', 'posts')
const imagesDir = path.join(__dirname, '..', 'public', 'images')

function cleanSlug(s) {
  return s.replace(/「/g, '-').replace(/」/g, '').replace(/、/g, '-').replace(/-+/g, '-')
}

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))
const targets = files.filter(f => f.includes('、') || f.includes('「') || f.includes('」'))

for (const oldFile of targets) {
  const oldSlug = oldFile.replace(/\.md$/, '')
  const newSlug = cleanSlug(oldSlug)
  const newFile = newSlug + '.md'

  if (oldSlug === newSlug) continue

  // 記事内の画像パスを更新
  const oldPath = path.join(postsDir, oldFile)
  let content = fs.readFileSync(oldPath, 'utf8')
  content = content.split(oldSlug).join(newSlug)
  fs.writeFileSync(oldPath, content, 'utf8')

  // 記事ファイルをリネーム
  fs.renameSync(oldPath, path.join(postsDir, newFile))
  console.log('記事: ' + oldFile)
  console.log('  => ' + newFile)

  // 関連画像をリネーム
  const imgFiles = fs.readdirSync(imagesDir).filter(f => f.startsWith(oldSlug))
  for (const img of imgFiles) {
    const newImg = img.split(oldSlug).join(newSlug)
    fs.renameSync(path.join(imagesDir, img), path.join(imagesDir, newImg))
    console.log('  画像: ' + img + ' => ' + newImg)
  }
}
console.log('\n完了: ' + targets.length + '件処理')
