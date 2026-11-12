# Tasks: playground

Tick a task only after its `Verify:` command ran in the same session and passed. Quote the result line next to the tick. Do not stage, commit or push.

Before starting: every box in `.kiro/specs/engine/tasks.md`, `.kiro/specs/shell-and-cli/tasks.md` and `.kiro/specs/apps/tasks.md` must be ticked. Read `design.md` ("Departures") first; the owner edits steering, you do not.

Rules for every task:
- Write the test first and see it fail for the right reason, where the task has tests. Task 3 has no test of its own (there is no DOM test library and none may be added); its behaviour is first exercised by the end-to-end tests of task 5, written before you look at the page code.
- Touch only the files the task names. Never edit `skeleton/engine/`, `apps/`, `skeleton/template/`, `skeleton/examples/`, `package.json`, `package-lock.json` or `tsconfig.json`. Never edit an `e2e/` file that exists before this spec.
- Words come from `design.md` (the copy file) word for word. Do not decide an open question of `design.md` yourself; implement as designed and say so in the report.
- No `as any`, no `@ts-ignore`, no `.skip`/`.only`, no weakened check (`tech.md` rule 3). Text reaches the DOM only as text nodes, `textContent`, an element `value`, or `setAttribute` with a fixed name.
- If a test shows a defect in `skeleton/engine/`, or code, spec and steering disagree beyond the listed departures, stop and say where. If axe reports a violation, report the rule, the selector and the file; do not disable a rule, exclude an element or lower a threshold.

- [x] 1. Make the shell mountable (Verify passed: `Tests  93 passed (93)`, `12 passed (2.3s)`, e2e diff clean, greps clean, exit 0.)
  - Create `skeleton/shell/mount.ts` with `mountApp(root, table, copy, options)`, `MountOptions` and `Mounted` as in design.md "The shell, made mountable": the body of `start()` moves there; `hash`, `embedded` (title, boot block, back link, `main` becomes a `div`, first announcement) and `headingOffset` work as in the table; `unmount()` removes the page and the `hashchange` listener once. Reduce `skeleton/shell/shell.ts` to reading the two data blocks and calling `mountApp(document.body, table, copy, {})`.
  - In `skeleton/shell/shell.ts`/`mount.ts` give the headings their classes (`app-title`, `question-title`, `section-title`; the steps heading keeps `plain`) and move the CSS in `skeleton/shell/shell.css` to class selectors as in the table in design.md. With offset 0 the pages must look and behave as before.
  - Do not edit any file in `e2e/`. The unchanged end-to-end suite is the test for this refactor.
  - `mount.ts` must pass the shell greps of shell-and-cli task 8 (no `innerHTML` family, no `fetch`, no inline handler, no `style=`).
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 9.4
  - Verify: `npm run typecheck && npm test && npm run test:e2e && git diff --quiet -- e2e && ! grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|import\(|style=" skeleton/shell/mount.ts skeleton/shell/shell.ts`

- [x] 2. The playground logic, the copy file and their tests (Verify passed: `Tests  20 passed (20)`, typecheck exit 0. Lines: Which licence? `Passes: 7 rules, 32 combinations, all covered`; gap.table.json `Fails: 1 gap, 0 conflicts`.)
  - First `test/playground.test.ts` (rows of design.md "Unit tests") and `test/props/playground.props.test.ts` (Property 13, named `Property 13 removing a rule exposes exactly the combinations only it covered`, 200 cases, oracle from `test/props/oracle.ts`, generator `arbPassingTable`; do not edit `generators.ts` or `oracle.ts`). See them fail.
  - Then `skeleton/playground/types.ts`, `playground.json` (the words of design.md "Copy"), `json-error.ts` (`locateJsonError`, iterative), `analyse.ts`, `summary.ts`, `rules.ts`, `theme.ts`. These files import only `skeleton/engine/index.ts` and `skeleton/shell/{dom,copy-type}.ts` (and each other). `theme.ts` and the DOM-facing code are not in the unit tests.
  - Report the line `summarise(analyse(<which-licence table text>), copy).line` gives, and the same for `gap.table.json`.
  - Requirements: 3.6, 3.7, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.10, 8.1, 8.2, 9.1
  - Verify: `npx vitest --run test/playground.test.ts test/props/playground.props.test.ts && npm run typecheck`

- [x] 3. The playground page (DOM and CSS) (Verify passed: typecheck exit 0 and every grep clean, command exit 0. Verified by typecheck and greps only; behaviour is first exercised by the e2e tests of task 5.)
  - `skeleton/playground/playground.ts` and `playground.css` as in design.md "The page": reads the `data-playground` and `data-examples` blocks with `readJson`, builds the DOM with `el`, wires the example buttons, Reset, the debounced input (250 ms), the rule list with Remove (focus rule of 3.8), the results, the frame with the preview or the notice, `applyTheme` and the colour-scheme change listener. The preview is mounted only through `mountApp(preview, table, copy, { hash: false, embedded: true, headingOffset: 2 })`.
  - The textarea is set only through its `value` property; table text, ids and engine messages reach the DOM only as text. No storage, no network, no change to `location` or history.
  - `playground.css` uses contract properties only (no colour literal, no `url(`, no `@import`).
  - This task has no behaviour test (see the rules above). Report that it was verified by typecheck and greps only.
  - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.10, 3.11, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 7.1, 7.3, 7.4, 9.1
  - Verify: `npm run typecheck && ! grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|import\(|localStorage|sessionStorage|indexedDB|document\.cookie|pushState|replaceState|location *=|setAttribute\('style'|cssText|style=" skeleton/playground && ! grep -rhE "from ['\"]" skeleton/playground | grep -vE "from '(\./[a-z-]+\.ts|\.\./engine/index\.ts|\.\./shell/(dom|mount|copy-type)\.ts)'" && ! grep -rnE "from '[^']*playground" skeleton/shell`

- [x] 4. Build and landing link (Verify passed: `Tests  21 passed (21)`, typecheck exit 0, `built 2 apps into dist/`, exit 0. `dist/playground/`: app.js, index.html, playground.css, shell.css, theme.css. Deviation: `validatePlayground` lives in `skeleton/build/copy-check.ts`, not in a new `playground-check.ts`, because this task's last grep (`from '[^']*playground`) would match the import of any file whose name contains "playground".)
  - First extend `test/build.test.ts` as in design.md "Build tests" (thirteen files, the playground page test, `parseTheme`, `validatePlayground`, the `playground.css` contract check, `validateLanding` with `playground`). See them fail.
  - Then `skeleton/build/theme-check.ts` (`parseTheme`), `skeleton/build/playground-check.ts` (`validatePlayground`), `skeleton/build/page.ts` (`bootPlayground`), `skeleton/build/copy-check.ts` (`validateLanding`), `skeleton/build/build.ts` (the playground step), `skeleton/shell/copy-type.ts` and `landing.json`/`landing.ts`/`shell.css` (the link and `.playground-card`). `skeleton/build` imports from `skeleton/playground` only `import type … from '../playground/types.ts'`. The landing link is a `div`, not a list item.
  - Fix `playground.css` or the page code if a test here shows a defect in them.
  - Run `npm run build` and report the file list of `dist/playground/`.
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 6.8, 8.3, 9.2
  - Verify: `npx vitest --run test/build.test.ts && npm run typecheck && npm run build && test -f dist/playground/index.html && ! grep -rnE "from '[^']*playground" skeleton/build | grep -v ":import type "`

- [x] 5. End-to-end tests (four) (Verify passed: `16 passed (2.8s)` and `Total: 16 tests in 8 files`, exit 0. Measured in the browser: `check` on which-bin (960 combinations, 33 rules), click to summary line, 3.8 ms. Preview theme applied under the CSP; axe found no violation.)
  - Write `e2e/playground.spec.ts` first, from design.md "End-to-end tests", before reading `playground.ts`: (a) landing link, remove `permissive-nothing`, notice, Reset, answer in the preview, URL unchanged, computed `--bg`; (b) markup shown as text, then invalid JSON with line and column and `aria-invalid`; (c) and (d) axe in the light and dark scheme at 1280 and 390 px, in the passing and the failing state, and no horizontal scroll at 390 px. Words come from the copy file and the apps' files (requirement 8.5); counts come from running the engine in the test.
  - Run them. Fix defects in `skeleton/playground/`, in `skeleton/shell/mount.ts` and `shell.css`, and in `skeleton/build/`. If the preview theme does not apply under the CSP (computed `--bg` unchanged), stop and report: that is Departure 4. If axe reports a violation, report it as the rules above say.
  - Do not edit `helpers.ts` or any other existing `e2e/` file; import from `helpers.ts` (`loadApp`, `scanAxe`).
  - Requirements: 5.4, 5.5, 6.6, 7.2, 8.4, 8.5, 8.6
  - Verify: `npm run test:e2e && npx playwright test --list | grep -q "Total: 16 tests"`

- [x] 6. Final gate and report (Verify passed from a clean `dist/`: `Tests  122 passed (122)`, `16 passed (2.8s)`, all diff and grep checks clean, exit 0.)
  - Run everything once from a clean `dist/`. This task adds no code. Check the import directions, the no-injection, no-network and no-storage rules, and that nothing outside the files this spec names changed.
  - Report: the departures of design.md that the owner must write into steering and older specs; every open question of design.md that is still open; any earlier report line that said "stop".
  - Requirements: 3.11, 7.1, 7.3, 8.6, 9.1, 9.2, 9.3, 9.4
  - Verify: `npm run typecheck && npm test && npm run test:e2e && git diff --quiet -- skeleton/engine apps skeleton/template skeleton/examples package.json tsconfig.json e2e && ! grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|import\(" skeleton/shell skeleton/playground && ! grep -rnE "localStorage|sessionStorage|indexedDB|document\.cookie" skeleton/shell skeleton/playground && ! grep -rnE "from '[^']*playground" skeleton/shell skeleton/engine && ! grep -rnE "from '[^']*playground" skeleton/build | grep -v ":import type " && for d in apps/*/; do test "$(ls "$d" | tr '\n' ' ')" = "copy.json table.json theme.css " || exit 1; done`
