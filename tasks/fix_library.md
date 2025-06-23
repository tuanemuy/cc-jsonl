# Claude Codeのライブラリを変更する

## 背景

- `CLAUDE.md` にガイダンスを記載した
- `docs/requirements.md` に要件を定義した
- メッセージの送信に誤ったClaude CodeのSDKが使用されている

## タスク

- `@anthropic-ai/sdk` を `@anthropic-ai/claude-code` に変更する

## 条件

- 使用方法 <https://docs.anthropic.com/ja/docs/claude-code/sdk#typescript>
- 必ずセッションモデルの `cwd` を指定してメッセージを送信する
- 既存のセッションに送信する場合はセッションIDを指定する

## セッションIDとcwdの指定方法

```ts
query({
  ...params,
  options: {
    resume: `${sessionId}`,
    cwd: `${cwd}`
  }
});
```
