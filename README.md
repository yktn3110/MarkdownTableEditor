# TableDraft

Markdownドキュメント内のテーブル編集に特化した、ローカル完結型の軽量エディタ。

![license](https://img.shields.io/badge/license-MIT-blue)
![platform](https://img.shields.io/badge/platform-Windows-0078d4?logo=windows)

---

## コンセプト

設計書や仕様書（Markdown）をメンテナンスする際、最もストレスがかかるのは「テーブルの編集」です。  
TableDraftは、ドキュメント全体をテキストとして扱うのではなく、**テーブルを見つけ出してスプレッドシートのように編集する**ことに特化することで、ドキュメント作成の生産性を最大化します。

- **Local-First & Private** — データを外部サーバーに送信しません
- **Table-Centric UI** — Markdown内のテーブルを自動認識し、Excel的な操作感で編集
- **Zero Friction** — ファイルを開いて即編集。余計な機能は持たない

---

## 機能

- **テーブル自動検出** — ファイルを開くと全テーブルを抽出し、左サイドバーに一覧表示
- **スプレッドシートUI** — react-data-grid ベースのセル編集
- **非破壊編集** — テーブル以外のテキストはそのまま保持し、テーブル部分だけを書き戻す
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Y`（テーブル単位でスナップショット、最大50件）
- **保存** — `Ctrl+S` で手動保存。自動保存トグルあり（変更から1秒後に保存）

### キーボード操作

| キー | 動作 |
|---|---|
| `Enter` | 確定 → 下のセルへ移動 |
| `Shift+Enter` | 確定 → 上のセルへ移動 |
| `Tab` | 確定 → 右のセルへ移動（行末で次行先頭へ折り返し） |
| `Shift+Tab` | 確定 → 左のセルへ移動（行頭で前行末尾へ折り返し） |
| `Alt+Enter` | セル内改行（Markdownには `<br>` として出力） |
| `Escape` | 編集キャンセル（変更を破棄） |
| `Alt+↑` / `Alt+↓` | 選択行を上下に移動 |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `F2` | セル編集開始 |
| `Ctrl+S` | 保存 |

---

## 動作環境

**Windows のみ**（ファイルダイアログに Windows Forms / PowerShell を使用）

---

## 使い方

1. [Releases](../../releases) から最新の `TableDraft.exe` をダウンロード
2. `TableDraft.exe` を実行するとブラウザが自動で開きます
3. 「ファイルを開く」から `.md` ファイルを選択して編集開始

---

## 開発者向け

```bash
npm install
npm start
```

ブラウザで http://localhost:5173 を開いてください。

### exe のビルド

```bash
npm run build:sea
```

---

## 技術スタック

| 役割 | ライブラリ |
|---|---|
| UI | React 19 + TypeScript + Tailwind CSS 4 |
| テーブルグリッド | react-data-grid |
| 状態管理 | Zustand |
| Markdownパース | unified + remark-parse + remark-gfm |
| バックエンド | Node.js + Express |
| ビルド | Vite |
| テスト | Vitest |

---

## ライセンス

[MIT](LICENSE)
