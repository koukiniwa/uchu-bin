const http = require('http')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const sharp = require('sharp')

const PORT = 3001
const POSTS_DIR = path.join(__dirname, 'posts')
const DRAFTS_DIR = path.join(__dirname, 'drafts')
const IMAGES_DIR = path.join(__dirname, 'public', 'images')
const CATEGORIES = ['ロケット', '衛星・通信', '有人宇宙飛行', '月探査', '火星探査']

if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true })
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true })

// ── Helper functions ──────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*['"]?(.*?)['"]?\s*$/)
    if (m) meta[m[1]] = m[2]
  }
  return { meta, body: match[2].trim() }
}

function getList(dir) {
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'test.md')
  return files.map(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf-8')
    const { meta } = parseFrontmatter(content)
    return {
      file: f,
      title: meta.title || f,
      date: meta.date || '',
      category: meta.category || '',
      description: meta.description || '',
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

function generateSlug(title) {
  const date = new Date().toISOString().slice(0, 10)
  let slug = title
    .toLowerCase()
    .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  if (!slug) slug = Date.now().toString()
  return `${date}-${slug}`
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      const params = new URLSearchParams(body)
      const obj = {}
      params.forEach((v, k) => { obj[k] = v })
      resolve(obj)
    })
  })
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks)
        const ct = req.headers['content-type'] || ''
        const bMatch = ct.match(/boundary="?([^";]+)"?/)
        if (!bMatch) return reject(new Error('No boundary'))
        const boundary = '--' + bMatch[1].trim()
        const fields = {}
        const files = {}
        let pos = 0
        const boundaryBuf = Buffer.from(boundary)
        while (pos < body.length) {
          const bStart = body.indexOf(boundaryBuf, pos)
          if (bStart === -1) break
          pos = bStart + boundaryBuf.length
          if (body[pos] === 45 && body[pos + 1] === 45) break
          if (body[pos] === 13) pos += 2
          const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos)
          if (headerEnd === -1) break
          const headerStr = body.slice(pos, headerEnd).toString()
          pos = headerEnd + 4
          const nextBoundary = body.indexOf(Buffer.from('\r\n' + boundary), pos)
          const contentEnd = nextBoundary === -1 ? body.length : nextBoundary
          const content = body.slice(pos, contentEnd)
          pos = contentEnd
          const nameMatch = headerStr.match(/name="([^"]+)"/)
          const filenameMatch = headerStr.match(/filename="([^"]*)"/)
          if (!nameMatch) continue
          const fieldName = nameMatch[1]
          if (filenameMatch && filenameMatch[1]) {
            const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i)
            files[fieldName] = {
              filename: filenameMatch[1],
              contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
              data: content,
            }
          } else {
            fields[fieldName] = content.toString()
          }
        }
        resolve({ fields, files })
      } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

async function saveImage(data) {
  const name = Date.now() + '.jpg'
  await sharp(data)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(IMAGES_DIR, name))
  return name
}

function buildFrontmatter(title, description, date, category, image) {
  const esc = s => (s || '').replace(/'/g, "\\'")
  let fm = `---\ntitle: '${esc(title)}'\n`
  if (description) fm += `description: '${esc(description)}'\n`
  fm += `date: '${date}'\ncategory: '${category}'`
  if (image) fm += `\nimage: '${esc(image)}'`
  fm += '\n---\n\n'
  return fm
}

// ── CSS shared across pages ───────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; background: #f4f6fb; color: #111; }
  header { background: #1a2744; padding: 0 32px; height: 60px; display: flex; align-items: center; gap: 12px; }
  header .bar { width: 3px; height: 30px; background: #5a8fd4; }
  header h1 { color: #fff; font-size: 20px; letter-spacing: 0.15em; }
  header span { color: rgba(255,255,255,0.5); font-size: 12px; margin-left: 8px; }
  header a { color: rgba(255,255,255,0.7); font-size: 13px; text-decoration: none; margin-left: auto; }
  header a:hover { color: #fff; }
  .publish-btn { margin-left: auto; padding: 8px 20px; background: #43a047; color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
  .publish-btn:hover { background: #2e7d32; }
  .publish-btn:disabled { background: #aaa; cursor: not-allowed; }
  .container { max-width: 960px; margin: 36px auto; padding: 0 20px; }
  .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 8px rgba(0,0,0,0.08); padding: 32px; margin-bottom: 32px; }
  .card h2 { font-size: 15px; font-weight: 700; color: #1a2744; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #1a2744; }
  .card h2.edit-border { border-bottom-color: #e57373; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .form-row.full { grid-template-columns: 1fr; }
  label { display: block; font-size: 12px; font-weight: 700; color: #555; margin-bottom: 6px; letter-spacing: 0.05em; }
  input[type=text], input[type=date], select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; outline: none; transition: border 0.15s; }
  input:focus, select:focus, textarea:focus { border-color: #1a2744; }
  textarea { resize: vertical; min-height: 280px; line-height: 1.7; }
  .submit-btn { display: block; width: 100%; padding: 14px; background: #1a2744; color: #fff; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; margin-top: 8px; transition: background 0.15s; }
  .submit-btn:hover { background: #2e4a7a; }
  .pub-btn { display: block; width: 100%; padding: 14px; background: #43a047; color: #fff; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; margin-top: 8px; transition: background 0.15s; }
  .pub-btn:hover { background: #2e7d32; }
  .upload-btn { display: inline-block; padding: 10px 20px; background: #2e4a7a; color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .upload-btn:hover { background: #1a2744; }
  .message { padding: 14px 20px; border-radius: 4px; margin-bottom: 24px; font-size: 14px; font-weight: 600; }
  .message.success { background: #e8f5e9; color: #2e7d32; border-left: 4px solid #43a047; }
  .message.error { background: #ffebee; color: #c62828; border-left: 4px solid #e53935; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; background: #f4f6fb; color: #555; font-size: 11px; letter-spacing: 0.05em; border-bottom: 2px solid #e0e0e0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  tr:hover td { background: #fafafa; }
  .del-btn { background: none; border: 1px solid #e53935; color: #e53935; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; }
  .del-btn:hover { background: #ffebee; }
  .edit-btn { background: none; border: 1px solid #1a2744; color: #1a2744; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; text-decoration: none; display: inline-block; }
  .edit-btn:hover { background: #eef2fa; }
  .pdraft-btn { background: #43a047; border: none; color: #fff; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer; font-weight: 700; }
  .pdraft-btn:hover { background: #2e7d32; }
  .upload-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
  .upload-row input[type=file] { flex: 1; padding: 8px; border: 1px dashed #aaa; border-radius: 4px; font-size: 13px; background: #fafafa; }
  .paste-zone { border: 2px dashed #5a8fd4; border-radius: 8px; padding: 20px; text-align: center; color: #5a8fd4; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-bottom: 16px; }
  .paste-zone:hover, .paste-zone.drag-over { background: #eef4fc; }
  .paste-zone.uploading { color: #aaa; border-color: #aaa; }
  .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-top: 16px; }
  .img-item { border: 2px solid #e0e0e0; border-radius: 6px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
  .img-item:hover { border-color: #1a2744; }
  .img-item img { width: 100%; height: 90px; object-fit: cover; display: block; }
  .img-item span { display: block; font-size: 10px; color: #666; padding: 4px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #f8f8f8; }
  .textarea-wrap { position: relative; }
  .paste-hint { position: absolute; top: 8px; right: 10px; font-size: 10px; color: #aaa; pointer-events: none; }
  .md-hint { background: #f8f9fc; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 16px; font-size: 12px; color: #666; line-height: 1.8; margin-top: 8px; }
  .md-hint code { background: #e8eaf0; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
  .btn-row { display: flex; gap: 12px; margin-top: 8px; }
  .btn-row .submit-btn, .btn-row .pub-btn { margin-top: 0; }
`

const CLIENT_JS = `
  function selectImage(imgPath) {
    const input = document.getElementById('imageInput')
    if (!input) return
    input.value = imgPath
    input.style.borderColor = '#43a047'
    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function uploadBlob(blob) {
    const ext = blob.type === 'image/png' ? '.png' : blob.type === 'image/gif' ? '.gif' : blob.type === 'image/webp' ? '.webp' : '.jpg'
    const buf = await blob.arrayBuffer()
    const res = await fetch('/upload-paste?ext=' + ext, {
      method: 'POST',
      headers: { 'Content-Type': blob.type },
      body: buf,
    })
    const json = await res.json()
    if (!json.path) throw new Error('アップロード失敗')
    return json.path
  }

  function addImageToGrid(imgPath) {
    const filename = imgPath.split('/').pop()
    let grid = document.querySelector('.img-grid')
    if (!grid) {
      const container = document.getElementById('imgGridContainer')
      if (container) { container.innerHTML = '<div class="img-grid"></div>'; grid = container.querySelector('.img-grid') }
    }
    if (!grid) return
    const item = document.createElement('div')
    item.className = 'img-item'
    item.title = filename
    item.onclick = () => selectImage(imgPath)
    item.innerHTML = '<img src="/img/' + filename + '" alt="' + filename + '"><span>' + filename + '</span>'
    grid.insertBefore(item, grid.firstChild)
  }

  function convertTweetUrl(text) {
    const m = text.trim().match(/https?:\\/\\/(twitter\\.com|x\\.com)\\/\\w+\\/status\\/(\\d+)/)
    if (!m) return null
    return '<iframe src="https://platform.twitter.com/embed/Tweet.html?id=' + m[2] + '" width="100%" height="480" frameborder="0" scrolling="no" allowtransparency="true" style="max-width:550px;display:block;margin:16px auto;"></iframe>'
  }

  const pasteZone = document.getElementById('pasteZone')

  if (pasteZone) {
    pasteZone.addEventListener('dragover', (e) => { e.preventDefault(); pasteZone.classList.add('drag-over') })
    pasteZone.addEventListener('dragleave', () => pasteZone.classList.remove('drag-over'))
    pasteZone.addEventListener('drop', async (e) => {
      e.preventDefault()
      pasteZone.classList.remove('drag-over')
      const file = e.dataTransfer.files[0]
      if (!file || !file.type.startsWith('image/')) return
      await handleImageUpload(file, 'thumbnail')
    })
  }

  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData ? Array.from(e.clipboardData.items) : []
    const imageItem = items.find(i => i.type.startsWith('image/'))

    if (!imageItem) {
      const textItem = items.find(i => i.type === 'text/plain')
      if (textItem && document.activeElement && document.activeElement.id === 'contentArea') {
        textItem.getAsString((text) => {
          const embed = convertTweetUrl(text)
          if (embed) {
            e.preventDefault()
            const ca = document.getElementById('contentArea')
            const pos = ca.selectionStart
            ca.value = ca.value.slice(0, pos) + '\\n' + embed + '\\n' + ca.value.slice(ca.selectionEnd)
          }
        })
      }
      return
    }

    const isInContent = document.activeElement && document.activeElement.id === 'contentArea'
    if (isInContent) {
      e.preventDefault()
      const ca = document.getElementById('contentArea')
      const pos = ca.selectionStart
      const before = ca.value.slice(0, pos)
      const after = ca.value.slice(ca.selectionEnd)
      ca.value = before + '\\n![アップロード中...](uploading)\\n' + after
      if (pasteZone) { pasteZone.innerHTML = '⏳ 本文に画像を挿入中...'; pasteZone.classList.add('uploading') }
      try {
        const imgPath = await uploadBlob(imageItem.getAsFile())
        ca.value = ca.value.replace('\\n![アップロード中...](uploading)\\n', '\\n![画像](' + imgPath + ')\\n')
        addImageToGrid(imgPath)
        if (pasteZone) {
          pasteZone.innerHTML = '✓ 本文に画像を挿入しました'
          pasteZone.style.borderColor = '#43a047'
          pasteZone.style.color = '#2e7d32'
          setTimeout(() => resetPasteZone(), 3000)
        }
      } catch (err) {
        ca.value = ca.value.replace('\\n![アップロード中...](uploading)\\n', '')
        if (pasteZone) { pasteZone.innerHTML = 'エラー：' + err.message; pasteZone.classList.remove('uploading') }
      }
    } else {
      e.preventDefault()
      await handleImageUpload(imageItem.getAsFile(), 'thumbnail')
    }
  })

  async function handleImageUpload(blob, target) {
    if (!pasteZone) return
    pasteZone.innerHTML = '⏳ アップロード中...'
    pasteZone.classList.add('uploading')
    try {
      const imgPath = await uploadBlob(blob)
      addImageToGrid(imgPath)
      if (target === 'thumbnail') {
        selectImage(imgPath)
        pasteZone.innerHTML = '✓ アップロード完了！サムネイル欄に入力しました<br><span style="font-size:11px;font-weight:400;color:#2e7d32;">本文に入れる場合は本文欄をクリックしてからCtrl+V</span>'
        pasteZone.style.borderColor = '#43a047'
        pasteZone.style.color = '#2e7d32'
      }
      pasteZone.classList.remove('uploading')
      setTimeout(() => resetPasteZone(), 4000)
    } catch (err) {
      pasteZone.innerHTML = 'エラー：' + err.message
      pasteZone.classList.remove('uploading')
      setTimeout(() => resetPasteZone(), 3000)
    }
  }

  async function generateArticle(btn) {
    if (!confirm('新しい記事を生成しますか？（1〜2分かかります）')) return
    btn.disabled = true
    btn.textContent = '⏳ 生成中...'
    try {
      const res = await fetch('/generate', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        btn.textContent = '✓ 生成完了！'
        btn.style.background = '#43a047'
        setTimeout(() => location.reload(), 1500)
      } else {
        alert('エラー: ' + json.error)
        btn.disabled = false
        btn.textContent = '🔄 新しく生成'
      }
    } catch(e) {
      alert('通信エラー: ' + e.message)
      btn.disabled = false
      btn.textContent = '🔄 新しく生成'
    }
  }

  async function publish() {
    const btn = document.getElementById('publishBtn')
    btn.disabled = true
    btn.textContent = '⏳ 公開中...'
    try {
      const res = await fetch('/publish', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        btn.textContent = '✓ 公開完了！'
        btn.style.background = '#1565c0'
        setTimeout(() => { btn.disabled = false; btn.textContent = '🚀 公開する'; btn.style.background = '' }, 5000)
      } else {
        alert('エラー: ' + json.error)
        btn.disabled = false
        btn.textContent = '🚀 公開する'
      }
    } catch (e) {
      alert('通信エラー: ' + e.message)
      btn.disabled = false
      btn.textContent = '🚀 公開する'
    }
  }

  function resetPasteZone() {
    if (!pasteZone) return
    pasteZone.innerHTML = '📋 スクリーンショットをCtrl+Vで貼り付け（サムネイル用）<br><span style="font-size:11px;font-weight:400;color:#888;">本文に入れる場合は本文欄をクリックしてからCtrl+V ／ ドラッグ＆ドロップも可</span>'
    pasteZone.style.borderColor = ''
    pasteZone.style.color = ''
  }
`

// ── HTML renderers ────────────────────────────────────────────────────────────

function renderMain(message) {
  const posts = getList(POSTS_DIR)
  const drafts = getList(DRAFTS_DIR)
  const images = fs.existsSync(IMAGES_DIR)
    ? fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)).sort((a, b) => b.localeCompare(a))
    : []
  const today = new Date().toISOString().slice(0, 10)
  const categoryOptions = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')

  // Draft rows
  const draftRowsArr = []
  for (const d of drafts) {
    draftRowsArr.push(`<tr>
      <td>${d.date}</td>
      <td>${d.category}</td>
      <td style="font-weight:600;">${d.title}</td>
      <td style="font-size:12px;color:#666;max-width:200px;">${d.description}</td>
      <td style="white-space:nowrap;">
        <div style="display:flex;gap:6px;">
          <a href="/edit-draft?file=${encodeURIComponent(d.file)}" class="edit-btn">編集</a>
          <form method="POST" action="/publish-draft" style="margin:0">
            <input type="hidden" name="file" value="${d.file}">
            <button type="submit" class="pdraft-btn">公開する</button>
          </form>
          <form method="POST" action="/delete-draft" onsubmit="return confirm('削除しますか？')" style="margin:0">
            <input type="hidden" name="file" value="${d.file}">
            <button type="submit" class="del-btn">削除</button>
          </form>
        </div>
      </td>
    </tr>`)
  }

  let draftsSection
  if (drafts.length === 0) {
    draftsSection = '<p style="color:#aaa;font-size:13px;">下書きはありません（毎朝6時に自動生成されます）</p>'
  } else {
    draftsSection = '<table><thead><tr><th>日付</th><th>カテゴリ</th><th>タイトル</th><th>説明</th><th></th></tr></thead><tbody>'
    draftsSection += draftRowsArr.join('')
    draftsSection += '</tbody></table>'
  }

  // Post rows
  const postRowsArr = []
  for (const p of posts) {
    postRowsArr.push(`<tr>
      <td>${p.date}</td>
      <td>${p.category}</td>
      <td>${p.title}</td>
      <td style="white-space:nowrap;">
        <div style="display:flex;gap:6px;">
          <a href="/edit?file=${encodeURIComponent(p.file)}" class="edit-btn">編集</a>
          <form method="POST" action="/delete" onsubmit="return confirm('削除しますか？')" style="margin:0">
            <input type="hidden" name="file" value="${p.file}">
            <button type="submit" class="del-btn">削除</button>
          </form>
        </div>
      </td>
    </tr>`)
  }

  let postsSection
  if (posts.length === 0) {
    postsSection = '<p style="color:#aaa;font-size:13px;">記事がありません</p>'
  } else {
    postsSection = '<table><thead><tr><th>日付</th><th>カテゴリ</th><th>タイトル</th><th></th></tr></thead><tbody>'
    postsSection += postRowsArr.join('')
    postsSection += '</tbody></table>'
  }

  // Image grid
  let imageGrid
  if (images.length === 0) {
    imageGrid = '<p style="color:#aaa;font-size:13px;margin-top:8px;">画像がありません</p>'
  } else {
    const imgItems = []
    for (const img of images) {
      imgItems.push(`<div class="img-item" onclick="selectImage('/images/${img}')" title="${img}"><img src="/img/${img}" alt="${img}"><span>${img}</span></div>`)
    }
    imageGrid = '<div class="img-grid">' + imgItems.join('') + '</div>'
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>宇宙便 管理画面</title>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <div class="bar"></div>
    <h1>宇宙便</h1>
    <span>管理画面</span>
    <button class="publish-btn" id="publishBtn" onclick="publish()">🚀 公開する</button>
  </header>
  <div class="container">
    ${message || ''}

    <!-- 公開済み記事一覧（上部に移動） -->
    <div class="card" id="posts-section">
      <h2>公開済み記事一覧</h2>
      ${postsSection}
    </div>

    <!-- AI下書き -->
    <div class="card">
      <h2 style="display:flex;align-items:center;justify-content:space-between;">
        <span>🤖 AI下書き（確認・公開待ち）</span>
        <button onclick="generateArticle(this)" style="padding:6px 16px;background:#5a8fd4;color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">🔄 新しく生成</button>
      </h2>
      ${draftsSection}
    </div>

    <!-- 新規記事作成 -->
    <div class="card" id="create-section">
      <h2>新規記事を作成</h2>
      <form method="POST" action="/create">
        <div class="form-row">
          <div>
            <label>タイトル *</label>
            <input type="text" name="title" required placeholder="例：H3ロケット4号機、打ち上げ成功">
          </div>
          <div>
            <label>カテゴリ *</label>
            <select name="category" required>${categoryOptions}</select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>公開日 *</label>
            <input type="date" name="date" value="${today}" required>
          </div>
          <div>
            <label>サムネイル画像</label>
            <input type="text" id="imageInput" name="image" placeholder="/images/... または https://...">
          </div>
        </div>
        <div class="form-row full">
          <div>
            <label>説明文（一覧に表示）</label>
            <input type="text" name="description" placeholder="記事の要約を1〜2文で">
          </div>
        </div>
        <div class="form-row full">
          <div>
            <label>本文（Markdown）* ― 画像を貼り付けたい位置にカーソルを置いてCtrl+V</label>
            <div class="textarea-wrap">
              <textarea id="contentArea" name="content" required placeholder="## 見出し&#10;&#10;本文を書く..."></textarea>
              <span class="paste-hint">Ctrl+V で画像挿入</span>
            </div>
            <div class="md-hint">
              <code>## 見出し</code> &nbsp;
              <code>**太字**</code> &nbsp;
              <code>- リスト</code> &nbsp;
              <code>&gt; 引用</code>
            </div>
          </div>
        </div>
        <button type="submit" class="submit-btn">記事を作成する</button>
      </form>
    </div>

    <!-- 画像管理 -->
    <div class="card">
      <h2>画像をアップロード</h2>
      <div class="paste-zone" id="pasteZone">
        📋 スクリーンショットをCtrl+Vで貼り付け（サムネイル用）<br>
        <span style="font-size:11px;font-weight:400;color:#888;">本文に入れる場合は本文欄をクリックしてからCtrl+V ／ ドラッグ＆ドロップも可</span>
      </div>
      <form method="POST" action="/upload" enctype="multipart/form-data">
        <div class="upload-row">
          <input type="file" name="image" accept="image/*">
          <button type="submit" class="upload-btn">ファイルから追加</button>
        </div>
      </form>
      <p style="font-size:12px;color:#999;margin-bottom:4px;">↓ 画像をクリック → 記事フォームのサムネイル欄に自動入力</p>
      <div id="imgGridContainer">${imageGrid}</div>
    </div>

  </div>
  <script>${CLIENT_JS}</script>
</body>
</html>`
}

function renderEdit(file, meta, body, message) {
  return renderSplitEditor({
    file, meta, body,
    message: message ? message.replace(/<[^>]+>/g, '') : '',
    action: '/update',
    publishAction: '/update',
    accentColor: '#e57373',
    titleLabel: '記事編集',
  })
}

function renderSplitEditor({ file, meta, body, message, action, publishAction, accentColor, titleLabel }) {
  const categoryOptions = CATEGORIES.map(c =>
    `<option value="${c}"${meta.category === c ? ' selected' : ''}>${c}</option>`
  ).join('')
  const safeTitle = (meta.title || '').replace(/"/g, '&quot;')
  const safeImage = (meta.image || '').replace(/"/g, '&quot;')
  const safeDesc  = (meta.description || '').replace(/"/g, '&quot;')
  const safeBody  = (body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const color = accentColor || '#1a2744'

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titleLabel} - 宇宙便</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Hiragino Sans','Meiryo',sans-serif; background:#f4f6fb; color:#111; height:100vh; overflow:hidden; display:flex; flex-direction:column; }
    header { background:#1a2744; padding:0 24px; height:56px; display:flex; align-items:center; gap:12px; flex-shrink:0; }
    header .bar { width:3px; height:28px; background:${color}; }
    header h1 { color:#fff; font-size:18px; letter-spacing:0.12em; }
    header a { color:rgba(255,255,255,0.7); font-size:13px; text-decoration:none; margin-left:16px; }
    header a:hover { color:#fff; }
    .msg-bar { padding:10px 24px; font-size:13px; font-weight:600; flex-shrink:0; }
    .msg-bar.success { background:#e8f5e9; color:#2e7d32; border-bottom:1px solid #c8e6c9; }
    .msg-bar.error   { background:#ffebee; color:#c62828; border-bottom:1px solid #ffcdd2; }
    .split { display:flex; flex:1; overflow:hidden; }
    /* ── 左ペイン ── */
    .left { width:48%; min-width:380px; overflow-y:auto; padding:20px 24px; border-right:1px solid #dde3f0; background:#f8f9fc; display:flex; flex-direction:column; gap:12px; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .field-row.full { grid-template-columns:1fr; }
    label { display:block; font-size:11px; font-weight:700; color:#555; margin-bottom:5px; letter-spacing:0.06em; }
    input[type=text], input[type=date], select { width:100%; padding:9px 11px; border:1px solid #ddd; border-radius:4px; font-size:13px; font-family:inherit; outline:none; background:#fff; }
    input:focus, select:focus { border-color:${color}; }
    .body-label { font-size:11px; font-weight:700; color:#555; letter-spacing:0.06em; margin-bottom:5px; }
    #f-body { width:100%; flex:1; min-height:320px; padding:12px; border:1px solid #ddd; border-radius:4px; font-size:13px; font-family:'Courier New',monospace; line-height:1.75; resize:none; outline:none; }
    #f-body:focus { border-color:${color}; }
    .paste-zone { border:2px dashed #5a8fd4; border-radius:6px; padding:14px; text-align:center; color:#5a8fd4; font-size:12px; font-weight:600; cursor:pointer; transition:background 0.15s; }
    .paste-zone:hover, .paste-zone.drag-over { background:#eef4fc; }
    .btn-row { display:flex; gap:10px; }
    .save-btn { flex:1; padding:11px; background:${color}; color:#fff; border:none; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer; }
    .save-btn:hover { opacity:0.88; }
    .pub-btn { flex:1; padding:11px; background:#43a047; color:#fff; border:none; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer; }
    .pub-btn:hover { background:#2e7d32; }
    /* ── 右ペイン（プレビュー） ── */
    .right { flex:1; overflow-y:auto; padding:28px 36px; background:#fff; }
    .preview-cover { width:100%; max-height:420px; object-fit:cover; display:block; margin-bottom:28px; border-radius:4px; }
    .preview-cat { font-size:11px; font-weight:700; letter-spacing:0.1em; color:#1565c0; padding:3px 10px; border:1px solid #1565c0; display:inline-block; margin-bottom:14px; }
    .preview-title { font-size:26px; font-weight:800; color:#111; line-height:1.55; margin-bottom:12px; }
    .preview-date { font-size:12px; color:#999; border-bottom:1px solid #e0e0e0; padding-bottom:16px; margin-bottom:28px; }
    .preview-body { font-size:16px; line-height:2.0; color:#333; letter-spacing:0.02em; }
    .preview-body h2 { margin-top:2.2rem; margin-bottom:0.7rem; font-size:1.2rem; font-weight:700; color:#111; border-left:3px solid #1a2744; padding-left:12px; }
    .preview-body h3 { margin-top:1.6rem; margin-bottom:0.5rem; font-size:1rem; font-weight:700; color:#222; }
    .preview-body p { margin-bottom:1.1rem; }
    .preview-body img { max-width:100%; max-height:480px; object-fit:contain; display:block; margin:1.2rem auto; }
    .preview-body em { color:#8892a4; font-size:0.88em; display:block; text-align:center; margin-top:-0.8rem; margin-bottom:1.2rem; }
    .preview-body strong { font-weight:700; }
    .preview-body ul, .preview-body ol { padding-left:1.5rem; margin-bottom:1rem; }
    .preview-body li { margin-bottom:0.4rem; }
    .preview-body blockquote { border-left:3px solid #ccc; padding-left:1rem; color:#666; margin:1rem 0; font-style:italic; }
    .preview-body a { color:#1565c0; }
    .preview-placeholder { color:#bbb; font-size:14px; margin-top:60px; text-align:center; }
  </style>
</head>
<body>
  <header>
    <div class="bar"></div>
    <h1>宇宙便</h1>
    <a href="/">← 一覧に戻る</a>
  </header>
  ${message ? `<div class="msg-bar ${message.includes('エラー') ? 'error' : 'success'}">${message}</div>` : ''}
  <div class="split">
    <!-- 左：プレビュー -->
    <div class="right" id="preview-pane">
      <p class="preview-placeholder">右で入力するとここにプレビューが表示されます →</p>
    </div>
    <!-- 右：編集 -->
    <div class="left">
      <form id="editForm" method="POST" action="${action}" style="display:contents;">
        <input type="hidden" name="file" value="${file}">
        <div class="field-row">
          <div>
            <label>タイトル *</label>
            <input type="text" id="f-title" name="title" value="${safeTitle}" required>
          </div>
          <div>
            <label>カテゴリ *</label>
            <select id="f-cat" name="category" required>${categoryOptions}</select>
          </div>
        </div>
        <div class="field-row">
          <div>
            <label>公開日 *</label>
            <input type="date" id="f-date" name="date" value="${meta.date || ''}" required>
          </div>
          <div>
            <label>カバー画像パス</label>
            <input type="text" id="f-image" name="image" value="${safeImage}" placeholder="/images/ファイル名.jpg">
          </div>
        </div>
        <div class="field-row full">
          <div>
            <label>説明文（一覧に表示）</label>
            <input type="text" id="f-desc" name="description" value="${safeDesc}">
          </div>
        </div>
        <div class="paste-zone" id="pasteZone">
          📋 Ctrl+V で画像を貼り付け ／ ドラッグ＆ドロップ
        </div>
        <div>
          <div class="body-label">本文（Markdown）*</div>
          <textarea id="f-body" name="content" required>${safeBody}</textarea>
        </div>
        <div class="btn-row">
          <button type="submit" class="save-btn">💾 保存</button>
          <button type="button" class="pub-btn" onclick="publishDraft()">🚀 公開する</button>
        </div>
      </form>
    </div>
  </div>

  <form id="pubForm" method="POST" action="${publishAction}" style="display:none;">
    <input type="hidden" name="file" value="${file}">
  </form>

  <script>
    const TWEET_RE = /^https?:\\/\\/(twitter\\.com|x\\.com)\\/\\S+\\/status\\/\\d+/

    function renderPreview() {
      const title = document.getElementById('f-title').value
      const image = document.getElementById('f-image').value
      const body  = document.getElementById('f-body').value
      const cat   = document.getElementById('f-cat').value
      const date  = document.getElementById('f-date').value
      const pane  = document.getElementById('preview-pane')

      // bodyをTwitter埋め込み対応でHTML化
      const lines = body.split('\\n')
      const processedLines = lines.map(line => {
        if (TWEET_RE.test(line.trim())) {
          const m = line.trim().match(/status\\/(\\d+)/)
          if (m) return '<blockquote class="twitter-tweet" data-lang="ja"><a href="' + line.trim() + '"></a></blockquote>'
        }
        return line
      })
      // /images/ → /img/ に変換してadminサーバーから画像を配信
      const fixImgPath = src => src.startsWith('/images/') ? src.replace('/images/', '/img/') : src
      const htmlBody = marked.parse(processedLines.join('\\n'))
        .replace(/src="(\\/images\\/[^"]+)"/g, (_, p) => 'src="' + fixImgPath(p) + '"')

      const coverSrc = fixImgPath(image)
      pane.innerHTML =
        (image ? '<img class="preview-cover" src="' + coverSrc + '" alt="">' : '') +
        (cat   ? '<span class="preview-cat">' + cat + '</span>' : '') +
        (title ? '<h1 class="preview-title">' + title + '</h1>' : '') +
        (date  ? '<div class="preview-date">' + date + '</div>' : '') +
        '<div class="preview-body">' + htmlBody + '</div>'

      // Twitter埋め込みを描画
      if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load(pane)
      }
    }

    // リアルタイム更新
    ['f-title','f-image','f-body','f-cat','f-date'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.addEventListener('input', renderPreview)
    })
    renderPreview()

    // 公開ボタン
    function publishDraft() {
      if (!confirm('この内容で公開しますか？')) return
      document.getElementById('pubForm').submit()
    }

    // 画像アップロード共通
    async function uploadBlob(blob) {
      const ext = blob.type === 'image/png' ? '.png' : blob.type === 'image/gif' ? '.gif' : blob.type === 'image/webp' ? '.webp' : '.jpg'
      const buf = await blob.arrayBuffer()
      const res = await fetch('/upload-paste?ext=' + ext, { method:'POST', headers:{'Content-Type':blob.type}, body:buf })
      const json = await res.json()
      if (!json.path) throw new Error('アップロード失敗')
      return json.path
    }

    function setPasteZone(msg, color) {
      const z = document.getElementById('pasteZone')
      z.textContent = msg
      z.style.borderColor = color || ''
      z.style.color = color || ''
    }

    function resetPasteZone() {
      setPasteZone('📋 Ctrl+V で画像を貼り付け ／ ドラッグ＆ドロップ')
    }

    async function handleImage(blob) {
      setPasteZone('⏳ アップロード中...')
      try {
        const imgPath = await uploadBlob(blob)
        // カバー画像欄が空なら自動入力、そうでなければ本文に挿入
        const imgInput = document.getElementById('f-image')
        const bodyEl   = document.getElementById('f-body')
        if (!imgInput.value) {
          imgInput.value = imgPath
          setPasteZone('✓ カバー画像に設定しました', '#43a047')
        } else {
          const pos = bodyEl.selectionStart
          bodyEl.value = bodyEl.value.slice(0, pos) + '\\n![](' + imgPath + ')\\n' + bodyEl.value.slice(bodyEl.selectionEnd)
          setPasteZone('✓ 本文に挿入しました', '#43a047')
        }
        renderPreview()
        setTimeout(resetPasteZone, 3000)
      } catch(e) {
        setPasteZone('エラー: ' + e.message, '#e53935')
        setTimeout(resetPasteZone, 3000)
      }
    }

    // ペースト（画像 or TwitterURL）
    document.addEventListener('paste', async (e) => {
      const items = e.clipboardData ? Array.from(e.clipboardData.items) : []
      const imgItem = items.find(i => i.type.startsWith('image/'))
      if (imgItem) { e.preventDefault(); await handleImage(imgItem.getAsFile()); return }

      // Twitter URLの自動変換（本文エリアにフォーカス中）
      if (document.activeElement?.id === 'f-body') {
        const textItem = items.find(i => i.type === 'text/plain')
        if (textItem) {
          textItem.getAsString(text => {
            if (TWEET_RE.test(text.trim())) {
              e.preventDefault()
              const el = document.getElementById('f-body')
              const pos = el.selectionStart
              el.value = el.value.slice(0, pos) + '\\n' + text.trim() + '\\n' + el.value.slice(el.selectionEnd)
              renderPreview()
            }
          })
        }
      }
    })

    // ドラッグ＆ドロップ
    const pasteZone = document.getElementById('pasteZone')
    pasteZone.addEventListener('dragover', e => { e.preventDefault(); pasteZone.classList.add('drag-over') })
    pasteZone.addEventListener('dragleave', () => pasteZone.classList.remove('drag-over'))
    pasteZone.addEventListener('drop', async e => {
      e.preventDefault(); pasteZone.classList.remove('drag-over')
      const f = e.dataTransfer.files[0]
      if (f && f.type.startsWith('image/')) await handleImage(f)
    })
  </script>
</body>
</html>`
}

function renderEditDraft(file, meta, body, message) {
  return renderSplitEditor({
    file, meta, body,
    message: message ? message.replace(/<[^>]+>/g, '') : '',
    action: '/update-draft',
    publishAction: '/publish-draft',
    accentColor: '#ffa726',
    titleLabel: '下書き編集',
  })
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, 'http://localhost')
  const pathname = urlObj.pathname

  // GET /
  if (req.method === 'GET' && pathname === '/') {
    const msg = urlObj.searchParams.get('msg')
      ? `<div class="message success">✓ ${urlObj.searchParams.get('msg')}</div>`
      : ''
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderMain(msg))
    return
  }

  // GET /img/:filename
  if (req.method === 'GET' && pathname.startsWith('/img/')) {
    const filename = path.basename(decodeURIComponent(pathname.replace('/img/', '')))
    const filePath = path.join(IMAGES_DIR, filename)
    if (fs.existsSync(filePath) && filePath.startsWith(IMAGES_DIR)) {
      const ext = path.extname(filename).toLowerCase()
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    } else {
      res.writeHead(404); res.end()
    }
    return
  }

  // GET /edit?file=xxx.md
  if (req.method === 'GET' && pathname === '/edit') {
    try {
      const file = path.basename(urlObj.searchParams.get('file') || '')
      const filePath = path.join(POSTS_DIR, file)
      if (!file || !filePath.startsWith(POSTS_DIR) || !fs.existsSync(filePath)) throw new Error('記事が見つかりません')
      const { meta, body } = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderEdit(file, meta, body, ''))
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderEdit('', {}, '', `<div class="message error">エラー：${e.message}</div>`))
    }
    return
  }

  // GET /edit-draft?file=xxx.md
  if (req.method === 'GET' && pathname === '/edit-draft') {
    try {
      const file = path.basename(urlObj.searchParams.get('file') || '')
      const filePath = path.join(DRAFTS_DIR, file)
      if (!file || !filePath.startsWith(DRAFTS_DIR) || !fs.existsSync(filePath)) throw new Error('下書きが見つかりません')
      const { meta, body } = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderEditDraft(file, meta, body, ''))
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderEditDraft('', {}, '', `<div class="message error">エラー：${e.message}</div>`))
    }
    return
  }

  // POST /create
  if (req.method === 'POST' && pathname === '/create') {
    const data = await parseBody(req)
    try {
      const { title, category, date, image, description, content } = data
      if (!title || !category || !date || !content) throw new Error('必須項目が未入力です')
      const slug = generateSlug(title)
      const filePath = path.join(POSTS_DIR, slug + '.md')
      fs.writeFileSync(filePath, buildFrontmatter(title, description, date, category, image) + content.replace(/\r\n/g, '\n'), 'utf-8')
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('記事「' + title + '」を作成しました') + '#posts-section' })
      res.end()
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderMain(`<div class="message error">エラー：${e.message}</div>`))
    }
    return
  }

  // POST /update
  if (req.method === 'POST' && pathname === '/update') {
    const data = await parseBody(req)
    try {
      const { file, title, category, date, image, description, content } = data
      if (!title || !category || !date || !content) throw new Error('必須項目が未入力です')
      const filePath = path.join(POSTS_DIR, path.basename(file))
      if (!filePath.startsWith(POSTS_DIR)) throw new Error('不正なリクエスト')
      const bodyText = content.replace(/\r\n/g, '\n')
      fs.writeFileSync(filePath, buildFrontmatter(title, description, date, category, image) + bodyText, 'utf-8')
      const msg = `<div class="message success">✓ 記事を更新しました</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderEdit(path.basename(file), { title, category, date, image, description }, bodyText, msg))
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderMain(`<div class="message error">エラー：${e.message}</div>`))
    }
    return
  }

  // POST /update-draft
  if (req.method === 'POST' && pathname === '/update-draft') {
    const data = await parseBody(req)
    try {
      const { file, title, category, date, image, description, content } = data
      if (!title || !category || !date || !content) throw new Error('必須項目が未入力です')
      const filePath = path.join(DRAFTS_DIR, path.basename(file))
      if (!filePath.startsWith(DRAFTS_DIR)) throw new Error('不正なリクエスト')
      const bodyText = content.replace(/\r\n/g, '\n')
      fs.writeFileSync(filePath, buildFrontmatter(title, description, date, category, image) + bodyText, 'utf-8')
      const msg = `<div class="message success">✓ 下書きを保存しました</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderEditDraft(path.basename(file), { title, category, date, image, description }, bodyText, msg))
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderMain(`<div class="message error">エラー：${e.message}</div>`))
    }
    return
  }

  // POST /publish-draft
  if (req.method === 'POST' && pathname === '/publish-draft') {
    const data = await parseBody(req)
    try {
      const basename = path.basename(data.file || '')
      const srcPath = path.join(DRAFTS_DIR, basename)
      const dstPath = path.join(POSTS_DIR, basename)
      if (!srcPath.startsWith(DRAFTS_DIR)) throw new Error('不正なリクエスト')
      if (!fs.existsSync(srcPath)) throw new Error('下書きが見つかりません')
      fs.copyFileSync(srcPath, dstPath)
      fs.unlinkSync(srcPath)
      const date = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      const cmd = `git pull --rebase --autostash && git add -A posts/ drafts/ && git commit -m "記事公開 ${date}" && git push`
      exec(cmd, { cwd: __dirname }, (err, _stdout, stderr) => {
        if (err && stderr && !stderr.includes('nothing to commit')) {
          res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('公開しました（git警告: ' + stderr.slice(0, 80) + '）') })
        } else {
          res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('記事を公開しました → Vercelが自動デプロイします') })
        }
        res.end()
      })
    } catch (e) {
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('エラー: ' + e.message) })
      res.end()
    }
    return
  }

  // POST /delete-draft
  if (req.method === 'POST' && pathname === '/delete-draft') {
    const data = await parseBody(req)
    try {
      const filePath = path.join(DRAFTS_DIR, path.basename(data.file || ''))
      if (!filePath.startsWith(DRAFTS_DIR)) throw new Error('不正なリクエスト')
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('下書きを削除しました') })
      res.end()
    } catch (e) {
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('エラー: ' + e.message) })
      res.end()
    }
    return
  }

  // POST /delete
  if (req.method === 'POST' && pathname === '/delete') {
    const data = await parseBody(req)
    try {
      const filePath = path.join(POSTS_DIR, path.basename(data.file || ''))
      if (!filePath.startsWith(POSTS_DIR)) throw new Error('不正なリクエスト')
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('記事を削除しました') })
      res.end()
    } catch (e) {
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('エラー: ' + e.message) })
      res.end()
    }
    return
  }

  // POST /upload (multipart file upload)
  if (req.method === 'POST' && pathname === '/upload') {
    try {
      const { files } = await parseMultipart(req)
      const file = files['image']
      if (!file || !file.filename) throw new Error('ファイルが選択されていません')
      const ext = path.extname(file.filename).toLowerCase()
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) throw new Error('対応形式：JPG / PNG / GIF / WebP')
      const name = await saveImage(file.data)
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('画像をアップロードしました → /images/' + name) })
      res.end()
    } catch (e) {
      res.writeHead(302, { Location: '/?msg=' + encodeURIComponent('アップロードエラー: ' + e.message) })
      res.end()
    }
    return
  }

  // POST /upload-paste?ext=.png (raw body, JSON response)
  if (req.method === 'POST' && pathname === '/upload-paste') {
    try {
      const ext = urlObj.searchParams.get('ext') || '.png'
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) throw new Error('対応外の形式')
      const data = await readRawBody(req)
      const name = await saveImage(data)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ path: '/images/' + name }))
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  // POST /publish (git add/commit/push, JSON response)
  if (req.method === 'POST' && pathname === '/publish') {
    const date = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const cmd = `git pull --rebase --autostash && git add -A posts/ public/images/ drafts/ && (git diff --cached --quiet && echo "nothing" || git commit -m "記事更新 ${date}") && git push`
    exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      if (err) {
        const msg = stderr || err.message
        if (msg.includes('nothing') || stdout.includes('nothing')) {
          res.end(JSON.stringify({ ok: true }))
        } else {
          res.end(JSON.stringify({ ok: false, error: msg }))
        }
      } else {
        res.end(JSON.stringify({ ok: true }))
      }
    })
    return
  }

  // POST /generate
  if (req.method === 'POST' && pathname === '/generate') {
    const apiKey = process.env.ANTHROPIC_API_KEY || ''
    if (!apiKey) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY が設定されていません' }))
      return
    }
    const cmd = `node scripts/generate-news.js --force`
    exec(cmd, { cwd: __dirname, env: { ...process.env, ANTHROPIC_API_KEY: apiKey } }, (err, _stdout, stderr) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      if (err) {
        res.end(JSON.stringify({ ok: false, error: stderr || err.message }))
      } else {
        res.end(JSON.stringify({ ok: true }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`\n✓ 宇宙便 管理画面が起動しました`)
  console.log(`  → http://localhost:${PORT}\n`)
  exec(`start http://localhost:${PORT}`)
})
