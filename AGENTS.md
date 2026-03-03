# AGENTS.md

## Cursor Cloud specific instructions

Excalidraw is a Yarn workspaces monorepo (Yarn Classic 1.22.22, Node >= 18). The main dev commands are documented in `CLAUDE.md` and the root `package.json` scripts.

### Services

| Service | Command | URL | Notes |
|---|---|---|---|
| Vite dev server (excalidraw-app) | `yarn start` | `http://localhost:3001` | Only required local service |

All external services (Firebase, JSON backend, collaboration WebSocket) use hosted dev instances configured in `.env.development`. No local databases or Docker containers are needed.

### Non-obvious caveats

- The pre-commit hook in `.husky/pre-commit` has `yarn lint-staged` **commented out**, so no pre-commit checks run automatically. Run `yarn fix` and `yarn test:typecheck` manually before committing.
- `yarn test:app` runs vitest in watch mode by default; use `yarn test:app --watch=false` for CI-style runs.
- The Firebase config warning `Error JSON parsing firebase config` in test output is expected and harmless (tests don't use Firebase).
- ESLint emits a benign MetaProperty warning from `jsx-ast-utils`; it does not indicate a real issue.
