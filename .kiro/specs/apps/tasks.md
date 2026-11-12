# Tasks: apps

Tick a task only after its `Verify:` command ran in the same session and passed. Quote the result line next to the tick. Do not stage or commit.

Before starting: every box in `.kiro/specs/engine/tasks.md` and `.kiro/specs/shell-and-cli/tasks.md` must be ticked, and the owner's answers to the shell-and-cli session (19 labels with `noscript`, dark colours required, `format.ts`) must be recorded in that spec.

Rules for every task:
- Write the test first, see it fail for the right reason, then write the data or code.
- Touch only the files the task names. Add nothing to `skeleton/` except `skeleton/examples/which-bin-broken.table.json`. An `apps/<name>/` folder holds exactly `table.json`, `copy.json`, `theme.css`.
- Take the table content, notes, copy and theme values from design.md word for word. Do not decide an open question of design.md yourself; implement as designed and say so in the report.
- If the real engine gives a count or walk length that differs from design.md, or axe or a test shows a defect in `skeleton/`, stop and report where (`tech.md` rule 6, requirements 1.5 and 10.11). Do not edit `skeleton/`, disable an axe rule, exclude an element or lower a check.
- If code, spec and steering disagree, stop and say where.

- [ ] 1. which-bin table and the broken demo
  - In `test/apps.test.ts` write the describes `which-bin table` (pinned counts and no warning; the 8 golden items with walk lengths; the traceability test against the README quote table) and `which-bin broken example`, as in design.md "Tests". Run them and see them fail.
  - Create `apps/which-bin/table.json` (6 conditions, 13 outcomes, 30 rules, 2 sources, all text from design.md) and `skeleton/examples/which-bin-broken.table.json`.
  - Report the line `npm run bones -- check apps/which-bin/table.json` prints and the first question `decide` asks with no answers.
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4
  - Verify: `npx vitest --run test/apps.test.ts -t "which-bin" && npm run bones -- check apps/which-bin/table.json && (npm run bones -- check skeleton/examples/which-bin-broken.table.json > /dev/null; test $? -eq 1)`

- [ ] 2. which-licence table
  - In `test/apps.test.ts` write the describe `which-licence table` (pinned counts and no warning; the 8 golden items with the two note assertions; the yml traceability test with a small front-matter parser for `permissions:` and `conditions:`), see it fail, then create `apps/which-licence/table.json` (4 conditions, 7 outcomes whose `detail` is each yml `description` unchanged, 7 rules, 1 source).
  - Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1, 9.2, 9.3
  - Verify: `npx vitest --run test/apps.test.ts -t "which-licence" && npm run bones -- check apps/which-licence/table.json`

- [ ] 3. Copy and themes for both apps
  - In `test/apps.test.ts` write the describes `copy` and `themes` (phrases, footer links, 19 labels; differing properties, the contrast pairs for light and dark, no web fonts, Hangul fonts), see them fail, then create the four files `apps/which-bin/{copy.json,theme.css}` and `apps/which-licence/{copy.json,theme.css}` from design.md.
  - Read `THEME_PROPS` in `skeleton/build/theme-check.ts`. If it contains `--font-size`, add it to both themes (design.md values); if not, leave it out and write in the report that "large type" for which-bin is not delivered (requirement 7.6, open question 6).
  - Run `npm run build` and report the file list of `dist/`.
  - Requirements: 1.3, 1.6, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
  - Verify: `npx vitest --run test/apps.test.ts -t "copy|themes" && npm run build`

- [ ] 4. Playwright setup and the functional end-to-end tests (7 of 12)
  - Add `@playwright/test` 1.65.0 and `@axe-core/playwright` 4.14.0 (exact) to `devDependencies`, the script `test:e2e` (`npm run build && playwright test`), and `playwright.config.ts` to `include` in `tsconfig.json`. Run `npm install` and `npx playwright install chromium`.
  - Create `playwright.config.ts`, `scripts/serve.mjs`, `e2e/helpers.ts`, and the tests `landing.spec.ts` (1), `walk.spec.ts` (2), `link.spec.ts` (1), `table.spec.ts` (2), `nojs.spec.ts` (1) as in design.md "End-to-end". The walks use `pressChoice` (Tab and Enter only).
  - If `skeleton/shell` differs from what design.md assumes (focus on the heading, the steps list, the bad-link notice, the `any` cells, the no-JS text), stop and report which test shows it.
  - Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.9, 10.10
  - Verify: `node --input-type=module -e "import { readFileSync as r } from 'node:fs'; const p = JSON.parse(r('package.json','utf8')); const want = {typescript:'6.0.3',tsx:'4.23.15',vitest:'5.1.0','fast-check':'4.10.2',esbuild:'0.28.2','@modelcontextprotocol/sdk':'1.32.2',zod:'4.6.7','@types/node':'22.20.5','@playwright/test':'1.65.0','@axe-core/playwright':'4.14.0'}; const ok = p.type==='module' && p.dependencies===undefined && JSON.stringify(Object.entries(p.devDependencies).sort())===JSON.stringify(Object.entries(want).sort()) && p.scripts['test:e2e']==='npm run build && playwright test' && Object.keys(p.scripts).sort().join()==='build,bones,mcp,test,test:e2e,test:props,typecheck'; if (ok===false) { console.error('package.json mismatch'); process.exit(1); }" && npm run typecheck && npm run test:e2e -- landing walk link table nojs`

- [ ] 5. Accessibility and layout end-to-end tests (5 of 12)
  - Create `e2e/a11y.spec.ts` (4 tests: each app, light and dark; question screen, result screen, result screen with the whole table open; `reducedMotion: 'reduce'`) and `e2e/layout.spec.ts` (1 test: 360 px, both apps, three screens each).
  - With a throwaway script outside the repo's tracked files, take a screenshot of each app in light and dark at 360 px and at desktop width, look at them, and write one sentence per app in the report on whether the two look clearly different (open question: this is the only visual check).
  - Requirements: 7.2, 10.7, 10.8, 10.10, 10.11
  - Verify: `npm run test:e2e && npx playwright test --list | grep -q "Total: 12 tests"`

- [ ] 6. Pages workflow
  - In `test/apps.test.ts` write the describe `pages workflow` (text checks of design.md), see it fail, then create `.github/workflows/pages.yml` as in design.md. In the report, remind the owner of the three steps only they can do: commit `package-lock.json`, set Pages source to "GitHub Actions", push.
  - Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
  - Verify: `npx vitest --run test/apps.test.ts -t "pages workflow"`

- [ ] 7. Final gate
  - Run everything once from a clean `dist/`. This task adds no code. Report the open questions of design.md that are still unanswered, and any report line from tasks 1 to 6 that said "stop".
  - Requirements: 1.3, 1.6, 2.3, 5.3, 10.1, 10.10
  - Verify: `npm run typecheck && npm test && npm run test:e2e && for d in apps/*/; do test "$(ls "$d" | tr '\n' ' ')" = "copy.json table.json theme.css " || exit 1; done`
