const http = require('http')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const PORT = 3001
const POSTS_DIR = path.join(__dirname, 'posts')
const IMAGES_DIR = path.join(__dirname, 'public', 'images')
const CATEGORIES = ['ロケット', '衛星・通信', '有人宇宙飛行', '月探査', '火星探査']

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true })

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
            const contentTypeMatch = headerStr.match(/Content-Type:\s*(.+)/i)
            files[fieldName] = {
              filename: filenameMatch[1],
              contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
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

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk.toString())
    req.on('end', () => {
      const params = new URLSearchParams(body)
      const obj = {}
      params.forEach((v, k) => { obj[k] = v })
      resolve(obj)
    })
  })
}

function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

function getImagesList() {
  if (!fs.existsSync(IMAGES_DIR)) return []
  return fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .sort((a, b) => b.localeCompare(a))
}

function getPostsList() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && f !== 'test.md')
  return files.map(f => {
    const content = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8')
    const titleMatch = content.match(/title:\s*['"](.+?)['"]/)
    const dateMatch = content.match(/date:\s*['"](.+?)['"]/)
    const categoryMatch = content.match(/category:\s*['"](.+?)['"]/)
    return {
      file: f,
      title: titleMatch ? titleMatch[1] : f,
      date: dateMatch ? dateMatch[1] : '',
      category: categoryMatch ? categoryMatch[1] : '',
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

function saveImage(data, ext) {
  const safeName = Date.now() + ext
  fs.writeFileSync(path.join(IMAGES_DIR, safeName), data)
  return safeName
}

function renderHTML(message = '') {
  const posts = getPostsList()
  const images = getImagesList()
  const categoryOptions = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')
  const today = new Date().toISOString().slice(0, 10)

  const postRows = posts.map(p => `
    <tr>
      <td>${p.date}</td>
      <td>${p.category}</td>
      <td>${p.title}</td>
      <td><form method="POST" action="/delete" onsubmit="return confirm('削除しますか？')">
        <input type="hidden" name="file" value="${p.file}">
        <button type="submit" class="del-btn">削除</button>
      </form></td>
    </tr>
  `).join('')

  const imageGrid = images.length === 0
    ? '<p style="color:#aaa;font-size:13px;margin-top:8px;">画像がありません</p>'
    : `<div class="img-grid">${images.map(img => `
        <div class="img-item" onclick="selectImage('/images/${img}')" title="${img}">
          <img src="/img/${img}" alt="${img}">
          <span>${img}</span>
        </div>`).join('')}</div>`

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>宇宙便 管理画面</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; background: #f4f6fb; color: #111; }
    header { background: #1a2744; padding: 0 32px; height: 60px; display: flex; align-items: center; gap: 12px; }
    header .bar { width: 3px; height: 30px; background: #5a8fd4; }
    header h1 { color: #fff; font-size: 20px; letter-spacing: 0.15em; }
    header span { color: rgba(255,255,255,0.5); font-size: 12px; margin-left: 8px; }
    .publish-btn { margin-left: auto; padding: 8px 20px; background: #43a047; color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 0.05em; transition: background 0.15s; }
    .publish-btn:hover { background: #2e7d32; }
    .publish-btn:disabled { background: #aaa; cursor: not-allowed; }
    .container { max-width: 960px; margin: 36px auto; padding: 0 20px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 8px rgba(0,0,0,0.08); padding: 32px; margin-bottom: 32px; }
    .card h2 { font-size: 15px; font-weight: 700; color: #1a2744; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #1a2744; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-row.full { grid-template-columns: 1fr; }
    label { display: block; font-size: 12px; font-weight: 700; color: #555; margin-bottom: 6px; letter-spacing: 0.05em; }
    input[type=text], input[type=date], select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: inherit; outline: none; transition: border 0.15s; }
    input:focus, select:focus, textarea:focus { border-color: #1a2744; }
    textarea { resize: vertical; min-height: 280px; line-height: 1.7; }
    .submit-btn { display: block; width: 100%; padding: 14px; background: #1a2744; color: #fff; border: none; border-radius: 4px; font-size: 15px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; margin-top: 8px; transition: background 0.15s; }
    .submit-btn:hover { background: #2e4a7a; }
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
    .md-hint { background: #f8f9fc; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 16px; font-size: 12px; color: #666; line-height: 1.8; margin-top: 8px; }
    .md-hint code { background: #e8eaf0; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
    .upload-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
    .upload-row input[type=file] { flex: 1; padding: 8px; border: 1px dashed #aaa; border-radius: 4px; font-size: 13px; background: #fafafa; }
    /* ペーストゾーン */
    .paste-zone { border: 2px dashed #5a8fd4; border-radius: 8px; padding: 20px; text-align: center; color: #5a8fd4; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-bottom: 16px; }
    .paste-zone:hover, .paste-zone.drag-over { background: #eef4fc; }
    .paste-zone.uploading { color: #aaa; border-color: #aaa; }
    /* 画像グリッド */
    .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-top: 16px; }
    .img-item { border: 2px solid #e0e0e0; border-radius: 6px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
    .img-item:hover { border-color: #1a2744; }
    .img-item img { width: 100%; height: 90px; object-fit: cover; display: block; }
    .img-item span { display: block; font-size: 10px; color: #666; padding: 4px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #f8f8f8; }
    /* 本文エリアのペースト通知 */
    .textarea-wrap { position: relative; }
    .paste-hint { position: absolute; top: 8px; right: 10px; font-size: 10px; color: #aaa; pointer-events: none; }
  </style>
</head>
<body>
  <header>
    <div class="bar"></div>
    <h1>宇宙便</h1>
    <span>管理画面</span>
    <button class="publish-btn" id="publishBtn" onclick="publish()">🚀 公開する</button>
  </header>
  <div class="container">

    ${message}

    <!-- 画像管理 -->
    <div class="card">
      <h2>画像をアップロード</h2>

      <!-- ペーストゾーン（スクリーンショット貼り付け用） -->
      <div class="paste-zone" id="pasteZone">
        📋 スクリーンショットをCtrl+Vで貼り付け（サムネイル用）<br>
        <span style="font-size:11px;font-weight:400;color:#888;">本文に入れる場合は本文欄をクリックしてからCtrl+V ／ ドラッグ＆ドロップも可</span>
      </div>

      <!-- ファイル選択アップロード -->
      <form method="POST" action="/upload" enctype="multipart/form-data">
        <div class="upload-row">
          <input type="file" name="image" accept="image/*">
          <button type="submit" class="upload-btn">ファイルから追加</button>
        </div>
      </form>

      <p style="font-size:12px;color:#999;margin-bottom:4px;">
        ↓ 画像をクリック → 記事フォームのサムネイル欄に自動入力
      </p>
      <div id="imgGridContainer">${imageGrid}</div>
    </div>

    <!-- 記事作成フォーム -->
    <div class="card">
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
            <label>本文（Markdown）*　― 画像を貼り付けたい位置にカーソルを置いてCtrl+V</label>
            <div class="textarea-wrap">
              <textarea id="contentArea" name="content" required placeholder="## 見出し

本文を書く...

画像を本文に入れたい場合：カーソルをここに置いてCtrl+V"></textarea>
              <span class="paste-hint">Ctrl+V で画像挿入</span>
            </div>
            <div class="md-hint">
              <code>## 見出し</code> &nbsp;
              <code>**太字**</code> &nbsp;
              <code>- リスト</code> &nbsp;
              <code>> 引用</code>
            </div>
          </div>
        </div>
        <button type="submit" class="submit-btn">記事を作成する</button>
      </form>
    </div>

    <!-- 記事一覧 -->
    <div class="card">
      <h2>記事一覧</h2>
      ${posts.length === 0 ? '<p style="color:#aaa;font-size:13px;">記事がありません</p>' : `
      <table>
        <thead><tr><th>日付</th><th>カテゴリ</th><th>タイトル</th><th></th></tr></thead>
        <tbody>${postRows}</tbody>
      </table>`}
    </div>

  </div>

  <script>
    // 画像を選んでサムネイル欄に入力
    function selectImage(imgPath) {
      const input = document.getElementById('imageInput')
      input.value = imgPath
      input.style.borderColor = '#43a047'
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // 画像をサーバーにアップロードしてパスを返す
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

    // 画像グリッドに新しい画像を追加
    function addImageToGrid(imgPath) {
      const filename = imgPath.split('/').pop()
      const grid = document.querySelector('.img-grid')
      if (!grid) {
        // グリッドがない場合は作成
        const container = document.getElementById('imgGridContainer')
        container.innerHTML = '<div class="img-grid"></div>'
      }
      const item = document.createElement('div')
      item.className = 'img-item'
      item.title = filename
      item.onclick = () => selectImage(imgPath)
      item.innerHTML = '<img src="/img/' + filename + '" alt="' + filename + '"><span>' + filename + '</span>'
      const g = document.querySelector('.img-grid')
      if (g) g.insertBefore(item, g.firstChild)
    }

    const pasteZone = document.getElementById('pasteZone')

    // ドラッグ＆ドロップ対応
    pasteZone.addEventListener('dragover', (e) => { e.preventDefault(); pasteZone.classList.add('drag-over') })
    pasteZone.addEventListener('dragleave', () => pasteZone.classList.remove('drag-over'))
    pasteZone.addEventListener('drop', async (e) => {
      e.preventDefault()
      pasteZone.classList.remove('drag-over')
      const file = e.dataTransfer.files[0]
      if (!file || !file.type.startsWith('image/')) return
      await handleImageUpload(file, 'thumbnail')
    })

    // ページ全体のペーストを監視
    document.addEventListener('paste', async (e) => {
      const items = e.clipboardData ? Array.from(e.clipboardData.items) : []
      const imageItem = items.find(i => i.type.startsWith('image/'))
      if (!imageItem) return  // 画像がなければ何もしない（テキスト貼り付けは通常通り）

      const activeEl = document.activeElement
      const isInContent = activeEl && activeEl.id === 'contentArea'

      if (isInContent) {
        // 本文エリアにフォーカスがある → 本文に画像を挿入
        e.preventDefault()
        const contentArea = document.getElementById('contentArea')
        const pos = contentArea.selectionStart
        const before = contentArea.value.slice(0, pos)
        const after = contentArea.value.slice(contentArea.selectionEnd)
        const placeholder = '\n![アップロード中...](uploading)\n'
        contentArea.value = before + placeholder + after

        pasteZone.innerHTML = '⏳ 本文に画像を挿入中...'
        pasteZone.classList.add('uploading')
        try {
          const blob = imageItem.getAsFile()
          const imgPath = await uploadBlob(blob)
          contentArea.value = contentArea.value.replace('\n![アップロード中...](uploading)\n', '\n![画像](' + imgPath + ')\n')
          addImageToGrid(imgPath)
          pasteZone.innerHTML = '✓ 本文に画像を挿入しました<br><span style="font-size:11px;font-weight:400;color:#2e7d32;">次の貼り付けを待機中...</span>'
          pasteZone.style.borderColor = '#43a047'
          pasteZone.style.color = '#2e7d32'
          setTimeout(() => resetPasteZone(), 3000)
        } catch (err) {
          contentArea.value = contentArea.value.replace('\n![アップロード中...](uploading)\n', '')
          pasteZone.innerHTML = 'エラー：' + err.message
          pasteZone.classList.remove('uploading')
        }
      } else {
        // それ以外 → サムネイルとして使用
        e.preventDefault()
        await handleImageUpload(imageItem.getAsFile(), 'thumbnail')
      }
    })

    async function handleImageUpload(blob, target) {
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
      } catch(e) {
        alert('通信エラー: ' + e.message)
        btn.disabled = false
        btn.textContent = '🚀 公開する'
      }
    }

    function resetPasteZone() {
      pasteZone.innerHTML = '📋 スクリーンショットをCtrl+Vで貼り付け（サムネイル用）<br><span style="font-size:11px;font-weight:400;color:#888;">本文に入れる場合は本文欄をクリックしてからCtrl+V ／ ドラッグ＆ドロップも可</span>'
      pasteZone.style.borderColor = ''
      pasteZone.style.color = ''
    }
  </script>
</body>
</html>`
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderHTML())
    return
  }

  // 画像配信
  if (req.method === 'GET' && req.url.startsWith('/img/')) {
    const filename = path.basename(decodeURIComponent(req.url.replace('/img/', '')))
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

  // クリップボード/ドロップからのアップロード（JSON レスポンス）
  if (req.method === 'POST' && req.url.startsWith('/upload-paste')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost')
      const ext = urlObj.searchParams.get('ext') || '.png'
      const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      if (!allowed.includes(ext)) throw new Error('対応外の形式')
      const data = await readRawBody(req)
      const safeName = saveImage(data, ext)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ path: '/images/' + safeName }))
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  // ファイル選択からのアップロード（ページリロード）
  if (req.method === 'POST' && req.url === '/upload') {
    try {
      const { files } = await parseMultipart(req)
      const file = files['image']
      if (!file || !file.filename) throw new Error('ファイルが選択されていません')
      const ext = path.extname(file.filename).toLowerCase()
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) throw new Error('対応形式：JPG / PNG / GIF / WebP')
      const safeName = saveImage(file.data, ext)
      const msg = `<div class="message success">✓ 画像をアップロードしました → <code>/images/${safeName}</code></div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderHTML(msg))
    } catch (e) {
      const msg = `<div class="message error">エラー：${e.message}</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderHTML(msg))
    }
    return
  }

  // 記事作成
  if (req.method === 'POST' && req.url === '/create') {
    const data = await parseBody(req)
    try {
      const { title, category, date, image, description, content } = data
      if (!title || !category || !date || !content) throw new Error('必須項目が未入力です')
      const slug = generateSlug(title)
      const filePath = path.join(POSTS_DIR, `${slug}.md`)
      const imageField = image ? `\nimage: '${image}'` : ''
      const descField = description ? `\ndescription: '${description.replace(/'/g, "\\'")}'\n` : '\n'
      const frontmatter = `---\ntitle: '${title.replace(/'/g, "\\'")}'\n${descField}date: '${date}'\ncategory: '${category}'${imageField}\n---\n\n`
      fs.writeFileSync(filePath, frontmatter + content.replace(/\r\n/g, '\n'), 'utf-8')
      const msg = `<div class="message success">✓ 記事「${title}」を作成しました（${slug}.md）</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderHTML(msg))
    } catch (e) {
      const msg = `<div class="message error">エラー：${e.message}</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderHTML(msg))
    }
    return
  }

  // 記事削除
  if (req.method === 'POST' && req.url === '/delete') {
    const data = await parseBody(req)
    try {
      const filePath = path.join(POSTS_DIR, data.file)
      if (!filePath.startsWith(POSTS_DIR)) throw new Error('不正なリクエスト')
      fs.unlinkSync(filePath)
      const msg = `<div class="message success">✓ 記事を削除しました</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderHTML(msg))
    } catch (e) {
      const msg = `<div class="message error">エラー：${e.message}</div>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(renderHTML(msg))
    }
    return
  }

  // 公開（git add → commit → push）
  if (req.method === 'POST' && req.url === '/publish') {
    const date = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const cmd = `git add posts/ public/images/ && git commit -m "記事更新 ${date}" && git push`
    exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      if (err) {
        const msg = stderr || err.message
        if (msg.includes('nothing to commit')) {
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

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`\n✓ 宇宙便 管理画面が起動しました`)
  console.log(`  → http://localhost:${PORT}\n`)
  exec(`start http://localhost:${PORT}`)
})
