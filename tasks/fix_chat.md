# チャットUIを改善する

## 背景

- `CLAUDE.md` にガイダンスを記載した
- `docs/requirements.md` に要件を定義した
- `docs/schema.json` に想定されるチャットログのスキーマを記載した
- `samples/` にチャットログのサンプルデータを作成した
- `src/components/chat/ChatInterface.tsx` にチャットインターフェースのコンポーネントを実装した
- `src/components/chat/MessageContent.tsx` にメッセージの内容を表示するコンポーネントを実装した

## タスク

- すべてのToolに対応する
- メッセージの表示方法をより良くする
    - ToolUseのBashなら、例えば `command` まで表示し、 `input` 全体を `<details>` に入れる
    - ToolUseのReadなら、例えば `path` まで表示し、 `input` 全体を `<details>` に入れる
    - その他も仕様に合わせて工夫する
