// 既存の public/images/ を JPEG に変換・圧縮するスクリプト
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images')
const MAX_WIDTH = 1200
const JPEG_QUALITY = 82

async function compressAll() {
  const files = fs.readdirSync(IMAGES_DIR).filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
  let totalBefore = 0
  let totalAfter = 0

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file)
    const ext = path.extname(file).toLowerCase()

    // すでに小さい JPEG はスキップ
    const statBefore = fs.statSync(filePath)
    totalBefore += statBefore.size

    const baseName = path.basename(file, ext)
    const outName = baseName + '.jpg'
    const outPath = path.join(IMAGES_DIR, outName)

    try {
      await sharp(filePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(outPath + '.tmp')

      const statAfter = fs.statSync(outPath + '.tmp')
      totalAfter += statAfter.size

      // 元ファイルを置き換え（PNG→JPG のときは元を削除）
      fs.renameSync(outPath + '.tmp', outPath)
      if (ext !== '.jpg' && ext !== '.jpeg') {
        fs.unlinkSync(filePath)
      }

      const before = (statBefore.size / 1024).toFixed(0)
      const after = (statAfter.size / 1024).toFixed(0)
      const ratio = Math.round((1 - statAfter.size / statBefore.size) * 100)
      console.log(`✓ ${file} → ${outName}  ${before}KB → ${after}KB  (-${ratio}%)`)
    } catch (e) {
      console.error(`✗ ${file}: ${e.message}`)
    }
  }

  const mb = n => (n / 1024 / 1024).toFixed(1)
  console.log(`\n合計: ${mb(totalBefore)}MB → ${mb(totalAfter)}MB (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`)
}

compressAll()
