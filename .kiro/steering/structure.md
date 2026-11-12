---
inclusion: always
---

# Structure

```
skeleton/engine/    validate, check, decide. Pure TypeScript. Imports nothing.
skeleton/shell/     page shell: renders any valid table + copy.json + theme.css
skeleton/build/     build script: check all tables, write dist/
skeleton/cli/       bones check, bones new
skeleton/mcp/       stdio MCP server (dev only): check_table, evaluate
skeleton/template/  tiny valid app (2 questions) copied by `bones new`
skeleton/examples/  deliberately broken tables for demos and tests
apps/<name>/        table.json, copy.json, theme.css only
test/               vitest unit tests; test/props/ holds fast-check properties
e2e/                Playwright + axe tests, both apps
scripts/            repo scripts (Kiro helpers); not part of the product
docs/               brief, sources, evidence
```

## Dependency direction

- `engine` imports nothing (no Node built-ins, no packages, no other skeleton folder).
- `shell`, `build`, `cli`, `mcp` import `engine`. They do not import each other, with one exception: `build` may `import type` the `Copy` type from `shell` (owner decision, shell-and-cli spec).
- `apps/` contains no code. `test/` and `e2e/` may import anything.
- `examples/` tables are never built into `dist/`.

## Naming

- Files and folders: lower-case kebab-case. Types: PascalCase. Functions and variables: camelCase.
- Table, condition, value, outcome, rule and source ids: lower-case kebab-case.
- Tests: `test/<area>.test.ts`; properties: `test/props/<area>.props.ts` named `*.props.test.ts` so `vitest` finds them.
- App folder name = app id = URL folder in `dist/`.
