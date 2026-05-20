# TableDraft (仮)

Markdownドキュメント内の「テーブル編集」に特化した、ローカル完結型の軽量エディタ。

## コンセプト

設計書や仕様書（Markdown）をメンテナンスする際、最もストレスがかかるのは「テーブルの編集」です。
TableDraftは、ドキュメント全体をテキストとして扱うのではなく、**「テーブルを見つけ出し、スプレッドシートのように編集する」**ことに特化することで、ドキュメント作成の生産性を最大化します。

### 3つの柱
1. **Local-First & Private**: データを外部サーバーに送信しません。機密性の高い設計書も安心してローカルで編集できます。
2. **Table-Centric UI**: Markdown内のテーブルを自動認識し、ExcelやGoogleスプレッドシートのような操作感で編集できます。
3. **Zero Friction**: ファイルを指定して即編集。余計なプロジェクト管理機能は持たず、単一ファイルの編集に集中します。

## 主な機能

- **テーブル自動検出**: Markdownファイルを開くと、含まれているテーブルを抽出し、左サイドバーに一覧表示。クリックで切り替え。
- **スプレッドシートUI**: Excel/Googleスプレッドシートと同等のキーボード操作でセルを編集。
    - `Enter` / `Shift+Enter` / `Tab` / `Shift+Tab` でセル間を移動
    - `Alt+Enter` でセル内改行
    - `Alt+↑` / `Alt+↓` で行を上下に移動
    - 複数行選択・切り取り・貼り付け対応
    - 右クリックメニューから行の挿入・削除
- **非破壊編集**: テーブル以外のテキスト部分はそのまま保持し、テーブル部分だけをMarkdown記法で書き戻します。
- **安全な保存**: `Ctrl+S` で保存。自動保存も設定で有効化可能。外部ツールとの競合を検知した場合は `.bak` ファイルを自動出力。

## 技術スタック

- **Core**: Tauri
- **Frontend**: React + TypeScript + Tailwind CSS
- **Grid Engine**: TanStack Table または Handsontable

## 使い方（イメージ）

1. アプリを起動する
2. 編集したい `.md` ファイルを開く
3. 左サイドバーから編集したいテーブルを選択
4. スプレッドシートのように直感的に編集
5. `Ctrl+S` で元のファイルに保存

## ドキュメント

- [UX設計書](docs/UX_DESIGN.md)

## 開発環境

- VS Code + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
