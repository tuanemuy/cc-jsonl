# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documents

- `docs/requirements.md`: Document requirements and specifications
- `docs/progress.md`: Document current progress, issues, and next steps

## Development Commands

### Unified CLI (Recommended)
Use the unified `claude-code-watcher` CLI for production and log processing:

**Production Server:**
- `node dist/cli.mjs start [--port 3000]` - Start production server

**Log Processing:**
- `node dist/cli.mjs batch [options] [directory]` - Process log files once
- `node dist/cli.mjs watch [options] [directory]` - Process log files periodically

**Build CLI:**
- `pnpm run build:watcher` - Build CLI tools (required before first use)

### Legacy npm Commands
- `pnpm lint` - Lint code with Biome
- `pnpm lint:fix` - Lint code with Biome and fix issues
- `pnpm format` - Format code with Biome
- `pnpm typecheck` - Type check code with tsc
- `pnpm test` - Run tests with Vitest

## Development Workflow

**Unified CLI Workflow (Recommended):**
1. Build CLI: `pnpm run build:watcher`
2. Start production: `node dist/cli.mjs start [--port 3000]`
3. Process logs: `node dist/cli.mjs batch` / `node dist/cli.mjs watch`

**Code Quality:**
- Run `pnpm typecheck`, `pnpm run lint:fix` and `pnpm run format` after making changes to ensure code quality and consistency.
- Update `docs/progress.md` with current progress and any issues encountered.

## Backend Architecture

Hexagonal architecture with domain-driven design principles:

- **Domain Layer** (`src/core/domain/`): Contains business logic, types, and port interfaces
    - `src/core/domain/${domain}/types.ts`: Domain entities, value objects, and DTOs
    - `src/core/domain/${domain}/ports/**.ts`: Port interfaces for external services (repositories, exteranl APIs, etc.)
- **Adapter Layer** (`src/core/adapters/`): Contains concrete implementations for external services
    - `src/core/adapters/${externalService}/**.ts`: Adapters for external services like databases, APIs, etc.
- **Application Layer** (`src/core/application/`): Contains use cases and application services
    - `src/core/application/context.ts`: Context type for dependency injection
    - `src/core/application/${domain}/${usecase}.ts`: Application services that orchestrate domain logic. Each service is a function that takes a context object.

### Types example

```typescript
// src/core/domain/post/types.ts

import { z } from "zod/v4";
import { paginationSchema } from "@/lib/pagination.ts";

export const postIdSchema = z.uuid().brand("postId");
export type PostId = z.infer<typeof postIdSchema>;

export const postSchema = z.object({
  id: postIdSchema,
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Post = z.infer<typeof postSchema>;

// ...

export const listPostQuerySchema = z.object({
  pagination: paginationSchema,
  filter: z
    .object({
      text: z.string().optional(),
    })
    .optional(),
});
export type ListPostQuery = z.infer<typeof listPostQuerySchema>;
```

### Ports example

```typescript
// src/core/domain/post/ports/postRepository.ts

export interface PostRepository {
  create(post: CreatePostParams): Promise<Result<Post, RepositoryError>>;
  list(query: ListPostQuery): Promise<Result<Post, RepositoryError>>;
  // Other repository methods...
}
```

```typescript
// src/core/domain/file/ports/storageManager.ts

export interface StorageManager {
  uploadFile(file: UploadFileParams): Promise<Result<File, StorageError>>;
  // Other session management methods...
}
```

### Adapters example

```typescript
// src/core/adapters/drizzleSqlite/postRepository.ts

import type { Result } from "neverthrow";
import type { PostRepository } from "@/domain/post/ports/postRepository";
import { type CreatePostParams, type ListPostQuery, type Post, postSchema, } from "@/domain/post/types";
import type { Database } from "./database";

export class DrizzleSqlitePostRepository implements PostRepository {
  constructor(private readonly db: Database) {}

  async create(params: CreatePostParams): Promise<Result<Post, RepositoryError>> {
    try {
      const result = await this.db
        .insert(posts)
        .values(params)
        .returning();

      const post = result[0];
      if (!post) {
        return err(new RepositoryError("Failed to create task"));
      }

      return validate(postSchema, post).mapErr((error) => {
        return new RepositoryError("Invalid post data", error);
      });
    } catch (error) {
      return err(new RepositoryError("Failed to create task", error));
    }
  }

  async list(query: ListPostQuery): Promise<Result<{ items: Post[], count: number }, RepositoryError>> {
    const { pagination, filter } = query;
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * pagination.limit;

    const filters = [
      filter?.text ? like(posts.text, `%${filter.text}%`) : undefined,
    ].filter((filter) => filter !== undefined);

    try {
      const [items, countResult] = await Promise.all([
        this.db
          .select()
          .from(posts)
          .where(and(...filters))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql`count(*)` })
          .from(posts)
          .where(and(...filters)),
      ]);

      return {
        items: items
          .map((item) => validate(postSchema, item).unwrapOr(null))
          .filter((item) => item !== null),
        count: Number(countResult[0].count),
      };
    } catch (error) {
      return err(new RepositoryError("Failed to list posts", error));
    }
  }
}
```

### Database schema example

```typescript
// src/core/adapters/drizzleSqlite/schema.ts

import { v7 as uuidv7 } from "uuid";

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    // Other fields...
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`).$onUpdate(() => new Date()),
  },
);
```

### Application Service example

```typescript
// src/core/application/post/createPost.ts

import { z } from "zod/v4";
import { Result } from "neverthrow";
import type { PostRepository } from "@/domain/post/ports/postRepository";
import type { Context } from "../context";

export const createPostInputSchema = z.object({
  content: z.string().min(1).max(500),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export async function createPost(
  context: Context,
  input: CreatePostInput
): Promise<Result<Post, RepositoryError>> {
  return context.postRepository.create({
    content: input.content
  }).mapErr((error) => {
    return new ApplicationError("Failed to create post", error);
  });
}
```

## Context object example

```typescript
// Context object for specific environment
// ex: src/context.ts

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  // Other environment variables...
});

export type Env = z.infer<typeof envSchema>;

const env = envSchema.safeParse(process.env);
if (!env.success) {
  throw new Error(/* Zod errors */);
}

const db = getDatabase(env.data.DATABASE_URL, env.data.DATABASE_AUTH_TOKEN);

export const context = {
  userRepository: new DrizzleSqliteUserRepository(db),
  storageManager: new S3StorageManager(/* ...args */),
  // Ohter adapters...
};
```

## Frontend Architecture

Next.js 15.2.1 application code using:

- App Router
- React 19
- Tailwind CSS v4
- shadcn/ui

- UI Components
    - `src/app/components/ui/`: Reusable UI components using shadcn/ui
    - `src/app/components/${domain}/`: Domain-specific components
    - `src/app/components/**/*`: Other reusable components
- Pages and Routes
    - Follows Next.js App Router conventions
- Styles
    - `src/app/styles/index.css`: Entry point for global styles
- Server Actions
    - `src/actions/${domain}.ts`: Server actions for handling application services

### Server Actions example

```typescript
// src/actions/post.ts
import { createPost } from "@/core/application/post/createPost";
import { context } from "@/context";
import { z } from "zod/v4";

export const createPostActionSchema = z.object({
  content: z.string().min(1).max(500),
});
export type CreatePostActionParams = z.infer<typeof createPostActionSchema>;
export async function createPostAction(params: CreatePostActionParams) {
  //
}
```

## Tech Stack

- **Runtime**: Node.js 22.x
- **Frontend**: Next.js 15 with React 19, Tailwind CSS, shadcn/ui
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod 4 schemas with branded types
- **Error Handling**: neverthrow for Result types

## Error Handling

- All backend functions return `Result<T, E>` or `Promise<Result<T, E>>` types using `neverthrow`
- Each modules has its own error types, e.g. `RepositoryError`, `ApplicationError`. Error types should extend a base `AnyError` class (`src/lib/errors.ts`)

## Testing

- Create tests that validate formal method models
- Use `pnpm test` for tests
- Use `src/core/adapters/mock/${adapter}.ts` to create mock implementations of external services for testing

### Application Service Tests

- Use `src/core/application/${domain}/${usecase}.test.ts` for unit tests of application services
