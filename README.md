# 宇宙便

打ち上げ情報を自動で取得し、打ち上げ情報を確認できます。また、結果について記事を作成し自動で投稿します。

## 技術スタック

- Next.js 14
- React 18
- Tailwind CSS
- Markdown

## セットアップ

```bash
npm install
npm run dev
```

## 記事を追加する

`posts/` フォルダに `.md` ファイルを追加してください。

```markdown
---
title: 'Starship 打ち上げ成功'
description: 'SpaceX Starship の最新打ち上げ情報'
date: '2026-03-26'
---

ここに記事の内容を書きます。
```

## デプロイ

GitHub に push すると、GitHub Actions が自動的にビルドして GitHub Pages に公開します。
