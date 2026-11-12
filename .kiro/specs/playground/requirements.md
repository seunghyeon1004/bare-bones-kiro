# Requirements: playground

Scope: a page at `dist/playground/` where a visitor edits a decision table as text and sees the engine's `validate` and `check` results as they type, with the generated app running from the edited table when it passes. It covers the new folder `skeleton/playground/`, the refactor of `skeleton/shell/` so an app can be mounted into a given element (`mountApp`), the build changes that write `dist/playground/` and link it from the landing page, and the tests for these. Source of truth for behaviour: `docs/product-brief.md`, `.kiro/steering/*.md`, and the `engine`, `shell-and-cli` and `apps` specs, whose code is the starting point.

Out of scope: any change to `skeleton/engine/`, `apps/`, `skeleton/template/`, `package.json` (no new package, no new script), saving or sharing an edited table, editing `copy.json` or `theme.css`, syntax highlighting, line numbers, undo history beyond the browser's own, a code editor component, a Web Worker, translations.

The playground is a demonstration of the checker. It is not an authoring tool: it writes nothing to disk, storage or the URL, and produces no app. The product brief lists "no editor UI" as a non-goal; Departure 1 in `design.md` asks the owner to narrow that sentence. Other departures from steering and from earlier specs are listed in `design.md` ("Departures"); the owner edits steering, not this spec.

## Terms

- **Example**: one table the playground can load. There is one per app folder in `apps/` (title from the app's `copy.json`), plus the broken demo table `skeleton/examples/which-bin-broken.table.json`. Each carries a table, a `Copy` and a parsed theme.
- **Default example**: the Which licence? app (`which-licence`); if that app is not present, the first app in folder-name order.
- **Loaded example**: the example whose table text was last placed in the editor by page start, a load button, or Reset.
- **Table text**: the current content of the editor `<textarea>`.
- **Analysis**: the result of reading the table text: `syntax` (not JSON), `structure` (JSON, `validate` found problems) or `checked` (`validate` ok, `check` ran).
- **Passes**: the analysis is `checked` and `report.passed` is true. This is the rule `npm run build` applies to a table (`validate` ok and `check` passed).
- **Summary line**: the one-line status text, for example `Passes: 7 rules, 32 combinations, all covered` or `Fails: 4 gaps, 0 conflicts`.
- **Preview**: the app, mounted by `mountApp` into the preview element of the playground page.
- **Frame**: the area under the results that holds either the preview or the no-build notice.
- **Playground copy**: `skeleton/playground/playground.json`, the words of the page that are not in a table or produced by the engine.

## Requirement 1: The shell can be mounted

**User story:** As the author of the playground, I want to run the real app shell inside another page, so that the preview is the product and not a lookalike.

1.1 WHEN `mountApp(root, table, copy, options)` is called THE SYSTEM SHALL render the app page for that table and copy as the first child of `root`, and return an object `{ unmount }`.

1.2 WHEN `skeleton/shell/shell.ts` runs on an app page THE SYSTEM SHALL read the two data blocks and call `mountApp(document.body, table, copy, {})`, and every Playwright test that exists in `e2e/` before this spec SHALL pass without being edited.

1.3 WHERE `options.hash` is `false` THE SYSTEM SHALL NOT read `location.hash`, SHALL NOT call `history.replaceState`, SHALL NOT add a `hashchange` listener, and SHALL start with no steps; WHERE it is absent or `true` THE SYSTEM SHALL behave as before this spec.

1.4 WHERE `options.embedded` is `true` THE SYSTEM SHALL NOT change `document.title`, SHALL NOT remove an element with id `boot`, SHALL NOT render the "All apps" link, SHALL render its content container as a `div` with the same class instead of a `main` element (the host page owns the `main` landmark), and SHALL leave the live region empty after the first render (later renders caused by the visitor still announce as before); WHERE it is absent or `false` THE SYSTEM SHALL behave as before this spec.

1.5 WHERE `options.headingOffset` is an integer `n` from 0 to 4 (default 0) THE SYSTEM SHALL render every heading the app page renders at level `min(6, level + n)`, where `level` is the level it has today (1 for the title, 2 for the steps heading, the question and the result, 3 for "why" and "not asked").

1.6 WHEN `unmount()` is called THE SYSTEM SHALL remove the page element it added and every listener it added to `window`; a second call SHALL do nothing.

1.7 WHEN an app is mounted, unmounted and mounted again in the same document THE SYSTEM SHALL leave exactly one app page in the document and no duplicate element id.

1.8 THE SYSTEM SHALL style the app's headings by class, so that a heading looks the same at any level: no rule in `shell.css` that styles the app page selects a heading by tag, except the base rule for `h1` to `h6` (font family and line height). `shell.css` SHALL still use only `var(--contract property)` and no colour literal.

## Requirement 2: Build output and landing link

**User story:** As a visitor, I want the playground to be one static page I can reach from the landing page.

2.1 WHEN `npm run build` succeeds THE SYSTEM SHALL also write `dist/playground/index.html`, `app.js`, `shell.css`, `theme.css` (the neutral theme) and `playground.css`, so that `dist/` for one app holds exactly the eight files of shell-and-cli requirement 11.7 plus these five.

2.2 WHEN the build writes `dist/playground/index.html` THE SYSTEM SHALL use the page template of the app pages, with one extra `<link rel="stylesheet" href="playground.css">` after `shell.css`, the same `Content-Security-Policy` meta tag, relative `href` and `src` values only, and `<title>` set to the HTML-escaped playground copy title.

2.3 WHEN the build writes `dist/playground/index.html` THE SYSTEM SHALL write two data blocks, `data-playground` (the playground copy) and `data-examples` (`{ defaultExample, examples }`), escaped as in shell-and-cli requirement 4.2, and one static block `<div id="boot">` holding the copy's `title` (as `h1`), `intro` and `noscript`, HTML-escaped. The script removes the block at start.

2.4 THE SYSTEM SHALL build the examples as follows: one per app folder in name order, `{ id: <folder name>, label: <copy.title>, table, copy, theme }` from that app's own files; then the broken demo `{ id: 'broken', label: <playground copy brokenExample>, table, copy, theme }` whose table is read from `skeleton/examples/which-bin-broken.table.json` unchanged and whose copy and theme are those of the `which-bin` app. `defaultExample` is `which-licence`.

2.5 IF the `which-licence` or `which-bin` app is not in `apps/` THEN THE SYSTEM SHALL use the first app in folder-name order in its place (so a workspace with only an app made by `bones new` still builds).

2.6 THE SYSTEM SHALL write each theme in `data-examples` as `{ light, dark }`, two objects from custom property name to value, taken from the app's `theme.css`: `light` holds the thirteen contract properties, `dark` the eight colours.

2.7 WHEN the build runs THE SYSTEM SHALL validate the playground copy (every key present, no unknown key, every string non-empty, required placeholders present) and, IF there is a problem, report it as `skeleton/playground/playground.json: <path>: <message>`, write nothing, and exit with code 1, as for any other problem (shell-and-cli requirement 11.6).

2.8 IF `skeleton/examples/which-bin-broken.table.json` is missing or is not JSON THEN THE SYSTEM SHALL fail the build with a message naming the file. The build SHALL NOT require the broken table to pass `validate` or `check`, and SHALL NOT write it to `dist/` as a file.

2.9 WHEN the landing page renders THE SYSTEM SHALL show, after the app cards and before the note block, a link to `./playground/` whose text is `landing.json` `playground.title` ("Break a table and watch the checker catch it") followed by the sentence `playground.text`. The link SHALL NOT be inside a list element, so that the list of app links keeps exactly one item per app.

2.10 THE SYSTEM SHALL validate `playground.title` and `playground.text` in `landing.json` as non-empty strings, and SHALL leave the static landing block (`bootLanding`) as it is.

## Requirement 3: The table editor

**User story:** As a judge, I want to break a table and undo it in a few seconds, with or without touching the JSON.

3.1 WHEN the page starts THE SYSTEM SHALL fill a `<textarea>` with `JSON.stringify(table, null, 2)` of the default example's table, make that example the loaded example, and analyse the text.

3.2 THE SYSTEM SHALL show one button per example, in this order: the default example, the other apps in folder-name order, the broken demo; each labelled with the example's label.

3.3 WHEN an example button is activated THE SYSTEM SHALL replace the table text with that example's formatted table, make it the loaded example, and analyse at once.

3.4 THE SYSTEM SHALL show which example is loaded, in text, using the copy's `loaded` template.

3.5 WHEN Reset is activated THE SYSTEM SHALL replace the table text with the loaded example's formatted table, exactly as at load, and analyse at once.

3.6 WHILE the table text is JSON whose top level is an object with a `rules` array THE SYSTEM SHALL list one row per element of that array in order, showing the element's `id` when it is a string and the copy's `unnamed` text (with the 1-based position) otherwise, and one Remove button per row.

3.7 WHEN a Remove button is activated THE SYSTEM SHALL delete exactly the element at that position from the `rules` array, write `JSON.stringify(parsed, null, 2)` into the textarea (every other key and value of the JSON unchanged), and analyse at once.

3.8 WHEN a Remove button has been activated THE SYSTEM SHALL move focus to the Remove button now at the same position, or to the last one if the removed rule was last, or to the textarea if no rule is left.

3.9 WHILE the table text is not JSON whose top level is an object with a `rules` array THE SYSTEM SHALL show the copy's `unavailable` text in place of the rule list, and no Remove button.

3.10 WHEN the visitor types or pastes in the textarea THE SYSTEM SHALL analyse the text 250 ms after the last `input` event, and run no analysis for the earlier events; WHEN an example button, Reset or Remove runs, THE SYSTEM SHALL cancel a pending analysis and analyse at once.

3.11 THE SYSTEM SHALL NOT write to `localStorage`, `sessionStorage`, `indexedDB` or cookies, and SHALL NOT change `location` or call `history.pushState` or `history.replaceState`.

## Requirement 4: The checker results

**User story:** As a judge, I want to see exactly what the checker finds, in plain words and with the evidence.

4.1 WHEN the table text is analysed THE SYSTEM SHALL produce `syntax` if `JSON.parse` throws; otherwise `structure` if `validate` returns problems; otherwise `checked` with the `check` report. THE SYSTEM SHALL use no other rule, so that "passes" is the rule of `npm run build`.

4.2 THE SYSTEM SHALL show a summary line built from the playground copy: for a passing table `Passes: <n rules>, <n combinations>, all covered`; for a `checked` table that does not pass `Fails: <n gaps>, <n conflicts>`; for `structure` `Fails: <n structural errors>`; for `syntax` `Fails: invalid JSON at line <line>, column <column>`. Counts use the copy's singular and plural forms (`1 gap`, `2 gaps`).

4.3 WHEN the analysis is `checked` THE SYSTEM SHALL show, outside the summary line, the number of combinations covered out of the total (`combinations - gaps.count` of `combinations`).

4.4 WHEN the analysis is `syntax` THE SYSTEM SHALL show the 1-based line and column of the first error and a reason from the copy (`end`, `character`, `string` or `trailing`), where the first error is found by a scanner of JSON syntax (RFC 8259) that does not rely on the wording of `JSON.parse` messages; and for every text on which `JSON.parse` throws THE SYSTEM SHALL report a position with line and column at least 1.

4.5 WHEN the analysis is `structure` THE SYSTEM SHALL list the problems in the engine's order, each as `<path>: <message>`, at most 10, then a line `and <n> more` if there are more.

4.6 WHEN the analysis is `checked` THE SYSTEM SHALL show the gap count and, for the first 5 entries of `gaps.examples`, one combination each as `<condition>=<value>, …` in table condition order, then `and <n> more` where `n` is `gaps.count` minus the number shown; WHEN there is no gap it SHALL say so.

4.7 WHEN the analysis is `checked` THE SYSTEM SHALL list the first 5 conflicts, each with both rule ids, both outcome ids and the example combination, then `and <n> more` if there are more; WHEN there is none it SHALL say so.

4.8 WHEN the analysis is `checked` THE SYSTEM SHALL list the engine's warnings (`<path>: <message>`) without changing the summary line or the pass.

4.9 THE SYSTEM SHALL put the summary line, and nothing else, in a live region (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`), and SHALL write its text only when the text differs from the text already there.

4.10 THE SYSTEM SHALL derive the summary and every list from the table text alone: the same text gives the same display, with no `Date`, `Math.random`, network or storage read.

## Requirement 5: The preview

**User story:** As a judge, I want to see the app running from the table I am editing, and to see it refuse to build when the table is broken.

5.1 WHEN the table passes THE SYSTEM SHALL mount the app into the preview element with `mountApp(preview, table, copy, { hash: false, embedded: true, headingOffset: 2 })`, using the `Copy` of the loaded example and the validated `Table` from the analysis, and show no no-build notice.

5.2 WHEN the table does not pass THE SYSTEM SHALL unmount the preview and show in the frame, in its place, a notice with the copy's `noBuildHeading`, `noBuildText` and `noBuildReason` (with the reason the summary line gives after `Fails: `).

5.3 WHEN the analysis result passes and both the parsed table (compared as JSON text) and the loaded example are the same as for the app now mounted THE SYSTEM SHALL leave the mounted app as it is; otherwise it SHALL unmount the old app before it mounts the new one, so that no two apps exist at once.

5.4 WHILE the preview is in use (a visitor answers, changes or starts over) THE SYSTEM SHALL leave `location.href` exactly as it was.

5.5 WHEN the preview is shown THE SYSTEM SHALL set the thirteen contract properties of the loaded example's theme on the preview element only (with `style.setProperty`, never a `style` attribute or a `<style>` element), light values first and, WHILE `prefers-color-scheme: dark` matches, the dark values over them; and SHALL update them when that media query changes. The playground page itself SHALL keep the neutral theme.

5.6 WHEN the table text changes THE SYSTEM SHALL NOT write to any live region other than the summary line; the preview's own announcements happen only for the visitor's actions inside the preview.

5.7 THE SYSTEM SHALL render the preview only through `mountApp`: no second implementation of the app page.

## Requirement 6: Accessibility and layout

**User story:** As a visitor with a keyboard, a screen reader or a phone, I want the playground to work.

6.1 THE SYSTEM SHALL contain exactly one `h1` (the playground copy title) in the page outside the preview, and the heading levels SHALL not skip a level going down the page (h1, then h2 sections, then h3 and below).

6.2 THE SYSTEM SHALL label the textarea with a `<label for>` element, set `aria-invalid="true"` on it while the analysis is `syntax`, and set `spellcheck="false"`, `autocomplete="off"`, `autocapitalize="off"` on it.

6.3 THE SYSTEM SHALL use `<button type="button">` for every control (examples, Reset, Remove), each at least 44 by 44 CSS px, each with a visible focus indicator using `var(--focus)` (the rule in `shell.css`), and each Remove button with an accessible name that includes the rule's id.

6.4 THE SYSTEM SHALL set the textarea in a monospace font stack, make it scroll sideways inside itself (`wrap="off"`) and give the rule list and the results a scroll region of their own when long, so the page itself does not scroll sideways.

6.5 WHEN the viewport is 390 CSS px wide THE SYSTEM SHALL show one column in this order: editor, rule list, results, frame, with no horizontal scroll of the page; WHEN it is at least 60rem wide THE SYSTEM SHALL show the editor on the left and the results on the right, with the frame below both.

6.6 WHEN the passing state and the failing state (a rule removed, gaps listed, the notice shown) are scanned by axe, in the light and in the dark colour scheme, at 390 px and at 1280 px, THE SYSTEM SHALL report no violation.

6.7 WHERE the visitor prefers reduced motion THE SYSTEM SHALL use no CSS transition or animation on the playground's own elements.

6.8 THE SYSTEM SHALL write `playground.css` against the contract properties only: every `var(--x)` names a contract property; no colour literal (`#`, `rgb(`, `hsl(`), no `url(`, no `@import`. Pass and fail SHALL not be shown by colour alone: the summary line begins with the word `Passes` or `Fails`.

## Requirement 7: Untrusted text, no network, no storage

**User story:** As the owner, I want a page that executes JSON from a text box and still cannot be turned against its visitor.

7.1 THE SYSTEM SHALL put table text, rule ids, engine messages and example data into the page only as text nodes, `textContent`, an element's `value` property, or an attribute set with `setAttribute` under a fixed attribute name; and SHALL NOT use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, or a `style` attribute in `skeleton/playground/` or `skeleton/shell/mount.ts`.

7.2 WHEN the table text holds markup (for example a rule id `</textarea><img src=x onerror=window.__pwned=1>`) THE SYSTEM SHALL show it as text in the rule list and the results, create no element from it and run no script from it.

7.3 THE SYSTEM SHALL make no network request from the page: no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, dynamic `import()`, and no `url(` or `@import` in CSS.

7.4 THE SYSTEM SHALL take every visible word of the playground page from the playground copy, from the examples' tables and copies, or from the engine's own messages; no word is written in the code.

## Requirement 8: Tests

**User story:** As the owner, I want proportionate tests that show the playground does what it says.

8.1 THE SYSTEM SHALL hold unit tests in `test/playground.test.ts` for: the summary text of a passing, a gap, a conflict and a structurally invalid table (four rows); the error position for invalid JSON (four rows, one multi-line); rule removal editing the JSON text (three examples); and the rule list for valid and invalid text.

8.2 THE SYSTEM SHALL hold one property, Property 13, in `test/props/playground.props.test.ts` (see `design.md`).

8.3 THE SYSTEM SHALL extend `test/build.test.ts` so that it covers `dist/playground/` (requirement 2) and keeps its other tests; the "exactly the eight files" assertion becomes the thirteen files of requirement 2.1.

8.4 THE SYSTEM SHALL add `e2e/playground.spec.ts` with four tests: (a) from the landing page's playground link, the remove-a-rule-and-reset walk; (b) invalid JSON with a position, and markup shown as text; (c) and (d) axe in the light and in the dark scheme (requirement 6.6). The other `e2e/` files are not edited.

8.5 THE SYSTEM SHALL take every word that an end-to-end test looks for from `skeleton/playground/playground.json`, an app's `copy.json` or `table.json`, or `landing.json`, and every expected count from the engine run on the table the test builds.

8.6 IF a test shows a defect in `skeleton/engine/` THEN the task SHALL stop and report where, and SHALL NOT edit the engine or weaken a check to continue. IF axe reports a violation THEN the task SHALL report the rule, the selector and the file, and SHALL NOT disable a rule, exclude an element or lower a threshold.

## Requirement 9: Boundaries

**User story:** As the owner, I want the structure rules to hold, or be changed by me on purpose.

9.1 WHERE a file is in `skeleton/playground/` THE SYSTEM SHALL import only `skeleton/engine/index.ts` and, from `skeleton/shell/`, `dom.ts`, `mount.ts` and `copy-type.ts`; no package, no Node built-in, no other folder.

9.2 WHERE a file is in `skeleton/build/` THE SYSTEM SHALL import from `skeleton/playground/` only types (`import type` from `types.ts`).

9.3 THE SYSTEM SHALL leave `skeleton/engine/`, `apps/`, `skeleton/template/`, `skeleton/examples/`, `package.json` and `tsconfig.json` unedited, and SHALL NOT stage, commit or push.

9.4 THE SYSTEM SHALL keep `skeleton/shell/` from importing `skeleton/playground/`.
