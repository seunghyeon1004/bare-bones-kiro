# Design: shell-and-cli

## Overview

Four consumers of the engine, none of which import each other:

- **shell** (`skeleton/shell/`): browser code. `shell.ts` is the app page, `landing.ts` the landing page. Both are bundled by esbuild at build time.
- **build** (`skeleton/build/`): checks every app, renders the HTML, bundles the shell, writes `dist/`.
- **cli** (`skeleton/cli/bones.ts`): `check` and `new`.
- **mcp** (`skeleton/mcp/server.ts`): stdio tools `check_table` and `evaluate`.

The engine API used is the one in `.kiro/specs/engine/design.md`: `validate`, `check`, `decide`, `evaluate`, and the types `Table`, `Answers`, `DecideResult`, `CheckReport`, `Problem`. A table is accepted when `validate` is ok and `check(...).passed` is true. Everything here calls both, as the engine design says.

Because the shell and the build may not import each other, two things are shared by agreement and not by import:

1. **The report text.** `skeleton/engine/format.ts` (pure, engine imports only) exports `formatProblems`, `formatReport` and `formatInvalidJson`. The CLI prints their output; the build calls them in process and prints the same text under a heading. The build does not spawn the CLI. (Owner answer 1.)
2. **The `Copy` type.** Defined once in `skeleton/shell/copy-type.ts`. `skeleton/build/copy-check.ts` does `import type { Copy }` from it; that is the only import from `shell` that `build` may have, and it must be a type import. (Owner answer 1.)

## Departures from steering

1. `@types/node` is added, pinned to 22.20.5 (`npm view @types/node@22 version` on 2026-11-12 listed 22.20.5 last). **The owner adds it to `tech.md`'s table.** `esbuild`, `@modelcontextprotocol/sdk` and `zod` are already in the table; they are installed here.
2. The script `mcp` is not in `tech.md`'s script table. The owner adds it.
3. `tsconfig.json` gains `"DOM"` in `lib` and `"node"` in `types` (the engine design said later specs would). Consequence: the engine could type-check against DOM or Node globals by mistake. Engine purity stays enforced by the import grep in the engine spec's last task and by Property 10, not by the type system.
4. `labels` has 19 keys. The owner's list gave 15; `published`, `outcome`, `yourAnswers` and (owner answer 2) `noscript` are added because the result shows a published date, the whole-table view has an outcome column and the steps list needs a heading. Without them a visible word would be hard-coded. Three labels contain placeholders: `{n}` and `{max}` in `questionOf`, `{count}` in `badLink`.
5. `bones new` sets the table's `title` as well as `id` and the copy `title`, so the two titles cannot disagree.
6. The build refuses an app folder whose name differs from the table `id` and an app folder with any file besides the three. This enforces `product.md` ("exactly `table.json`, `copy.json`, `theme.css`") and `structure.md` ("app folder name = app id").
7. A `<meta http-equiv="Content-Security-Policy">` in every page and a rule that only `http(s)` URLs become links (the engine accepts any string for `source.url`, so `javascript:` would otherwise be a working link). Neither was asked for; both follow from "a table cannot inject markup".
8. `scripts/time-decide.ts` is a measurement helper (requirement 16), placed in `scripts/` as a Kiro helper, not product code.
9. Property 11 has no `copy` input: the hash does not depend on copy.
10. The `new`-then-build check from the CLI tests list lives in `test/build.test.ts`, because it needs the build.
11. No browser or DOM tests (as instructed). The DOM code in `shell.ts` and `landing.ts` is covered here by the typecheck, the build bundling it, and greps. Its behaviour is checked by the `apps` spec's Playwright tests.

## Files

```
package.json                  + esbuild, @modelcontextprotocol/sdk, zod, @types/node; scripts build, bones, mcp
tsconfig.json                 lib + "DOM"; types ["node"]
skeleton/shell/
  page.html                   HTML template (one marker for the data blocks)
  shell.ts                    app page: reads data blocks, renders, handles events
  landing.ts                  landing page
  dom.ts                      el(), text(), fill(), safeHref()
  hash.ts                     Step, writeHash, readHash (pure, no DOM)
  copy-type.ts                Copy, Landing, AppSummary interfaces (types only; build imports them as types)
  shell.css                   layout, uses only var(--contract property)
  neutral-theme.css           built-in theme for the landing page
  landing.json                fixed landing copy
skeleton/engine/format.ts     formatProblems, formatReport, formatInvalidJson (pure; exported from index.ts)
skeleton/build/
  build.ts                    build(opts) and main
  page.ts                     renderPage, escapeJson, escapeHtml, bootApp, bootLanding
  copy-check.ts               validateCopy, validateLanding (Copy type comes from shell/copy-type.ts)
  theme-check.ts              THEME_PROPS, validateTheme
skeleton/cli/bones.ts         run(argv, opts) and main
skeleton/template/            table.json, copy.json, theme.css
skeleton/examples/            gap.table.json, conflict.table.json
skeleton/mcp/server.ts        stdio server
scripts/time-decide.ts        measurement helper
test/cli.test.ts  test/build.test.ts  test/mcp.test.ts
test/props/shell-generators.ts    hostile-text and step-list generators
test/props/shell.props.test.ts    Properties 11 and 12
```

`shell.ts` and `landing.ts` import `../engine/index.ts` (the shell uses `decide`) and sibling shell files only. `hash.ts` imports only the `Table` type.

## Config

- `package.json` `devDependencies` (exact): the engine four, `esbuild` 0.28.2, `@modelcontextprotocol/sdk` 1.32.2, `zod` 4.6.7, `@types/node` 22.20.5. Scripts added: `build`, `bones`, `mcp`. `@playwright/test` and `@axe-core/playwright` wait for the `apps` spec. The SDK's peer range for zod is `^3.25 || ^4.0`, which 4.6.7 satisfies.
- `tsconfig.json`: `lib: ["ES2023", "DOM"]`, `types: ["node"]`; every other flag as in the engine spec. `include` already has `skeleton`, `test`; `scripts/time-decide.ts` is not typechecked (it is not in `include`).

## copy.json

```ts
interface Copy {
  title: string; tagline: string; intro: string;
  answerStyle: 'tiles' | 'list';
  labels: {
    startOver: string; change: string; why: string; rule: string; whatMattered: string;
    source: string; published: string; readOn: string; notAsked: string;
    copyLink: string; linkCopied: string; showTable: string; hideTable: string; any: string;
    outcome: string; yourAnswers: string;
    noscript: string;     // shown in the static page when scripts are off
    questionOf: string;   // must contain {n} and {max}
    badLink: string;      // must contain {count}
  };
  resultLead: string;     // "Put it in"
  footer: { text: string; href?: string }[];
}
```

`validateCopy(input: unknown): string[]` returns problem strings `<path>: <message>` (empty array = valid), in key order of the definition above: `missing`, `must be a string`, `must not be empty`, `must be "tiles" or "list"`, `must contain {n}`, `unknown key`, `must start with https:// or http://`. Unknown keys are errors (a typo such as `hrf` would otherwise silently drop a link). `validateLanding` checks `{ title, tagline, footer }` the same way.

`fill(template, values)` in `dom.ts` replaces each `{name}` once using the given values; it is applied by the shell to `questionOf` and `badLink`.

## theme.css

Contract properties (`THEME_PROPS` in `theme-check.ts`): `--bg --surface --text --muted --accent --accent-text --border --focus` (colours), `--font-body --font-heading` (font stacks, no weight), `--font-size` (base size; `shell.css` sets `html { font-size: var(--font-size) }`), `--radius --space`. Thirteen in all (owner answer 7; `--heading-font` is read as `--font-heading`).

`validateTheme(css: string): string[]`:

1. Remove comments with `/\/\*[\s\S]*?\*\//g`.
2. Reject `url(` and `@import` anywhere.
3. Scan the text character by character with a depth counter (`{` +1, `}` -1; unbalanced braces are an error). The text accumulated before each `{` is that rule's prelude; the text between the braces of a rule with no nested block is its declarations, split on `;`.
4. Each prelude, trimmed with whitespace collapsed, must match `/^(:root|@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\))$/`. This is the one regex check of requirement 3.2. A `:root` at depth 0 is the light rule; a `:root` inside the dark media block is the dark rule; a `:root` anywhere else, or a nested `@media`, is an error. Anything else gives `theme.css: selector "<prelude>" is not allowed`.
5. Each declaration is `name: value` where `name` is a contract property; otherwise `theme.css: <name>: not a contract property`.
6. The light rule must define all 13 properties; the dark rule the 8 colours. A missing one gives `theme.css: <rule>: missing <name>`.

`shell.css` uses `var(--bg)`, `var(--space)` and so on. A test (task 5) reads it and checks every `var(--x)` is a contract property and that no `#`, `rgb(` or `hsl(` colour literal appears. Spacing is `calc(var(--space) * n)`.

## The page template

`skeleton/shell/page.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'">
<title></title>
<link rel="stylesheet" href="theme.css">
<link rel="stylesheet" href="shell.css">
</head>
<body>
<!--bones:boot-->
<!--bones:data-->
<script src="app.js" defer></script>
</body>
</html>
```

`<html lang="en">` is fixed (translations are a non-goal). The title is empty until the script sets `document.title`. At start `shell.ts` and `landing.ts` remove `#boot` before rendering their own `h1`, so there is one `h1` when scripts run (9.1). `page.ts`:

```ts
export function escapeJson(value: unknown): string;   // JSON.stringify + the five replacements
export function escapeHtml(text: string): string;     // & < > " ' to entities
export function bootApp(copy: Copy): string;            // <div id="boot" class="page"><h1>…</h1><p>tagline</p><p>intro</p><noscript><p>…</p></noscript></div>
export function bootLanding(landing: Landing, apps: AppSummary[]): string;  // h1, tagline, ul of links to ./<id>/
export function renderPage(template: string, blocks: Record<string, unknown>, boot: string): string;
```

`renderPage` replaces the `<!--bones:boot-->` marker with `boot` (already escaped by `bootApp` / `bootLanding`) and the data marker with one `<script type="application/json" id="data-<key>">…</script>` per entry, in key order, joined with newlines. Keys must match the id pattern (`table`, `copy`, `landing`, `apps`). It is pure: the template text is an argument.

The app page uses `table` and `copy`; the landing page uses `landing` and `apps`. Both load `app.js` (in `dist/` the landing bundle, in `dist/<name>/` the app bundle).

## Shell (`shell.ts`)

### State and flow

State: `steps: Step[]`, `ignored: number`, `tableOpen: boolean`. Rendering is a function of state:

```
answers  = Object.fromEntries(steps.map(s => [s.condition, s.value]))
result   = decide(table, answers)          // 'error' cannot happen: readHash only keeps valid steps
render(result)  →  steps list, then question or result, then table section, footer
writeAddress()  →  history.replaceState(null, '', location.pathname + location.search + writeHash(steps))
```

Events (all attached with `addEventListener` from `shell.ts`, none inline):

| Event | Effect on state | Then |
| --- | --- | --- |
| value button | `steps.push`, `ignored = 0` | render, focus heading |
| `change` on step i | `steps = steps.slice(0, i)`, `ignored = 0` | render, focus heading |
| start over | `steps = []`, `ignored = 0` | render, focus heading |
| `hashchange` | `({steps, ignored} = readHash(table, location.hash))` | render, focus heading |
| copy link | none | write `linkCopied` to the live region; focus stays on the button |
| table toggle | `tableOpen` flipped | change the button text, `aria-expanded` and `hidden` in place; no re-render |

The first render at page start uses `readHash(table, location.hash)`; it moves focus only when there is at least one step (5.9). `history.replaceState` does not fire `hashchange`, so there is no loop.

Every render replaces the children of one container with `replaceChildren`. The `h1` (header), the live region and the footer are outside it. The whole-table `<table>` is built once on first show and reused.

### Structure of the DOM

```
<header>  h1 = copy.title; p = copy.tagline
<main>
  p.intro                      (only with no steps)
  p.notice                     (only when ignored > 0)
  section[aria-labelledby]     steps: h2 = labels.yourAnswers; ol > li "question: label" + button change
  section.stage                question: p.progress, h2[tabindex=-1], p.help, ul.choices > li > button
                               result:   h2[tabindex=-1], p.detail, p.note*, section.why, section.skipped
  div.actions                  button start over, button copy link (+ read-only input after a failed copy)
  section.table                button toggle; div[hidden][role=region][tabindex=0] > table
<footer>  p per footer entry; link if safeHref
<div role=status aria-live=polite class=vh>   live region
```

The `change` button is `<button>` with the text `labels.change` and a visually hidden span holding the question, so each button has a distinct accessible name without extra words. Choices are `<button type="button">` with a label `span` and, if present, a hint `span`; the class `tiles` or `list` on the `ul` comes from `answerStyle`.

Result heading text is `resultLead + ' ' + outcome.label`.

### Question counter

`{n}` is `steps.length + 1`. `{max}` is `steps.length + result.relevant.length`. This is a true upper bound on the questions that will be asked in total, because relevance only shrinks as answers are added: a condition is irrelevant when the outcome is constant along every line in that condition's direction inside the consistent set; fixing another answer keeps only a subset of those lines, which are constant too. So a condition that is irrelevant now stays irrelevant, and at most the currently relevant ones can still be asked.

### hash.ts

```ts
export interface Step { condition: string; value: string }
export function writeHash(steps: readonly Step[]): string;
export function readHash(table: Table, hash: string): { steps: Step[]; ignored: number };
```

`writeHash`: `''` for no steps, else `'#' + steps.map(s => s.condition + '=' + s.value).join('&')`. Ids are kebab-case, so nothing needs encoding.

`readHash`: drop one leading `#`; an empty body gives `{ steps: [], ignored: 0 }`. Split on `&`. For each part: it must have exactly one `=` with non-empty sides; the condition must be in a `Map` built from `table.conditions`; the value must be in that condition's `Map`; the condition must not already be taken. Otherwise `ignored += 1`. No `decodeURIComponent`, so a `%` makes the id unknown (ignored) and nothing can throw. Lookups use `Map`, never object keys, so `__proto__` and `constructor` are unknown.

### Links

`safeHref(url): string | undefined` returns `url` if it matches `/^https?:\/\//i`, else `undefined`. Callers create `<a href rel="noopener noreferrer">` only when defined; otherwise a text node.

### Copy link

`navigator.clipboard?.writeText(location.href)` in a `try`; on success the live region gets `linkCopied`. On a missing API or a rejection, a read-only `<input type="text" aria-label=labels.copyLink>` with the URL is added after the button and its text selected.

## CSS (`shell.css`)

Written against the contract properties only.

- Base: `body { background: var(--bg); color: var(--text); font-family: var(--font-body); margin: 0 }`, headings use `var(--font-heading)`. A centred column `max-width: 40rem` with `padding: calc(var(--space) * 2)` and `overflow-wrap: anywhere` so long ids never force sideways scroll.
- Buttons: `min-height: 44px; min-width: 44px`, `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius)`; primary choices use `--accent` / `--accent-text` on hover and focus-visible.
- `.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr)); gap: var(--space) }`: two columns at 360 px, one on narrower. `.list { display: flex; flex-direction: column; gap: var(--space) }`, text left-aligned, hint under label.
- `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }`, also on the focus-moved `h2`.
- `.vh` visually-hidden utility. `[hidden] { display: none }`.
- Table region: `overflow-x: auto`; the page body has no overflow.
- `@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; scroll-behavior: auto !important } }`. The base styles use no animation, only `transition` on colours.

Contrast is the theme author's job; axe checks it in the `apps` spec.

## Landing (`landing.ts`)

Reads `data-landing` and `data-apps`, sets `document.title`, renders `h1`, tagline, `ul > li > a[href="<id>/"]` (text = app title) with the tagline below, and the footer. Uses `dom.ts` only; no engine import. `landing.json`:

```json
{
  "title": "Bare Bones",
  "tagline": "Small decision tools, each one a table that has been checked for gaps and conflicts.",
  "footer": [{ "text": "Source and checks: Bare Bones" }]
}
```

(The exact wording is the task's to settle; the shape is fixed.) `neutral-theme.css` defines the 13 properties with a light and a dark block, to pass `validateTheme`.

## Build (`build.ts`)

```ts
export interface BuildOptions { appsDir: string; outDir: string; repoRoot: string }
export type BuildResult = { ok: true; apps: string[] } | { ok: false; errors: string[] };
export async function build(opts: BuildOptions): Promise<BuildResult>;
```

`main` (run only when the file is the entry point, so tests can import `build`) calls `build` with `repoRoot/apps`, `repoRoot/dist`, prints `errors` joined by newlines to stderr and sets `process.exitCode = 1`, or prints `built <n> apps into dist/` and exits 0.

Steps, in order. Steps 1 to 4 only collect `errors`; nothing is written until step 5.

1. List the directories in `appsDir`, sorted with plain `<`. Ignore names starting with `.`. None → `no apps found in <dir>`.
2. For each app: list its files. Anything other than the three → `<dir>: unexpected file <name>` / `missing <name>`. Name must match the id pattern.
3. Parse `table.json` and `copy.json` (a syntax error is `<file>: invalid JSON: <message>`). `table.id` must equal the folder name. Run `validate` from the engine for the typed table and the `sources[].url` scheme check. Then `check(table)` in process; if it does not pass, add `== <path>/table.json ==` and `formatReport(report)` (the text `bones check` prints, ending `failed`) to the errors. A structurally invalid table gets `formatProblems(problems)` instead, and bad JSON `formatInvalidJson(message)`. Run `validateCopy` and `validateTheme`.
4. `validateLanding(landing.json)` and `validateTheme(neutral-theme.css)`.
5. If `errors` is not empty return `{ ok: false, errors }`. Otherwise check the output-directory guard (11.9: the resolved `outDir` must not equal `repoRoot` and must not be a parent of `appsDir`), `rm -rf outDir`, `mkdir`.
6. Bundle both entry points once with `esbuild.build({ entryPoints, bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true, write: false, legalComments: 'none' })`. `shell.ts` imports the engine, so the engine is bundled in.
7. Write `dist/index.html` (landing: `renderPage(template, { landing, apps }, bootLanding(landing, apps))`) and for each app (`renderPage(template, { table, copy }, bootApp(copy))`) `dist/<name>/{index.html, app.js, shell.css, theme.css}`. `theme.css` is the app's own file; `shell.css` is the shell's. The landing gets the neutral theme as `dist/theme.css`.

Relative paths: the page template only contains `theme.css`, `shell.css`, `app.js`. The landing links to `<id>/` at runtime. Nothing in `dist/` is absolute. `skeleton/examples/` and `skeleton/template/` are never listed, because the only input directory is `appsDir`.

The build spawns no process. It imports from `shell` only `import type { Copy, Landing, AppSummary }` (a type import is erased, so no shell code enters the build); it reads `page.html`, `shell.css`, `neutral-theme.css`, `landing.json` and the two entry points as files.

## CLI (`bones.ts`)

```ts
export interface RunResult { code: 0 | 1 | 2; out: string; err: string }
export function run(argv: string[], opts: { cwd: string }): RunResult;
```

`main` calls `run(process.argv.slice(2), { cwd: process.cwd() })`, writes `out` to stdout and `err` to stderr and sets `process.exitCode`. Tests call `run` in-process; one test spawns the real process.

### check

```
$ bones check skeleton/examples/gap.table.json
gaps: 1
  size=large, wet=yes
failed
```

The text comes from the engine's `format.ts`: `formatInvalidJson(message)`, `formatProblems(problems)`, `formatReport(report)`; the CLI only reads the file and sets the exit code. Order: JSON syntax → `$: invalid JSON: <message>` then `failed` (exit 1). `validate` problems → one `path: message` each, `failed` (exit 1). Otherwise `gaps: N`, example lines (two spaces; `, ` between pairs), `  (first 20 shown)` when `count > examples.length`, conflict lines, `warning: <path>: <message>` lines, and the last line `ok: C conditions, K combinations, R rules` (exit 0) or `failed` (exit 1). Condition order inside an example is the table's order, which the engine's combination object keeps.

Usage errors (code 2, stderr only, stdout empty): no command, unknown command, `check` without a file, `new` without a name, unknown option, unreadable file. The usage text is the single line `usage: bones check <table.json> | bones new <name> [--apps <dir>]`. `help` and `--help` print it on stdout with code 0.

### new

`bones new <name> [--apps <dir>]`:

1. `name` must match `^[a-z0-9]+(-[a-z0-9]+)*$` (the same pattern as the engine's ids; the engine does not export it, so it is repeated here and in the build).
2. Target is `<apps>/<name>`, where `<apps>` is `--apps` or `<cwd>/apps`. If it exists → code 2, nothing written.
3. Read the three template files from the template folder (found relative to `import.meta.url`), set `table.id = name`, `table.title = copy.title = Title(name)`, write JSON with `JSON.stringify(x, null, 2) + '\n'`, copy `theme.css` byte for byte. `Title('my-tool')` is `My tool`.
4. Print `created <apps>/<name>` where `<apps>` is as given or `apps`.

## Template and examples

`skeleton/template/table.json`:

```json
{
  "id": "template",
  "title": "Which tray?",
  "conditions": [
    { "id": "size", "question": "How big is it?",
      "values": [ { "id": "small", "label": "Small" },
                  { "id": "large", "label": "Large", "hint": "Bigger than a shoebox" } ] },
    { "id": "wet", "question": "Is it wet?",
      "values": [ { "id": "no", "label": "No" }, { "id": "yes", "label": "Yes" } ] }
  ],
  "outcomes": [
    { "id": "tray-a", "label": "Tray A", "detail": "Use tray A." },
    { "id": "tray-b", "label": "Tray B", "detail": "Use tray B." },
    { "id": "tray-c", "label": "Tray C", "detail": "Use tray C." }
  ],
  "rules": [
    { "id": "small-dry", "when": { "size": "small", "wet": "no"  }, "then": "tray-a", "source": { "ref": "example-source", "at": "row 1" } },
    { "id": "small-wet", "when": { "size": "small", "wet": "yes" }, "then": "tray-b", "source": { "ref": "example-source", "at": "row 2" } },
    { "id": "large-dry", "when": { "size": "large", "wet": "no"  }, "then": "tray-c", "source": { "ref": "example-source", "at": "row 3" } },
    { "id": "large-wet", "when": { "size": "large", "wet": "yes" }, "then": "tray-b", "note": "Wet things go in tray B whatever their size.", "source": { "ref": "example-source", "at": "row 4" } }
  ],
  "sources": [ { "id": "example-source", "title": "Example source", "url": "https://example.com/", "published": "unknown", "read": "2026-11-12" } ]
}
```

`bones check` prints `gaps: 0` then `ok: 2 conditions, 4 combinations, 4 rules`. `template/copy.json` has plain placeholder wording for every key; `template/theme.css` defines the 13 properties in `:root` and the 8 colours in the dark block with AA-contrast values.

`skeleton/examples/gap.table.json`: the template table with `id` `gap-example`, `title` `Gap example` and the rule `large-wet` removed. One gap: `size=large, wet=yes`. `tray-b` is still used by `small-wet`, so there is no warning.

`skeleton/examples/conflict.table.json`: `id` `conflict-example`, same conditions, outcomes and sources, and three rules: `small` (`{ "size": "small" }` → `tray-a`), `wet` (`{ "wet": "yes" }` → `tray-b`), `large-dry` (`{ "size": "large", "wet": "no" }` → `tray-c`). One conflict, `small` vs `wet`, example `size=small, wet=yes`; no gap.

## MCP server (`server.ts`)

`McpServer` and `StdioServerTransport` from `@modelcontextprotocol/sdk` (`server/mcp.js`, `server/stdio.js`), tools registered with `registerTool(name, { description, inputSchema, annotations: { readOnlyHint: true } }, handler)`. If the 1.32.2 API differs from this, adapt the call and note it in the task report. The server never writes to stdout; diagnostics go to stderr.

```ts
check_table: inputSchema { path: z.string().optional(), table: z.unknown().optional() }
evaluate:    inputSchema { path: z.string(), answers: z.record(z.string(), z.string()) }
```

Both return `{ content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError? }`.

- `check_table`: exactly one of `path`, `table` (else `isError`). `validate`; not ok → `{ valid: false, problems }`; ok → `{ valid: true, report: check(table) }`. A table that fails the check is a normal answer, not an error result.
- `evaluate`: `validate`, then `check`; if either fails → `isError: true` with `{ valid, passed: false, problems | gaps: count, conflicts: count }`. Otherwise `decide(table, answers)` as JSON (decided, open or error status).

Path guard (`readRepoJson(repoRoot, p)`): `repoRoot` is two levels above `server.ts`, not the cwd.
1. `abs = path.resolve(repoRoot, p)`. If `path.relative(repoRoot, abs)` starts with `..` or is absolute → `path is outside the repository`. This lexical check runs first so a probe cannot learn whether a file outside the repo exists.
2. `real = fs.realpath(abs)` (failure → `file does not exist`), then the same relative check against `realpath(repoRoot)` (catches symbolic links out of the repo).
3. Extension must be `.json`; `stat` must be a regular file of at most 1,000,000 bytes.
4. Read and `JSON.parse`; a syntax error gives `invalid JSON: <engine message>`, never the file content.

## Decide cost (requirement 16)

The engine design left this to this spec. `scripts/time-decide.ts` builds the table in code: five conditions `c0` to `c4` of ten values (100,000 combinations); 200 rules, each naming all five conditions: 100 rules for the cells `(c0 = vi, c1 = vj)` with `c2`, `c3`, `c4` given as the full list of ten values, outcome `o((i + j) % 4)`, then the same 100 again with the same outcomes (agreeing overlaps). `decide` scans every candidate rule for every consistent combination, so the duplicates are the worst case. The script runs `validate` and `check` (exits 1 if the table does not pass), times `decide(table, {})` five times with `performance.now()`, prints `decide median ms: <n>` and exits 1 if the median is over 1,000. The page calls `decide` at most once per click, and each answer divides the next call's work by the value count of the answered condition. The two planned apps are about three orders of magnitude smaller. If the script fails, the answer is the owner's (engine change or a lower cap), not a cache here.

## Testing

**Example tests** (vitest, `environment: node`):

- `test/cli.test.ts` (in-process `run`, plus one spawn):
  - `check` on the gap example: code 1, `out` equals `gaps: 1\n  size=large, wet=yes\nfailed\n`. On the conflict example: code 1, `out` equals `gaps: 0\nconflict: small -> tray-a vs wet -> tray-b, e.g. size=small, wet=yes\nfailed\n`. On the template: code 0, `out` equals `gaps: 0\nok: 2 conditions, 4 combinations, 4 rules\n`.
  - Usage errors: four rows (no command, unknown command, `check` with no file, missing file) → code 2, empty `out`, non-empty `err`.
  - A structurally invalid table (a temp file with an unknown outcome in a rule) prints `rules[0].then: …` and `failed`, code 1.
  - `new` into a temp apps directory: the folder holds exactly three files; `table.json` has `id` equal to the name; `copy.json` title is the capitalised name. `new` again with the same name → code 2, folder unchanged. `new Bad_Name` → code 2, nothing created.
  - One `spawnSync` of the real entry point on the gap example: `status` is 1 (covers `main` and the exit code wiring).
- `test/build.test.ts` (timeout 30 s per test; each makes a temp `apps/` and `dist/` and calls `build`):
  - Builds an app made by `run(['new', 'demo', '--apps', tmp])` (this is requirement 13.3): `ok: true`; `dist` holds exactly the 8 files of 11.7; every `href`/`src` in the generated HTML is relative; the `data-table` block parses to the table; no `template` or `examples` entry in `dist`.
  - Rejects a table with a gap (the `large-wet` rule deleted): `ok: false`, an error contains `gaps: 1`, and a sentinel file pre-placed in `outDir` is still there.
  - Rejects a `theme.css` with a selector (`body { color: red }` appended): error contains `selector "body" is not allowed`.
  - Table-driven rejections, one row each: a missing label (`labels.change: missing`); `answerStyle: "grid"`; a footer `href` of `javascript:alert(1)`; a source `url` of `javascript:alert(1)`; an extra file in the app folder; a folder name different from the table id; an empty `apps/` (`no apps found`); an `outDir` equal to the repo root (refused, nothing removed).
  - Contract checks: every `var(--x)` in `shell.css` is a contract property and it has no colour literal; `neutral-theme.css` and `landing.json` pass their validators; `build/` has no value import from `shell` (the task 8 grep covers it).
- `test/mcp.test.ts`: one test. Starts the server with the SDK's `Client` and `StdioClientTransport` (command `process.execPath`, args `--import tsx skeleton/mcp/server.ts`, cwd the repo root), then: `check_table` with `path: 'skeleton/examples/gap.table.json'` returns `valid: true` and `report.gaps.count` 1 and `passed` false; `check_table` with inline `table` and a bad rule returns `valid: false` with a problem path; `evaluate` on `skeleton/template/table.json` with `{ wet: 'yes' }` returns `status: 'decided'`, outcome `tray-b`, `skipped` listing `size`; `check_table` with `path: '../outside.json'` has `isError: true`. Closes the client in `finally`.

**Generators** (`test/props/shell-generators.ts`; the engine's `generators.ts` is imported, not changed):

- `arbHostileText`: `fc.oneof` of arbitrary strings and fixed nasty ones: `</script><script>alert(1)</script>`, `<!--`, `-->`, `&amp;`, `<img src=x onerror=alert(1)>`, U+2028, U+2029, `"`, `\`.
- `arbHostileTable`: `arbTable` from the engine generators with every free-text field replaced by `arbHostileText` (table `title`, condition `question`/`help`, value `label`/`hint`, outcome `label`/`detail`, rule `note`, source `title`/`url`/`published`/`read`/`at`). Ids are left alone: they are kebab-case by validation.
- `arbHostileCopy`: a `Copy` with `arbHostileText` in every string field.
- `arbSteps(table)`: a random subset of the conditions in random order, each with a random value of that condition.

Each property runs 200 cases and is named `Property N <name>`.

## Correctness properties

The engine spec owns Properties 1 to 10 (I1 to I10). These continue the numbering.

Property 11: for all tables from `arbTable` and all step lists from `arbSteps`, `readHash(table, writeHash(steps))` equals `{ steps, ignored: 0 }` (same steps, same order), and `writeHash(steps)` matches `^(#[a-z0-9-]+=[a-z0-9-]+(&[a-z0-9-]+=[a-z0-9-]+)*)?$`. Validates: 7.1, 7.3

Property 12: for all tables from `arbHostileTable` and copies from `arbHostileCopy`, with `html = renderPage(template, { table, copy }, bootApp(copy))` and the template read from `skeleton/shell/page.html`: (a) `html` has exactly three `<script` and three `</script>`; (b) the body of each data block contains none of `<`, `>`, `&`, U+2028, U+2029; (c) `JSON.parse` of each body deep-equals the input; (d) `html` with the two data bodies and the `#boot` block removed equals the same removal applied to `renderPage(template, { table: null, copy: null }, bootApp(emptyCopy))`, so the HTML around them does not depend on the input; (e) the `#boot` block matches exactly `<div id="boot" class="page"><h1>T</h1><p>G</p><p>I</p><noscript><p>N</p></noscript></div>` with `T`, `G`, `I`, `N` free of `<`, and each, with the five entities decoded, equals `copy.title`, `tagline`, `intro`, `labels.noscript`. Validates: 4.2, 4.3

Property 12 is a statement about the HTML text (the table-derived text never reaches the HTML except in the data blocks). It does not run a browser; the DOM side of "no injection" (text nodes only) is enforced by the grep in the final task (4.6) and by the `apps` spec's e2e.

## Traceability of the example-only and command-only criteria

| Criterion | Checked by |
| --- | --- |
| 1.1, 1.2 | task 1 command |
| 1.3 | `npm run typecheck`, every task |
| 1.4 | grep in task 8 |
| 2.1 to 2.6 | the table-driven rows in `test/build.test.ts` (missing label, bad `answerStyle`, bad `href`) and the template passing the build |
| 2.7 | by construction (shell reads only the two blocks); e2e in the `apps` spec |
| 3.1 to 3.4 | theme selector test, `neutral-theme.css` and template passing |
| 3.5 | contract check in `test/build.test.ts` |
| 4.1, 4.2, 4.3 | first build test; Property 12 |
| 4.4, 4.5, 4.6 | greps in task 8 |
| 4.7, 5.x to 9.x | DOM behaviour: not tested in this spec; `apps` spec (Playwright + axe). `readHash` and `writeHash` (7.1, 7.3): Property 11. 5.5: the proof above |
| 10.x | first build test (files, relative links), `landing.json` check; rendering in `apps` e2e |
| 11.1, 11.3 to 11.8 | the build tests (11.1 by the "no `template` or `examples` entry" assertion) |
| 11.2, 11.9 | the two rows added to the table-driven list (empty `apps/`; `outDir` equal to the repo root) |
| 12.x, 13.x, 14.x | `test/cli.test.ts` |
| 15.x | `test/mcp.test.ts` (15.6 by grep that `zod` is imported only in `skeleton/mcp`) |
| 16.x | `scripts/time-decide.ts` |

## Points the owner may want to change

- **Dependency direction.** Settled by owner answer 1: shared formatter in the engine, `import type` of `Copy` from `shell` into `build`. `structure.md` says `build` does not import `shell`; the owner is to add this exception there.
- **Required dark block.** `theme.css` must define the dark colours. The brief says "colours for light and dark", so I made it a requirement; a light-only theme would be a one-line relaxation.
- **Contrast is not checked at build.** A pure function over the eight colours would be cheap. Left to axe in the `apps` spec.
- **No JS.** Settled by owner answer 2: a static `#boot` block with title, tagline, intro and `labels.noscript`.
- **The whole-table region scrolls inside itself.** At 360 px the table is wider than the screen; the page does not scroll sideways, the table region does and takes keyboard focus.
- **`read on` as a date label.** I took "read on" in the owner's label list to mean "Read on <date>" for the source's `read` date and added `published` beside it.
- **Invalid JSON exits 1, not 2.** A file that parses badly is a table that does not pass; 2 is kept for usage errors.
- **Tiles show hints too.** The brief only says the list style puts the hint under the label.
- **Content-Security-Policy.** Added as defence in depth; it also forbids `style` attributes, so the shell styles only with classes.
- **No DOM tests here.** A DOM implementation (jsdom or happy-dom) would let the shell's event wiring be tested in vitest, but it is a new package and needs the owner's say-so.
