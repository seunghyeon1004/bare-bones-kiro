# Design: playground

## Overview

One new static page, `dist/playground/`, built from the same skeleton as the app pages. The visitor edits a decision table as JSON text. After a 250 ms pause the page runs the engine's `validate` and `check` on the text, shows what they find, and, when the table passes, runs the real app shell on that table. When it does not pass, it shows the notice "this table would not build" instead of the app.

Three pieces of work:

1. **Make the shell mountable.** The body of `skeleton/shell/shell.ts` moves to `skeleton/shell/mount.ts` as `mountApp(root, table, copy, options)`. `shell.ts` shrinks to "read the two data blocks, call `mountApp`". The app pages behave as before.
2. **The playground** in `skeleton/playground/`: pure logic (read the text, summarise, find a JSON syntax error, remove a rule), the DOM code, the copy file and a stylesheet.
3. **Build and landing.** The build writes `dist/playground/` and the landing page links to it.

Nothing is added to `package.json`. The engine is not touched. No new package, no new npm script.

```
text in the textarea ──► analyse(text) ──► Analysis { syntax | structure | checked }
                              │
              ┌───────────────┼──────────────────────┐
              ▼               ▼                      ▼
         summarise()     results lists          passes? ── yes ─► mountApp(preview, table, copy, {hash:false, embedded:true, headingOffset:2})
       (live status)    (gaps, conflicts…)               └─ no ──► "would not build" notice
```

## Departures from steering and earlier specs

The owner edits steering and the older specs. Each item says what to change.

1. **`product.md` and `docs/product-brief.md` list "no editor UI" as a non-goal.** The playground is a text box that edits a table. It is a demonstration of the checker: it saves nothing, builds nothing and writes no app. Suggested wording: "No editor UI for authoring apps. The playground is an in-memory demo of the checker." Until the owner changes the sentence, the spec and the steering disagree (`tech.md` rule 6); this spec was written at the owner's request.
2. **`structure.md`.** Add the line `skeleton/playground/  page for editing a table and watching the checker: imports the engine and shell/{dom,mount,copy-type}`. Dependency direction: `playground` imports `engine` and, from `shell`, `dom.ts`, `mount.ts`, `copy-type.ts`; `build` may `import type` from `playground/types.ts` (the same kind of exception as the `Copy` type); `shell` never imports `playground`. The sentence "`examples/` tables are never built into `dist/`" becomes "...except that the playground page carries the broken demo table in a data block; no example is written to `dist/` as a file".
3. **`shell-and-cli` requirement 11.1** (the build does not read `skeleton/examples/`) now has one exception: it reads `which-bin-broken.table.json` for the playground. **Requirement 11.7** (exactly eight files for one app) becomes thirteen with the five `playground/` files. **Requirements 10.1 to 10.4** gain the `playground` key of `landing.json`. **`apps` requirement 1.6** ("SHALL NOT write the demo table to `dist/`") holds for files; the table is in a data block of `playground/index.html`. **`apps` requirement 10.10 and the Verify of its task 5** count 12 end-to-end tests; with this spec there are 16.
4. **`shell-and-cli` requirement 4.4** forbids a `style` attribute (CSP `style-src 'self'`). The preview theme is applied with `element.style.setProperty`, which the CSP does not block (CSS Object Model changes are not "inline style"). This is an assumption about the browser; the end-to-end test in requirement 8.4(a) proves it by reading the preview's computed colour.
5. **`kiro-workflow.md`, "Order of specs"** gets a fourth entry, `playground`. `invariants.md` is unchanged (it lists the engine's I1 to I10). This spec's property is numbered 13, continuing 1 to 10 (engine) and 11 to 12 (shell-and-cli).
6. **`tech.md`**: no change. No dependency and no script is added.
7. **`shell.css` heading selectors** (`.steps h2`, `.why h3`, `.skipped h3`) become class selectors so that the heading offset cannot change how the app looks (requirement 1.8). This follows the earlier design pass (shell-and-cli owner amendment 10) in the same files.

## Files

```
skeleton/shell/mount.ts              NEW   mountApp, MountOptions, Mounted
skeleton/shell/shell.ts              EDIT  entry: read data blocks, mountApp(document.body, …)
skeleton/shell/shell.css             EDIT  heading classes; base rule for h1 to h6; .playground-card
skeleton/shell/copy-type.ts          EDIT  Landing gains playground: { title, text }
skeleton/shell/landing.json          EDIT  + playground
skeleton/shell/landing.ts            EDIT  link after the app cards (not in a list)
skeleton/playground/types.ts         NEW   PlaygroundCopy, PlaygroundData, PlaygroundExample, ThemeVars
skeleton/playground/playground.json  NEW   all words of the page
skeleton/playground/json-error.ts    NEW   locateJsonError(text)
skeleton/playground/analyse.ts       NEW   analyse(text), passes(analysis)
skeleton/playground/summary.ts       NEW   summarise(analysis, copy), plural(), describeChar()
skeleton/playground/rules.ts         NEW   formatTable(), listRules(), removeRule()
skeleton/playground/theme.ts         NEW   applyTheme(element, theme, dark)
skeleton/playground/playground.ts    NEW   the page: reads data blocks, builds the DOM, wires events
skeleton/playground/playground.css   NEW   layout; contract properties only
skeleton/build/theme-check.ts        EDIT  + parseTheme(css): ThemeVars (validateTheme unchanged)
skeleton/build/playground-check.ts   NEW   validatePlayground(input): string[]
skeleton/build/copy-check.ts         EDIT  validateLanding also checks playground.{title,text}
skeleton/build/page.ts               EDIT  + bootPlayground(copy)
skeleton/build/build.ts              EDIT  playground step; the broken table; third bundle
test/playground.test.ts              NEW   unit tests
test/props/playground.props.test.ts  NEW   Property 13
test/build.test.ts                   EDIT  thirteen files; playground page test; parseTheme; validatePlayground
e2e/playground.spec.ts               NEW   four tests
```

Files not listed are not edited. In particular none under `skeleton/engine/`, `apps/`, `skeleton/template/`, `skeleton/examples/`, and none of the existing `e2e/*.ts`.

Import rules (requirement 9): `playground/*` imports `../engine/index.ts` and `../shell/{dom,mount,copy-type}.ts`. `playground/types.ts` imports only `Copy`, `FooterEntry` types from `../shell/copy-type.ts` and `Table` from the engine. `shell/*` imports nothing from `playground`. `build/*` imports from `playground` only `import type … from '../playground/types.ts'`.

## The shell, made mountable

### API (`skeleton/shell/mount.ts`)

```ts
export interface MountOptions {
  hash?: boolean;          // default true.  false: the URL hash is neither read nor written
  embedded?: boolean;      // default false. true: the app is a guest in another page
  headingOffset?: number;  // default 0.     integer 0 to 4: heading level = min(6, level + offset)
}
export interface Mounted { unmount(): void }
export function mountApp(root: HTMLElement, table: Table, copy: Copy, options?: MountOptions): Mounted;
```

`mountApp` is the current body of `start()` with these changes and no others:

| Today in `start()` | In `mountApp` |
| --- | --- |
| `readJson` of the two data blocks | removed; arguments |
| `document.getElementById('boot')?.remove(); document.title = copy.title` | only when `!embedded` |
| `document.body.insertBefore(page, document.body.firstChild)` | `root.insertBefore(page, root.firstChild)` |
| the "All apps" link in the header | only when `!embedded` |
| `window.addEventListener('hashchange', …)`, `readAddress()`, `writeAddress()` | only when `hash !== false`; the listener function is kept so `unmount` can remove it |
| `live.textContent = announce.join(' ')` in `render` | skipped on the first render when `embedded` |
| `el('main', …)` | `el(embedded ? 'div' : 'main', …)`, same class |
| `el('h1' …)`, `el('h2' …)`, `el('h3' …)` | `heading(level, attrs, …children)`, which makes `h${min(6, level + offset)}` |

`unmount()` removes `page` from the document and removes the `hashchange` listener if one was added. A second call does nothing (a `mounted` flag).

`shell.ts` becomes:

```ts
const table = readJson<Table>('data-table');
const copy = readJson<Copy>('data-copy');
mountApp(document.body, table, copy, {});
```

Behaviour with `{}` equals today's page: boot block removed, title set, hash read and written, back link shown, first render announces.

### Why `embedded` is one flag

The four things `embedded` turns off or changes (document title and boot block, back link, `main` landmark, first announcement) always go together for a guest app, so one flag keeps the option list at three. A second `main` would fail axe (`landmark-no-duplicate-main`, `landmark-main-is-top-level`), and the host page needs its own `main` so that its content is inside a landmark. `hash` is separate because the requirement names it and a future embedder may want a guest that shares the hash.

### Heading levels and the CSS that follows from them

The playground puts the app under an `h2` ("The app"), so the preview uses `headingOffset: 2`: title `h3`, steps/question/result `h4`, "why" and "not asked" `h5`. Without the offset the preview would add a second `h1` to the page. Tag selectors would then change how the app looks, so the CSS moves to classes:

| Heading | Class it gets | CSS |
| --- | --- | --- |
| app title (`h1`) | `app-title` | the current `h1 { margin; font-size: 2rem }` rule also matches `.app-title`. The landing page keeps its plain `h1`. |
| steps heading (`h2.plain`) | already `plain` | `.steps h2` becomes `.steps .plain` |
| question heading (`h2`) | `question-title` | new: `font-size: 1.5em; margin: 0.83em 0` (the browser's default `h2` values, so offset 0 looks the same as today) |
| result heading (`h2.result-heading`) | already classed | no change |
| "why", "not asked" (`h3`) | `section-title` | `.why h3, .skipped h3` become `.why .section-title, .skipped .section-title` |
| base rule | | `h1, h2, h3, h4` becomes `h1, h2, h3, h4, h5, h6` (font family, line height) |

`.note-block h2` is the landing page's and is not touched. The existing end-to-end tests select headings by role, level and name; with offset 0 nothing they see changes.

### Why the page is not tested in vitest

There is no DOM implementation in the dev dependencies (shell-and-cli owner answer 5) and none is added. The refactor is therefore protected by the unchanged end-to-end suite (task 1 runs it) and by the new end-to-end tests.

## The playground logic (pure, no DOM)

Everything in this section runs in Node under vitest. `summary.ts` imports `fill` from `shell/dom.ts`; `dom.ts` touches `document` only inside functions, so importing it in Node is safe.

### Types (`types.ts`)

```ts
export interface Plural { one: string; other: string }               // both contain {n}
export interface ThemeVars { light: Record<string, string>; dark: Record<string, string> }
export interface PlaygroundExample { id: string; label: string; table: unknown; copy: Copy; theme: ThemeVars }
export interface PlaygroundData { defaultExample: string; examples: PlaygroundExample[] }
export interface PlaygroundCopy { /* the keys of playground.json, below */ }
```

`table` is `unknown` in the data (the broken demo is not guaranteed valid); the page only ever formats it into text.

### `locateJsonError(text): JsonError | undefined` (`json-error.ts`)

```ts
export interface JsonError {
  reason: 'end' | 'character' | 'string' | 'trailing';
  offset: number;      // 0-based UTF-16 index of the first bad position
  line: number;        // 1-based; a line break is "\n"
  column: number;      // 1-based, in UTF-16 code units from the start of the line
  character?: string;  // the offending character, for 'character'
}
```

A small scanner for the JSON grammar of RFC 8259, with an explicit stack instead of recursion (a pasted `[[[[…` of 100,000 brackets must not overflow the call stack). It returns `undefined` when the text is valid JSON.

- Whitespace is space, tab, line feed, carriage return.
- Values: object, array, string, number (`-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?`), `true`, `false`, `null`.
- Strings: any character except `"`, `\` and U+0000 to U+001F; escapes `\" \\ \/ \b \f \n \r \t \uXXXX` (four hex digits).
- Reasons: the text ends where more is needed (including inside a string or a literal) → `end`, offset = text length; a control character or a bad escape inside a string → `string` at that character; anything else unexpected → `character`; a complete top-level value followed by anything other than whitespace → `trailing` at the first such character.
- A trailing comma (`{"a":1,}`) is `character` at the `}`; an empty text is `end` at 1:1.

`analyse` uses `JSON.parse` to decide whether the text is valid, and the scanner only to place the error. If `JSON.parse` throws and the scanner finds nothing (the two disagree on some corner case), the error is reported as `character` at offset 0 (line 1, column 1) so a real error is never shown as "no error" (requirement 4.4). A unit test lists inputs on which both agree; it does not claim the scanner equals `JSON.parse` everywhere.

### `analyse(text): Analysis` (`analyse.ts`)

```ts
export type Analysis =
  | { kind: 'syntax'; error: JsonError }
  | { kind: 'structure'; problems: Problem[] }
  | { kind: 'checked'; table: Table; report: CheckReport };
export function analyse(text: string): Analysis;
export function passes(a: Analysis): boolean;   // a.kind === 'checked' && a.report.passed
```

`analyse` never throws: `JSON.parse` failure → `syntax`; `validate(parsed)` not ok → `structure`; else `check(table)`. This is exactly the order `skeleton/build/build.ts` uses for an app's `table.json` (without the folder-name and source-URL checks, see the open questions).

Cost: `JSON.parse` plus `validate` plus `check`. For the two apps (at most 960 combinations, 33 rules) that is well under a millisecond. At the 100,000-combination cap `check` is O(N·R·T); the engine design's estimate for that size is a few hundred milliseconds in the worst case on a laptop; it has not been measured for `check`, and `decide` on such a table measured 80 ms (shell-and-cli task 7). The 250 ms debounce means one such run per pause. No worker is used.

### `summarise(analysis, copy): Summary` (`summary.ts`)

```ts
export interface Summary { passes: boolean; line: string; reason: string | undefined; coverage: string | undefined }
export function plural(forms: Plural, n: number): string;                 // fill(n === 1 ? forms.one : forms.other, { n })
export function summarise(a: Analysis, copy: PlaygroundCopy): Summary;
export function describeChar(c: string): string;                           // printable → itself; control or whitespace → "U+000A"
```

| Analysis | `passes` | `reason` | `line` |
| --- | --- | --- | --- |
| `checked`, passed | true | none | `results.passes` with `{rules: plural(rule, n), combinations: plural(combination, n)}` |
| `checked`, not passed | false | `results.reasonCheck` with `{gaps: plural(gap, c), conflicts: plural(conflict, k)}` | `results.fails` with `{reason}` |
| `structure` | false | `results.reasonStructure` with `{problems: plural(problem, n)}` | `results.fails` |
| `syntax` | false | `results.reasonSyntax` with `{line, column}` | `results.fails` |

`coverage` is set only for `checked`: `results.coverage` with `{covered: combinations - gaps.count, total: combinations}`. With the copy below the examples read `Passes: 7 rules, 32 combinations, all covered` and `Fails: 4 gaps, 0 conflicts`.

### Rule helpers (`rules.ts`)

```ts
export function formatTable(table: unknown): string;                          // JSON.stringify(table, null, 2)
export function listRules(text: string): { index: number; id: string | undefined }[] | undefined;
export function removeRule(text: string, index: number): string;
```

- `listRules`: `undefined` unless `JSON.parse(text)` is an object (not an array, not null) with a `rules` array. Otherwise one entry per element; `id` is the element's `id` when the element is an object with a string `id`.
- `removeRule`: if `listRules(text)` is defined and `0 <= index < length`, parse, delete that element (`splice`), and return `formatTable(parsed)`. Otherwise return `text` unchanged. It removes by position, because a broken table can have two rules with the same id.
- Removal re-serialises the whole text with two-space indentation. The examples are loaded in the same format (`formatTable`), so a removal changes only the removed lines. Custom formatting typed by the visitor is replaced (open question 5).

### Theme helper (`theme.ts`)

```ts
export function applyTheme(element: HTMLElement, theme: ThemeVars, dark: boolean): void;
```

Sets every `light` property on `element` with `element.style.setProperty(name, value)`, then, if `dark`, every `dark` property over it. Light always has all thirteen, so switching back from dark restores every colour. No `style` attribute text, no `<style>` element.

## Copy (`skeleton/playground/playground.json`)

Placeholders are `{name}` as in `fill`. The words are fixed here; the task copies them.

```json
{
  "title": "Break a table and watch the checker catch it",
  "tagline": "Edit a decision table. The checker that guards the build reads it as you type.",
  "intro": "A gap is a combination of answers that no rule covers. A conflict is a combination that two rules answer differently. Remove a rule below, or change the JSON, and see what the checker finds. If the table passes, the app runs from it. If not, the build would stop. Nothing you type leaves this page, and nothing is saved.",
  "noscript": "This page needs JavaScript to check a table. It makes no network requests and stores nothing.",
  "allApps": "All apps",
  "editor": {
    "heading": "The table",
    "startFrom": "Start from",
    "brokenExample": "Broken demo table",
    "loaded": "Loaded: {name}",
    "textareaLabel": "Table JSON",
    "textareaHint": "The checker reads the text a moment after you stop typing.",
    "reset": "Reset"
  },
  "rules": {
    "heading": "Remove a rule",
    "intro": "Each button deletes one rule from the JSON above.",
    "remove": "Remove",
    "removeNamed": "Remove rule {id}",
    "unnamed": "rule {n}",
    "unavailable": "The rule list needs JSON with a list of rules.",
    "empty": "The table has no rules."
  },
  "results": {
    "heading": "What the checker finds",
    "passes": "Passes: {rules}, {combinations}, all covered",
    "fails": "Fails: {reason}",
    "reasonCheck": "{gaps}, {conflicts}",
    "reasonStructure": "{problems}",
    "reasonSyntax": "invalid JSON at line {line}, column {column}",
    "coverage": "{covered} of {total} combinations covered",
    "syntaxHeading": "Invalid JSON",
    "syntaxDetail": "Line {line}, column {column}: {reason}",
    "jsonReasons": {
      "end": "the text ends too soon",
      "character": "unexpected character {character}",
      "string": "bad character inside a string",
      "trailing": "extra text after the table"
    },
    "structureHeading": "Structural errors",
    "gapsHeading": "Gaps: combinations no rule covers",
    "gapsNone": "No gaps.",
    "conflictsHeading": "Conflicts: combinations two rules answer differently",
    "conflictsNone": "No conflicts.",
    "conflictLine": "{a} gives {outcomeA}, {b} gives {outcomeB}. For example: {example}",
    "more": "and {count} more",
    "warningsHeading": "Warnings"
  },
  "plural": {
    "rule": { "one": "{n} rule", "other": "{n} rules" },
    "combination": { "one": "{n} combination", "other": "{n} combinations" },
    "gap": { "one": "{n} gap", "other": "{n} gaps" },
    "conflict": { "one": "{n} conflict", "other": "{n} conflicts" },
    "problem": { "one": "{n} structural error", "other": "{n} structural errors" }
  },
  "app": {
    "heading": "The app",
    "noBuildHeading": "This table would not build",
    "noBuildText": "npm run build checks every table and stops when one has structural errors, gaps or conflicts. No app would be written from it.",
    "noBuildReason": "Why: {reason}"
  },
  "footer": [
    { "text": "This page checks the text you type with the same engine as the build. It saves nothing and sends nothing." }
  ]
}
```

`validatePlayground(input): string[]` (in `skeleton/build/playground-check.ts`) walks a constant tree of the expected keys. It reports, as `<path>: <message>`, `missing`, `unknown key`, `must be a string`, `must not be empty` (after trimming), and `must contain {name}` for each required placeholder: `editor.loaded` {name}; `rules.removeNamed` {id}; `rules.unnamed` {n}; `results.passes` {rules} {combinations}; `results.fails` {reason}; `results.reasonCheck` {gaps} {conflicts}; `results.reasonStructure` {problems}; `results.reasonSyntax` {line} {column}; `results.coverage` {covered} {total}; `results.syntaxDetail` {line} {column} {reason}; `results.jsonReasons.character` {character}; `results.conflictLine` {a} {b} {outcomeA} {outcomeB} {example}; `results.more` {count}; `app.noBuildReason` {reason}; both forms of every `plural.*` entry {n}. `footer` is checked like the `footer` of `copy.json` (shell-and-cli requirement 2.5).

The engine's `Problem.message` and `CheckReport` strings, and ids, labels and rule text of the table being edited, are data and are shown as they are. They are English, like the engine; this is the one place where a word on the page does not come from the copy file (requirement 7.4).

## Build

### `parseTheme(css): ThemeVars` (`theme-check.ts`)

Uses the scanner `validateTheme` already has: the declarations of the top-level `:root` rule go to `light`, those of the `:root` inside `@media (prefers-color-scheme: dark)` to `dark`; each value is the declaration's text after the first `:`, trimmed. It is called only on a theme that passed `validateTheme`, so `light` has the thirteen contract properties and `dark` the eight colours. `validateTheme`'s results and messages do not change (the existing tests pass untouched).

### The playground step (`build.ts`)

After the apps and the landing page are validated (so the playground shares the all-or-nothing rule, shell-and-cli requirement 11.6), and before anything is written:

1. Read and validate `skeleton/playground/playground.json` (`validatePlayground`). Read `playground.css`. Both are found relative to `import.meta.url`, like `landing.json`.
2. Read `skeleton/examples/which-bin-broken.table.json` and `JSON.parse` it; a read or parse failure is an error naming the file. Nothing else is asked of it.
3. Build `examples` (requirement 2.4, 2.5): for each parsed app in name order `{ id: name, label: copy.title, table, copy, theme: parseTheme(themeCss) }`, then `{ id: 'broken', label: playgroundCopy.editor.brokenExample, table: brokenTable, copy: <which-bin's copy>, theme: <which-bin's theme> }`. The constants `which-licence` (default example) and `which-bin` (broken demo's copy and theme) are named once in `build.ts`; if an app with that name is absent, the first app is used. `defaultExample` is the id of the default example.
4. Bundle `skeleton/playground/playground.ts` the same way as the other two entry points.
5. Write `playground/index.html` with `renderPage(playgroundTemplate, { playground: copy, examples: data }, bootPlayground(copy), copy.title)`, `playground/app.js`, `playground/shell.css` (the shell's), `playground/theme.css` (the neutral theme), `playground/playground.css`.

`playgroundTemplate` is the page template with `<link rel="stylesheet" href="playground.css">` added on a new line after the `shell.css` link, by `String.replace` with a function replacement; the build throws if the replacement changed nothing, so a template edit cannot silently drop the stylesheet. The CSP meta tag is therefore the same as on every other page.

`bootPlayground(copy)` in `page.ts` returns `<div id="boot" class="page"><h1>…</h1><p>intro</p><noscript><p>noscript</p></noscript></div>`, all HTML-escaped, the same shape as `bootApp`.

### Landing

`landing.json` gains:

```json
"playground": {
  "title": "Break a table and watch the checker catch it",
  "text": "Delete a rule from a table and watch the checker find the gap and the app refuse to build. Then press Reset."
}
```

`Landing` gains `playground: { title: string; text: string }`; `validateLanding` checks both strings. `landing.ts` renders, after the `ul.apps` and before the note block:

```
<div class="playground-card"><a class="app-link" href="./playground/">title</a><p>text</p></div>
```

It is a `div`, not a list item, so `page.getByRole('list').getByRole('link')` in the existing landing test still counts exactly the apps. `.playground-card` is styled like `.apps li` (surface, border, accent bar, radius), with contract properties only; the card is `margin-top: calc(var(--space) * 2)` below the list. The static `bootLanding` block is not changed (the playground needs scripts, so it has no place in the no-script page).

## The page (`playground.ts`)

### State

The textarea is the source of truth. The rest is derived:

```ts
let loaded: PlaygroundExample;           // the loaded example
let timer: number | undefined;           // pending debounce
let mounted: { key: string; handle: Mounted } | undefined;
```

`key` is `loaded.id + '\n' + JSON.stringify(table)`; `table` is the validated table of the analysis (so whitespace edits in the text do not change it and the visitor's answers in the preview survive them).

### Functions

- `load(example)`: `loaded = example`; `textarea.value = formatTable(example.table)`; `analyseNow()`.
- `analyseNow()`: clear `timer`; `a = analyse(textarea.value)`; `renderResults(a)`; `renderRules()`; `renderFrame(a)`.
- `onInput()`: `clearTimeout(timer)`; `timer = setTimeout(analyseNow, 250)`.
- `renderResults(a)`: `s = summarise(a, copy)`; `if (status.textContent !== s.line) status.textContent = s.line` (requirement 4.9); sets the coverage paragraph, the `aria-invalid` attribute, and rebuilds the detail section with `replaceChildren` from text nodes only.
- `renderRules()`: `listRules(textarea.value)`; rebuilds the list; each Remove button's click handler calls `removeRule(textarea.value, row.index)`, writes the text to `textarea.value`, restores the textarea's `scrollTop`, calls `analyseNow()` and then moves focus (requirement 3.8).
- `renderFrame(a)`: if `passes(a)` and `a.kind === 'checked'`: compute `key`; if `mounted?.key !== key` then `mounted?.handle.unmount()`, create a fresh preview element, `applyTheme(preview, loaded.theme, darkQuery.matches)`, `mountApp(preview, a.table, loaded.copy, { hash: false, embedded: true, headingOffset: 2 })`, and put the preview in the frame. Else: `mounted?.handle.unmount()`, `mounted = undefined`, and put the notice in the frame.
- `darkQuery = matchMedia('(prefers-color-scheme: dark)')`; its `change` event calls `applyTheme` again on the current preview element.

A fresh preview element for each mount keeps ids and focus state clean (requirement 1.7). Because only `a.table` of a passing analysis reaches `mountApp`, `decide` never meets a table that failed `check`.

### DOM (all built with `dom.ts` `el`, text nodes only)

```
div.pg-page
  header
    p.back > a[href="../"]          copy.allApps
    h1                              copy.title
    p.tagline                       copy.tagline
    p.intro                         copy.intro
  main
    div.pg-grid
      section.pg-editor[aria-labelledby=pg-editor-h]
        h2#pg-editor-h                editor.heading
        div.pg-examples
          p#pg-start                  editor.startFrom
          div[role=group][aria-labelledby=pg-start]  button ×N (label of each example)
        p.pg-loaded                   editor.loaded
        label[for=pg-text]            editor.textareaLabel
        p#pg-hint                     editor.textareaHint
        textarea#pg-text[spellcheck=false][autocomplete=off][autocapitalize=off][wrap=off][rows=24][aria-describedby="pg-hint pg-syntax"]
        button.pg-reset               editor.reset
        section.pg-rules[aria-labelledby=pg-rules-h]
          h3#pg-rules-h               rules.heading
          p                           rules.intro
          div.pg-rule-list[role=region][tabindex=0][aria-label=rules.heading] > ul > li (id text + button "Remove")
      section.pg-results[aria-labelledby=pg-results-h]
        h2#pg-results-h               results.heading
        p#pg-status[role=status][aria-live=polite][aria-atomic=true]   summary line
        p.pg-coverage                 coverage (checked only)
        div#pg-details                syntax / structure / gaps / conflicts / warnings
    section.pg-app[aria-labelledby=pg-app-h]
      h2#pg-app-h                     app.heading
      div.pg-frame                    the preview element, or the notice
  footer                              renderFooter(copy.footer)
```

Ids avoid the shell's own (`table-region`, `steps-heading`). The details headings are `h3`. The page has one `main` (the preview's content container is a `div`, see `embedded`), one banner (`header`) and one contentinfo (`footer`); the `header` and `footer` inside the preview sit inside a `section`/`main`, so they are not landmarks.

The Remove button's text is `rules.remove`; its `aria-label` is `rules.removeNamed` filled with the rule id (it contains the visible word, so the label matches the visible text). The syntax error paragraph has id `pg-syntax` and is empty unless the analysis is `syntax`, so `aria-describedby` points at something only when there is an error.

The notice, in the frame when the table does not pass: `div.pg-notice[role=group][aria-labelledby=pg-notice-h]` holding `h3#pg-notice-h` (`app.noBuildHeading`), `p` (`app.noBuildText`), `p` (`app.noBuildReason` filled with the summary's `reason`). The notice is not a live region; the summary line already announces the failure.

### Detail lists (text only)

- **syntax**: `h3` `results.syntaxHeading`; `p#pg-syntax` = `results.syntaxDetail` with `{line, column, reason}` where `reason` is `results.jsonReasons[error.reason]` (with `{character: describeChar(error.character)}` for `character`).
- **structure**: `h3` `results.structureHeading`; `ul` of `<path>: <message>` (at most 10), then `results.more` with `{count}`.
- **checked**: gaps: `h3` `results.gapsHeading` (the count is in the summary line and, for the list, in the first line of the section: `plural(gap, count)`); `ul` of up to 5 `condition=value, …` strings built from `Object.entries(example)`; `results.more` if `gaps.count > shown`; or `results.gapsNone`. Conflicts: `h3` `results.conflictsHeading`; up to 5 `results.conflictLine` with `{a, b, outcomeA, outcomeB, example}`; `results.more`; or `results.conflictsNone`. Warnings: `h3` `results.warningsHeading` and `<path>: <message>` lines, only if there are any.

The first five gap examples are the engine's first five in enumeration order (`gaps.examples[0..4]`). The engine reports up to 20; the page shows 5.

### CSS (`playground.css`)

Contract properties only (requirement 6.8). Highlights:

- `.pg-page`: `max-width: 72rem`, centred, same padding scale as `.page`, `overflow-wrap: anywhere`.
- `.pg-grid`: one column. `@media (min-width: 60rem)`: `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`, gap `calc(var(--space) * 2)`. The grid items have `min-width: 0`, so a wide textarea cannot widen the page.
- `textarea`: `width: 100%`, `box-sizing: border-box`, `font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace`, `font-size: 0.875rem`, `min-height: 16rem`, `overflow: auto`, `white-space: pre`, background `var(--surface)`, text `var(--text)`, border `1px solid var(--border)`, radius `var(--radius)`. The generic font names in the stack are not colours and not `var()`, so the contract rule (no `var()` of another name, no colour literal) holds.
- `.pg-rule-list`: `max-height: 14rem; overflow: auto` with the same border as `.table-region`; rows are flex with the id on the left and the button on the right.
- `#pg-status`: bold, a left accent bar in `var(--accent)`; the text begins with `Passes` or `Fails`, so state is not colour alone.
- `.pg-frame`: border `1px solid var(--border)`, radius `var(--radius)`, `overflow: hidden`. The preview element inside it carries the example's theme properties (set by script) and has `background: var(--bg); color: var(--text); font-family: var(--font-body)`. These rules sit on `.pg-preview`, which is a child of the frame, so the frame's border and the notice keep the neutral theme.
- `@media (prefers-reduced-motion: reduce)`: `transition: none; animation: none` for the playground's classes.

Known limit: `shell.css` sizes text in `rem` and sets `html { font-size: var(--font-size) }`. The preview cannot change the page's root size, so Which bin?'s larger type (`--font-size: 1.25rem`) does not show in the preview; its colours, fonts, radius and spacing do. Open question 4.

## Testing

### Unit tests (`test/playground.test.ts`)

Words come from `playground.json`, tables from `skeleton/examples/*.json`, `apps/which-licence/table.json` and an inline table.

- **Summary text**, one `it.each` of four rows through `summarise(analyse(text), copy).line`: the Which licence? table → `Passes: 7 rules, 32 combinations, all covered`; `gap.table.json` → `Fails: 1 gap, 0 conflicts`; `conflict.table.json` → `Fails: 0 gaps, 1 conflict`; Which licence? with a rule's `then` changed to an unknown outcome → `Fails: 1 structural error`. The first row also checks `coverage` (`32 of 32 combinations covered`); the gap row checks that `coverage` is built from `combinations - gaps.count` and `combinations` of the engine's report, read in the test, not typed in.
- **JSON error position**, one `it.each` of four rows through `analyse(text)`: `{"a":1,}` → `character` `}` at line 1, column 8; `{"a":` → `end` at line 1, column 6; a three-line text with a missing comma → `character` `"` at line 3, column 3; `{} x` → `trailing` at line 1, column 4. A fifth check: the empty text is `end` at line 1, column 1.
- **Agreement with `JSON.parse`** on a fixed list of eight texts (four valid, four invalid): `locateJsonError(text) === undefined` exactly when `JSON.parse` does not throw.
- **Rule removal**, three tests: removing position 2 of a formatted table leaves every other key and all other rules equal; the result is `formatTable` output (two-space indentation); two rules with the same id: only the one at the given position goes; invalid JSON or an out-of-range position returns the text unchanged.
- **Rule list**: `listRules` returns ids in order for a formatted table, an `undefined` id for a rule without a string id, and `undefined` for invalid JSON and for a top-level array.

No test restates another: the property below does not repeat the example rows, and the end-to-end tests do not repeat the text assertions beyond what they need to read the page.

### Build tests (`test/build.test.ts`)

- The first test's file list becomes the thirteen files (the five `playground/` files added).
- One new test builds a workspace with `bones new demo` and checks `dist/playground/index.html`: it has the `Content-Security-Policy` meta, the `playground.css` link, only relative links, the `<title>` equal to the copy title, one `<h1>` in `#boot`; `data-playground` parses to `playground.json`; `data-examples` parses to two examples, `demo` and `broken` (the fallback of requirement 2.5: no `which-licence` or `which-bin` in this workspace), `defaultExample` `demo`, the broken table equal to the file, the broken example's `copy` equal to `demo`'s; and the `demo` theme has 13 light and 8 dark entries.
- `parseTheme` on `apps/which-bin/theme.css`: `light['--radius']` is `1.25rem`, 13 light and 8 dark keys.
- `validatePlayground`: the real file gives no problem; two rows give the expected message: a missing label (`editor.reset: missing`) and `results.passes` without `{rules}`.
- The existing `shell.css` contract check also reads `playground.css`.
- `validateLanding` accepts the real file and rejects one without `playground`.

### End-to-end tests (`e2e/playground.spec.ts`)

The tests read words from `skeleton/playground/playground.json` and the apps' files and use `fill` from `skeleton/shell/dom.ts` to build expected text. Expected counts come from running `check` (engine) on the table the test builds.

(a) **From the landing page: remove a rule, then Reset.** Open the landing page (`./`). Check: the link whose text is `landing.json` `playground.title` is visible after the app links; follow it (click) and expect the URL to end in `/playground/`. Check: the `h1` is the copy title; the textarea (found by its label) holds `formatTable` of the Which licence? table; the status text is the passing line; the preview shows the first question of the app; the preview's computed `--bg` (trimmed) equals the first `--bg` declaration of `apps/which-licence/theme.css` and differs from the page's `body` computed background (the CSSOM theme works under the CSP). Click Remove for the rule `permissive-nothing`. Wait for the status to start with the `fails` prefix. Check: it contains the engine's gap count for the table without that rule; the first gap example text is visible (`condition=value, …` from the engine's report); the notice heading is visible; the app's first question is not in the page; the textarea no longer contains the rule's id. Press Reset. Check: the passing line is back, the notice is gone, the app's first question is visible again. Answer the first question with a click inside the preview and check that `page.url()` is unchanged.

(b) **Invalid JSON and markup as text.** Type a table with a rule id `</textarea><img src=x onerror=window.__pwned=1>` and an unknown outcome. Check: a structural error line containing the string as text; no `img` element in the page; `window.__pwned` is `undefined`. Replace the text with a three-line text whose second line ends in `}` after a colon. Check: the status starts with the `fails` prefix and the `reasonSyntax` text with the right line and column; the detail section shows the `syntaxDetail` line with the reason; the textarea has `aria-invalid="true"`; the frame shows the notice.

(c), (d) **axe, light and dark.** For each scheme (`emulateMedia`, reduced motion on, as in `a11y.spec.ts`): at 1280 by 800 and at 390 by 844, scan axe on the passing state and on the failing state (Remove clicked), expect no violation; at 390 px also expect `document.documentElement.scrollWidth <= clientWidth` in both states.

## Correctness properties

Property 13: for all passing small tables (`arbPassingTable`) and all rule positions `i`, let `T'` be the table read back from `removeRule(formatTable(T), i)`. Then `analyse` of that text is `checked`; `T'` is `T` without its rule `i` (every other key and rule equal); `report.conflicts` is empty; `report.gaps.count` equals the number of combinations that rule `i` of `T` matches and no other rule of `T` matches; `report.passed` is true exactly when that number is 0; and every gap example is matched by rule `i` of `T` and by no rule of `T'`. Validates: 3.7, 4.1, 4.6, 4.7
The test is named `Property 13 removing a rule exposes exactly the combinations only it covered`, runs 200 cases, and uses the oracle in `test/props/oracle.ts` (`matches`, `enumerate`) written from the definitions, not the engine. It checks what the demo promises (delete one rule from a passing table and the checker finds the hole where that rule was, and nothing else), through the playground's own text path (`formatTable`, `removeRule`, `analyse`). It does not repeat Properties 1 to 4 (those compare `check` with brute force on arbitrary tables; this one is about tables made by removal).

## Traceability of the example-only and command-only criteria

| Criterion | Checked by |
| --- | --- |
| 1.1 to 1.8 | task 1 (existing end-to-end suite unchanged, typecheck, greps); 1.3 to 1.5 and 1.7 also by e2e (a) (URL unchanged, one app after remount) |
| 2.1 to 2.8, 2.10 | `test/build.test.ts` |
| 2.9 | e2e (a) (the link is visible and leads to the playground); the unchanged `landing.spec.ts` (exactly one link per app in lists) |
| 3.1 to 3.6, 3.9 | unit tests (`listRules`, `formatTable`), e2e (a) |
| 3.7 | Property 13; unit tests of `removeRule` |
| 3.8, 3.10 | e2e (a), (b) (wait on the status text, not on time) |
| 3.11 | grep in task 6 |
| 4.1 to 4.3, 4.6 to 4.8 | unit tests (summary rows), e2e (a) |
| 4.4 | unit tests (position rows, agreement list), e2e (b) |
| 4.5 | unit test (structure row), e2e (b) |
| 4.9 | by construction (`if (status.textContent !== line)`); the axe tests do not read it. Not tested; see open questions |
| 4.10 | pure functions; Property 13 |
| 5.1 to 5.3, 5.7 | e2e (a) |
| 5.4 | e2e (a) |
| 5.5 | e2e (a) (computed `--bg`), axe in dark |
| 5.6 | not tested (needs a screen reader); by construction |
| 6.1 to 6.5, 6.7 | e2e (c), (d); `getByRole`/label lookups in (a) and (b) |
| 6.6 | e2e (c), (d) |
| 6.8 | the `build.test.ts` contract check |
| 7.1, 7.3 | greps in task 6 |
| 7.2 | e2e (b) |
| 7.4 | by construction; e2e looks words up from the copy |
| 8.x, 9.x | task 6 |

## Points the owner may want to change (open questions)

1. **"No editor UI" (Departure 1).** Narrow the sentence in `product.md` and the brief, or drop the playground.
2. **The broken demo in the playground page (Departure 2).** The only way to offer it is to carry it in a data block. Alternative: let the visitor load only the two apps and break them with Remove (no `examples/` exception).
3. **`headingOffset`.** It adds one option and five CSS selector changes to the shell to keep one `h1` on the page. The cheaper alternative is to mount the preview with offset 0 (a second `h1` inside a section). axe does not fail on two `h1`s; a screen-reader user would see the app's title at the same level as the page's.
4. **Preview type size.** `--font-size` of the loaded example does not reach `rem` units, so Which bin? looks smaller in the preview than on its own page. Fix would be a shell change (size in `em` from a container) outside this spec.
5. **Removing a rule reformats the whole text** (two-space JSON). Splicing the text to remove only that rule's lines would keep a visitor's formatting, at the cost of a position-aware JSON scanner in the editing path.
6. **Answers in the preview reset when the table changes.** Whitespace-only edits keep them. Keeping answers across real edits would need a way to re-apply steps that may no longer be valid.
7. **"Would not build" is the table's rule only.** `npm run build` also checks the folder name against the table `id`, that source URLs start with `http(s)://`, and the app's `copy.json` and `theme.css`. The playground edits a table, so it checks the table's structure, gaps and conflicts. A table that passes here can still fail the build for those other reasons.
8. **At most 5 gap examples (the owner's number), 5 conflicts and 10 structural errors are shown** (the last two numbers are mine).
9. **The live-region rule (4.9) is not tested** by a browser test. A test would have to count mutations of the status element. The code writes only when the text changes.
10. **Large tables.** A pasted table near the 100,000-combination cap runs `check` on the main thread on every pause. Not measured.
11. **Bundle size.** The playground bundle holds the engine and the shell; the page also carries the three tables (about 50 KB of JSON). Fine for a static page; not measured.
