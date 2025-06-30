# 型を改善する

## 背景

- `CLAUDE.md` にガイダンスを記載した
- `docs/requirements.md` に要件を定義した
- `src/core/domain/claude/types.ts` にclaudeドメインの型や型ガードを整備した
    - `SDKMessage` : メッセージ送信時に返されるメッセージ
    - `AssistantContent` `UserContent` : `SDKMessage` とログファイルに含まれ、メッセージリポジトリに保存される `content` の型
- `src/core/domain/claude/ports/claudeService.ts` に `content` をパースする関数を追加した

## タスク

- 型を活用して、バックエンドのリファクタリングを行う
- 型を活用して、フロントエンドのリファクタリングを行う
