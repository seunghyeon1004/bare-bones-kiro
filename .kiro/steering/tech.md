---
inclusion: always
---

# Tech

- Node >= 22. TypeScript `strict: true`. ES modules (`"type": "module"`).
- The engine (`skeleton/engine`) has zero runtime dependencies. `package.json` has no `dependencies`, only `devDependencies`.

## Dev dependencies (exact versions, no `^` or `~`; checked with `npm view <name> version` on 2026-11-12)

| Package | Version |
| --- | --- |
| typescript | 6.0.3 (owner: 7.0.2 is the new native compiler; 6.0.3 is the last JavaScript release, chosen for tsx, vitest and esbuild compatibility) |
| tsx | 4.23.15 |
| esbuild | 0.28.2 |
| vitest | 5.1.0 |
| fast-check | 4.10.2 |
| @playwright/test | 1.65.0 |
| @axe-core/playwright | 4.14.0 |
| @modelcontextprotocol/sdk | 1.32.2 |
| zod | 4.6.7 |
| @types/node | 22.20.5 (owner, added for the shell-and-cli spec) |

No other package is added without the user's say-so.

## npm scripts (every spec uses these names)

| Script | Runs |
| --- | --- |
| `typecheck` | `tsc --noEmit` over all TypeScript |
| `test` | `vitest --run` over `test/**/*.test.ts`, which includes the properties |
| `test:props` | `vitest --run test/props` (fast-check properties only) |
| `test:e2e` | `playwright test` over `e2e/` (builds first) |
| `build` | `tsx skeleton/build/build.ts`: checks every table under `apps/`, then writes `dist/` |
| `mcp` | `tsx skeleton/mcp/server.ts`, the dev-only stdio MCP server |
| `bones` | `tsx skeleton/cli/bones.ts`, used as `npm run bones -- check <table.json>` and `-- new <name>` |

## Rules for Kiro

1. Never stage, commit or push. Leave git alone.
2. Never read `.env` or secret files (keys, tokens, credentials).
3. Never weaken a check, property, generator or tsconfig flag to get green. No `.skip`, `.only`, `@ts-ignore`, `as any`.
4. Never mock the subject under test.
5. Tick a task only after its `Verify:` command ran in this session and passed. Quote the result line (for example `Tests  12 passed (12)`).
6. If code, spec and steering disagree, stop and say where.
