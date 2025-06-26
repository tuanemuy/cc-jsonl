# Claude Code Watcher

Claude Code のログファイルを処理し、プロダクションサーバーを管理するための統合CLIツールです。

## 主な機能

- 🚀 **プロダクションサーバー管理** - Next.jsアプリケーションを本番環境で実行
- 📊 **ログファイル処理** - Claude Codeのセッションログを効率的に処理
- ⚡ **柔軟な実行モード** - 1回のみ実行（batch）または定期的な監視（watch）
- 📖 **わかりやすいヘルプ** - すべてのコマンドで詳細なヘルプを表示
- 🎯 **簡単インストール** - `npm install` だけですぐに使用開始

## クイックスタート

```bash
# 1. インストール（CLIが自動でビルドされます）
npm install

# 2. プロダクションサーバーを起動
npm run start:prod

# 3. ログファイルを1回だけ処理
npm run logs:batch -- /path/to/claude-logs

# 4. ログファイルを定期的に監視・処理
npm run logs:watch -- /path/to/claude-logs
```

## インストール

### 必要な環境
- Node.js 22.x 以上
- npm または pnpm

### セットアップ
```bash
# プロジェクトをクローンしてインストール
git clone <repository-url>
cd claude-code-web
npm install  # CLIが自動的にビルドされます

# インストール確認
npm run cli -- --version
```

## 使用方法

### プロダクションサーバーの起動

Webアプリケーションを本番環境で実行：

```bash
# デフォルトポート（3000）で起動
npm run start:prod

# カスタムポートで起動
npm run start:prod -- --port 8080
npm run start:prod -- -p 3001
```

### ログファイル処理

#### 1回のみ実行（Batch）
溜まったログファイルを一度だけ処理して終了 - 過去ログの整理に最適：

```bash
# 基本的な使用方法
npm run logs:batch -- /path/to/claude-logs

# オプション付きで実行
npm run logs:batch -- -c 10 -p "*.jsonl" /path/to/claude-logs

# 処理済みファイルもすべて再処理
npm run logs:batch -- --no-skipExisting /path/to/claude-logs

# 特定パターンのファイルのみ処理
npm run logs:batch -- --pattern "session-*.jsonl" /path/to/claude-logs
```

#### 定期監視（Watch）
ディレクトリを定期的に監視して新しいファイルを自動処理 - リアルタイム処理に最適：

```bash
# 基本的な使用方法 - 60分ごとにチェック（デフォルト）
npm run logs:watch -- /path/to/claude-logs

# 30分ごとにチェック
npm run logs:watch -- -i 30 /path/to/claude-logs

# 高頻度処理設定 - 5分ごとに20並列で処理
npm run logs:watch -- -c 20 -i 5 /path/to/claude-logs

# 特定パターンで15分ごとに監視
npm run logs:watch -- -p "**/*.jsonl" -i 15 /path/to/claude-logs
```

## コマンドリファレンス

### 利用可能なコマンド

| コマンド | 説明 | 使用方法 |
|---------|-------------|-------|
| `start` | プロダクションサーバーを起動 | `npm run start:prod -- [オプション]` |
| `batch` | ログファイルを1回処理して終了 | `npm run logs:batch -- [オプション] [ディレクトリ]` |
| `watch` | ログファイルを定期的に処理 | `npm run logs:watch -- [オプション] [ディレクトリ]` |

### 共通オプション

| オプション | 短縮 | 説明 | デフォルト |
|--------|-------|-------------|---------|
| `--help` | `-h` | ヘルプメッセージを表示 | - |
| `--version` | `-v` | バージョンを表示 | - |

### プロダクションサーバーオプション

| オプション | 短縮 | 説明 | デフォルト |
|--------|-------|-------------|---------|
| `--port` | `-p` | サーバーポート | 3000 |

### ログ処理オプション

| オプション | 短縮 | 説明 | デフォルト |
|--------|-------|-------------|---------|
| `--targetDirectory` | - | 処理対象ディレクトリ | WATCH_TARGET_DIR環境変数 |
| `--maxConcurrency` | `-c` | 最大並列処理数 | 5 |
| `--skipExisting` | `-s` | 処理済みファイルをスキップ | true |
| `--pattern` | `-p` | ファイルパターン | `**/*.jsonl` |
| `--interval` | `-i` | 処理間隔（watchのみ、分） | 60 |

## 設定

### 環境変数

```bash
# ログ処理のデフォルトディレクトリを設定
export WATCH_TARGET_DIR=/path/to/claude-logs

# 環境変数を使用（ディレクトリを指定しない場合）
npm run logs:batch  # WATCH_TARGET_DIRを使用

# 環境変数を上書き
npm run logs:batch -- /custom/path
```

### .envファイルでの設定
プロジェクトルートに `.env` ファイルを作成：

```env
WATCH_TARGET_DIR=/home/user/claude-code-logs
```

## 実用的な使用例

### 本番サーバーの運用
```bash
# インストールと本番サーバー起動
npm install
npm run start:prod -- --port 8080
```

### ログ処理の運用パターン

#### 過去ログの一括処理
```bash
# 大量に溜まった過去ログを一括で処理
npm run logs:batch -- -c 15 --no-skipExisting /archive/claude-logs
```

#### リアルタイム監視
```bash
# アクティブなログディレクトリを10分ごとに監視
npm run logs:watch -- -i 10 -c 8 /active/claude-logs
```

#### 特定ファイルの処理
```bash
# 2024年のセッションファイルのみ処理
npm run logs:batch -- -p "session-2024-*.jsonl" /logs/2024
```

#### 高性能処理
```bash
# 大量データの最大効率処理
npm run logs:batch -- -c 20 --pattern "*.jsonl" /massive-logs
```

## パフォーマンス調整

### 並列処理数の設定
- **低並列（1-5）**: リソースが限られている場合やネットワーク制約がある場合
- **中並列（5-10）**: 一般的な用途でバランスの取れた性能
- **高並列（10-20）**: 高性能システムでの最大スループット

### ファイルパターンの使い分け
- `**/*.jsonl`: すべての.jsonlファイルを再帰的に検索（デフォルト）
- `*.jsonl`: 対象ディレクトリ内のファイルのみ
- `session-*.jsonl`: セッションファイルのみ
- `{chat,session}-*.jsonl`: 複数パターンの指定

### 監視間隔の目安
- **1-5分**: アクティブなシステムでのリアルタイム処理
- **15-30分**: 中程度の活動量での定期監視
- **60分以上**: 低活動量での定期処理

## よくある問題と解決方法

### インストール後にCLIが見つからない

```bash
# CLIを手動で再ビルド
npm run build:watcher

# ビルド確認
ls -la dist/cli.mjs
```

### 権限エラーが発生する

```bash
# ファイル権限を確認
ls -la dist/cli.mjs

# 必要に応じて実行権限を付与
chmod +x dist/cli.mjs
```

### ログ処理でエラーが発生する

```bash
# ディレクトリの存在と読み取り権限を確認
ls -la /path/to/claude-logs

# ファイルパターンが正しいか確認
npm run cli -- batch --help
```

### プロダクションサーバーが起動しない

```bash
# ポートが使用可能か確認
lsof -i :3000

# 別のポートを使用
npm run start:prod -- --port 3001
```

### ヘルプとデバッグ情報

```bash
# CLIのバージョンと利用可能なコマンドを表示
npm run cli -- --help

# 個別コマンドのヘルプを表示
npm run cli -- batch --help
npm run cli -- watch --help
npm run cli -- start --help
```

## よく使うコマンドパターン

### 初回セットアップ
```bash
npm install                           # インストール
npm run cli -- --version            # 動作確認
```

### 日常的な運用
```bash
npm run start:prod                   # サーバー起動（ポート3000）
npm run logs:batch -- ~/claude-logs # 今日のログを処理
npm run logs:watch -- ~/claude-logs # 継続監視開始
```

### トラブル時の確認
```bash
npm run cli -- --help              # 全コマンド確認
npm run build:watcher               # CLI再ビルド
npm run cli -- batch --help        # batch詳細ヘルプ
```

## サポート

問題が解決しない場合や追加の機能が必要な場合は、プロジェクトのドキュメントを参照してください。

詳細な開発向け情報については、[CLAUDE.md](./CLAUDE.md) をご覧ください。
