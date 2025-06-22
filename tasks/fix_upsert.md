# upsert処理を改善する

## 背景

- `CLAUDE.md` にガイダンスを記載した
- `src/core/adapters/` ディレクトリに、複数のリポジトリアダプターが存在する
- Drizzleには `onConflictDoUpdate` メソッドが存在する

## タスク

- 同じログファイルを重複して処理する場合があるため、 `create` メソッドで `onConflictDoUpdate` を使用してupsert処理を行う
- `upsert` メソッドは不要になるので、削除する
