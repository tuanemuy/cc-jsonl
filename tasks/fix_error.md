# エラーの修正

## タスク

- エラーを修正する

## エラー

```
[listProjects] Repository operation failed {
  error: 'Failed to list projects',
  cause: Error [RepositoryError]: Failed to list projects
      at DrizzlePgliteProjectRepository.list (src/core/adapters/drizzlePglite/projectRepository.ts:170:17)
      at async listProjects (src/core/application/project/listProjects.ts:36:17)
      at async listProjectsAction (src/actions/project.ts:68:17)
      at async Home (src/app/page.tsx:5:17)
    168 |       });
    169 |     } catch (error) {
  > 170 |       return err(new RepositoryError("Failed to list projects", error));
        |                 ^
    171 |     }
    172 |   }
    173 | } {
    [cause]: Error: Failed query: select "id", "name", "path", "created_at", "updated_at" from "projects" limit $1
    params: 100
        at async DrizzlePgliteProjectRepository.list (src/core/adapters/drizzlePglite/projectRepository.ts:144:35)
        at async listProjects (src/core/application/project/listProjects.ts:36:17)
        at async listProjectsAction (src/actions/project.ts:68:17)
        at async Home (src/app/page.tsx:5:17)
      142 |       }
      143 |
    > 144 |       const [items, countResult] = await Promise.all([
          |                                   ^
      145 |         whereClause
      146 |           ? this.db
      147 |               .select() {
      query: 'select "id", "name", "path", "created_at", "updated_at" from "projects" limit $1',
      params: [ 100 ],
      [cause]: [TypeError: The "path" argument must be of type string or an instance of Buffer or URL. Received an instance of URL] {
        code: 'ERR_INVALID_ARG_TYPE'
      }
    }
  }
}
```
