# Tasks: engine

Tick a task only after its `Verify:` command ran in the same session and passed. Quote the result line next to the tick. Do not stage or commit. Do not start `shell-and-cli` until every box here is ticked.

- [x] 1. Tooling and types (Verify passed: package.json check silent, `tsc --noEmit` exit=0; note: tsconfig also sets `allowImportingTsExtensions` so `.ts` import paths work)
  - Create `package.json` (`"type": "module"`, the four pinned `devDependencies`, scripts `typecheck`, `test`, `test:props` only), `tsconfig.json`, `vitest.config.ts`; run `npm install`.
  - Create `skeleton/engine/types.ts` with the types and constants from design.md, and an `index.ts` that re-exports them.
  - If TypeScript 6.0.3 rejects a tsconfig option, stop and report it. Do not drop a strict flag.
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2
  - Verify: `node --input-type=module -e "import { readFileSync as r } from 'node:fs'; const p = JSON.parse(r('package.json','utf8')); const want = {typescript:'6.0.3',tsx:'4.23.15',vitest:'5.1.0','fast-check':'4.10.2'}; const ok = p.type==='module' && p.dependencies===undefined && JSON.stringify(Object.entries(p.devDependencies).sort())===JSON.stringify(Object.entries(want).sort()) && Object.keys(p.scripts).sort().join()==='test,test:props,typecheck'; if (ok===false) { console.error('package.json mismatch'); process.exit(1); }" && npm run typecheck`

- [x] 2. validate (Verify passed: `Tests  13 passed (13)`)
  - `skeleton/engine/validate.ts`, exported from `index.ts`; `test/tables.ts` (small valid base table); `test/validate.test.ts` with the nine error-kind rows and the 100,000 limit test from design.md.
  - Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12
  - Verify: `npm test -- test/validate.test.ts`

- [x] 3. Internal index and check (Verify passed: `Tests  2 passed (2)`)
  - `skeleton/engine/space.ts` (compile, strides, matching) and `skeleton/engine/check.ts`, exported from `index.ts`; `test/check.test.ts` with the agreeing-overlap test and the one-condition test.
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
  - Verify: `npm test -- test/check.test.ts`

- [x] 4. decide and evaluate (Verify passed: `Tests  5 passed (5)`)
  - `skeleton/engine/decide.ts` with `decide` and `evaluate`, exported from `index.ts`; `test/decide.test.ts` with the unknown-answer test and the one-condition test.
  - Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2
  - Verify: `npm test -- test/decide.test.ts`

- [x] 5. Generators, oracle and check properties (Properties 1 to 4) (Verify passed: `Tests  4 passed (4)`)
  - `test/props/generators.ts` (all generators, one file), `test/props/oracle.ts`, `test/props/check.props.test.ts` with Properties 1, 2, 3 and 4, named as in design.md.
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 8.1
  - Verify: `npx vitest --run test/props/check.props.test.ts`

- [x] 6. decide properties (Properties 5 to 9) (Verify passed: `Tests  5 passed (5)`)
  - `test/props/decide.props.test.ts` with Properties 5, 6, 7, 8 and 9, named as in design.md, using the shared generators and the oracle.
  - Requirements: 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1
  - Verify: `npx vitest --run test/props/decide.props.test.ts`

- [x] 7. Purity property (Property 10) (Verify passed: `Tests  2 passed (2)`; one is the harness self-check, one is Property 10)
  - `test/props/purity.props.test.ts` with Property 10: repeat calls, deep-frozen copies, JSON round trip, `Date`, `Math.random` and `performance.now` made to throw only during the call and restored in `finally`.
  - Requirements: 2.2, 9.1, 9.2
  - Verify: `npx vitest --run test/props/purity.props.test.ts`

- [x] 8. Final gate (Verify passed from a clean node_modules: `Tests  31 passed (31)` for `npm test`, `Tests  11 passed (11)` for `test:props`, grep found nothing)
  - Run everything once from a clean state; check that the engine imports only inside `skeleton/engine/`. Tick the earlier tasks only if their own Verify passed; this task adds no code.
  - Requirements: 1.2, 1.3, 1.4, 2.1, 2.3
  - Verify: `npm run typecheck && npm test && npm run test:props && ! grep -rnE "from ['\"]([^.]|\.\./)|require\(|import\(" skeleton/engine`
