# Tasks: shell-and-cli

Tick a task only after its `Verify:` command ran in the same session and passed. Quote the result line next to the tick. Do not stage or commit. Do not start this spec until every box in `.kiro/specs/engine/tasks.md` is ticked. Do not touch `skeleton/engine/` or any file under `apps/`. If the MCP SDK 1.32.2 API differs from design.md, adapt the call and say so in the report. If code, spec and steering disagree, stop and say where.

- [ ] 1. Tooling
  - Add to `package.json` the exact `devDependencies` `esbuild` 0.28.2, `@modelcontextprotocol/sdk` 1.32.2, `zod` 4.6.7, `@types/node` 22.20.5, and the scripts `build` (`tsx skeleton/build/build.ts`), `bones` (`tsx skeleton/cli/bones.ts`), `mcp` (`tsx skeleton/mcp/server.ts`). Add `"DOM"` to `lib` and `"node"` to `types` in `tsconfig.json`. Run `npm install`. Do not add `test:e2e`. Report in the task note that `tech.md` needs the `@types/node` row and the `mcp` script (owner's job).
  - Requirements: 1.1, 1.2, 1.3
  - Verify: `node --input-type=module -e "import { readFileSync as r } from 'node:fs'; const p = JSON.parse(r('package.json','utf8')); const want = {typescript:'6.0.3',tsx:'4.23.15',vitest:'5.1.0','fast-check':'4.10.2',esbuild:'0.28.2','@modelcontextprotocol/sdk':'1.32.2',zod:'4.6.7','@types/node':'22.20.5'}; const ok = p.type==='module' && p.dependencies===undefined && JSON.stringify(Object.entries(p.devDependencies).sort())===JSON.stringify(Object.entries(want).sort()) && Object.keys(p.scripts).sort().join()==='build,bones,mcp,test,test:props,typecheck'; if (ok===false) { console.error('package.json mismatch'); process.exit(1); }" && npm run typecheck`

- [ ] 2. Template, examples and CLI
  - `skeleton/template/` (`table.json`, `copy.json`, `theme.css`) and `skeleton/examples/` (`gap.table.json`, `conflict.table.json`) as in design.md; `skeleton/cli/bones.ts` with `run` and `main`, `check` and `new`; `test/cli.test.ts` with the rows listed in design.md "Testing". The `new`-then-build test is in task 5, not here.
  - `copy.json` in the template has the 18 labels, `answerStyle` `tiles`, a plain footer entry; `theme.css` has the 12 properties in `:root` and the 8 colours in the dark block.
  - Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 13.1, 13.2, 14.1, 14.2
  - Verify: `npx vitest --run test/cli.test.ts`

- [ ] 3. Page renderer and the injection property (Property 12)
  - `skeleton/shell/page.html`, `skeleton/build/page.ts` (`escapeJson`, `renderPage`), `test/props/shell-generators.ts` (`arbHostileText`, `arbHostileTable`, `arbHostileCopy`, `arbSteps`), and `test/props/shell.props.test.ts` with Property 12 named `Property 12 page holds table text only as escaped JSON`. Import `arbTable` from `test/props/generators.ts`; do not edit that file.
  - Requirements: 4.1, 4.2, 4.3, 4.4
  - Verify: `npx vitest --run test/props/shell.props.test.ts -t "Property 12"`

- [ ] 4. Shell, landing and the hash property (Property 11)
  - `skeleton/shell/`: `dom.ts`, `hash.ts`, `copy-type.ts`, `shell.ts`, `landing.ts`, `shell.css`, `neutral-theme.css`, `landing.json`, as in design.md. Add Property 11 named `Property 11 hash round trip` to `test/props/shell.props.test.ts`.
  - Text goes into the page only with `textContent` or text nodes; no `innerHTML` family, no `fetch`, no inline handlers, no `style` attribute, not even in comments (the final task greps for them).
  - Requirements: 2.7, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 10.2, 10.3
  - Verify: `npx vitest --run test/props/shell.props.test.ts -t "Property 11" && npm run typecheck`

- [ ] 5. Build
  - `skeleton/build/copy-check.ts` (`Copy`, `validateCopy`, `validateLanding`), `skeleton/build/theme-check.ts` (`THEME_PROPS`, `validateTheme`), `skeleton/build/build.ts` (`build`, `main`), as in design.md; `test/build.test.ts` with exactly these tests: (a) `new` then build a temp app, checking the 8 files, relative links, the parsed `data-table` block and no `template`/`examples` in `dist`; (b) a table with a gap is rejected and a sentinel in `outDir` survives; (c) a `theme.css` with a `body` selector is rejected; (d) one table-driven test with rows for a missing label, bad `answerStyle`, `javascript:` footer `href`, `javascript:` source `url`, an extra file in the app folder, a folder name different from the table id, an empty `apps/`, and `outDir` equal to the repo root; (e) the `shell.css` contract check, `neutral-theme.css` and `landing.json` validation, and the `expectTypeOf` equality of the two `Copy` types.
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 13.3, 14.1, 14.3
  - Verify: `npx vitest --run test/build.test.ts && npm run typecheck`

- [ ] 6. MCP server
  - `skeleton/mcp/server.ts` with `check_table` and `evaluate` and the path guard from design.md; `test/mcp.test.ts` with the one test described there (four calls over stdio with the SDK client).
  - Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
  - Verify: `npx vitest --run test/mcp.test.ts`

- [ ] 7. Cost of `decide` on a large table
  - `scripts/time-decide.ts` as in design.md "Decide cost". Run it and write the printed line into the task report. If it exits 1, stop and report the number to the owner; do not add a cache and do not change the engine.
  - Requirements: 16.1, 16.2
  - Verify: `npx tsx scripts/time-decide.ts`

- [ ] 8. Final gate
  - Run everything once; check import direction, the no-injection and no-network rules and that `zod` is only used by the MCP server. This task adds no code. `npm run build` is not part of the gate: it fails with `no apps found` until the `apps` spec adds apps (the build tests cover it with temp apps).
  - Requirements: 1.3, 1.4, 4.4, 4.5, 4.6, 15.6
  - Verify: `npm run typecheck && npm test && ! grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|import\(" skeleton/shell && ! grep -nE "\son[a-z]+=|javascript:|style=" skeleton/shell/page.html && ! grep -nE "url\(|@import" skeleton/shell/shell.css skeleton/shell/neutral-theme.css && ! grep -rnE "from ['\"][^.]" skeleton/shell && ! grep -rnE "from '(\.\./)+(build|cli|mcp)" skeleton/shell && ! grep -rnE "from '(\.\./)+(shell|cli|mcp)" skeleton/build && ! grep -rnE "from '(\.\./)+(shell|build|mcp)" skeleton/cli && ! grep -rnE "from '(\.\./)+(shell|build|cli)" skeleton/mcp && ! grep -rl "zod" skeleton/engine skeleton/shell skeleton/build skeleton/cli && ! grep -rnE "from ['\"]([^.]|\.\./)|require\(|import\(" skeleton/engine`
