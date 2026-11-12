# Requirements: shell-and-cli

Scope: the page shell (`skeleton/shell/`), the build (`skeleton/build/`), the CLI (`skeleton/cli/`), the template and examples (`skeleton/template/`, `skeleton/examples/`), the MCP server (`skeleton/mcp/`), the `copy.json` and `theme.css` formats, and the extra devDependencies, scripts and tsconfig settings they need. Source of truth for behaviour: `docs/product-brief.md`, `.kiro/steering/*.md`, and the engine spec (`.kiro/specs/engine/`), whose `design.md` is the API used here.

Out of scope: any file under `apps/` (the `apps` spec), Playwright and axe tests (the `apps` spec), the GitHub Pages workflow (the `apps` spec), changes to `skeleton/engine/`.

## Terms

- **App folder**: `apps/<name>/`. It holds `table.json`, `copy.json` and `theme.css` and nothing else.
- **Step**: one answer given by the user, `{ condition, value }`. The page keeps an ordered list of steps. The engine's `Answers` object is built from it.
- **Hash**: the URL fragment that stores the steps, `#condition=value&condition=value`, in the order the steps were given.
- **Ignored entry**: a hash entry that is not a pair, names a condition or value not in the table, or repeats a condition already taken.
- **Contract properties**: the thirteen CSS custom properties of requirement 3.
- **Data block**: a `<script type="application/json">` element holding JSON the page reads at start.

## Requirement 1: Repo tooling

**User story:** As the owner, I want the same pinned setup as the engine spec, with only the packages this spec needs.

1.1 WHEN `package.json` is read THE SYSTEM SHALL contain no `dependencies` key and `devDependencies` of exactly the four engine-spec packages plus `esbuild` 0.28.2, `@modelcontextprotocol/sdk` 1.32.2, `zod` 4.6.7 and `@types/node` 22.20.5, each an exact version with no `^` or `~`.

1.2 WHEN `package.json` is read THE SYSTEM SHALL define the scripts `typecheck`, `test`, `test:props` (unchanged), `build` (`tsx skeleton/build/build.ts`), `bones` (`tsx skeleton/cli/bones.ts`) and `mcp` (`tsx skeleton/mcp/server.ts`), and SHALL NOT define `test:e2e`.

1.3 WHEN `npm run typecheck` runs THE SYSTEM SHALL pass with `strict: true` and the engine spec's other flags unchanged, with the `DOM` lib and the `node` types added.

1.4 WHERE a file is in `skeleton/shell/`, `skeleton/build/`, `skeleton/cli/` or `skeleton/mcp/` THE SYSTEM SHALL import from the engine only through `skeleton/engine/index.ts` and from no other of those four folders. Packages are allowed only in `build` (`esbuild`) and `mcp` (`@modelcontextprotocol/sdk`, `zod`); Node built-ins only in `build`, `cli` and `mcp`. The one exception to the folder rule: `build` may `import type` the `Copy` type from `skeleton/shell/copy-type.ts` (no value import from `shell`).

## Requirement 2: copy.json format

**User story:** As an app author, I want one fixed list of words to fill in so that nothing on the page is hard-coded.

2.1 THE SYSTEM SHALL define `copy.json` as an object with exactly the keys `title`, `tagline`, `intro`, `answerStyle`, `labels`, `resultLead`, `footer`.

2.2 WHEN `copy.json` is validated THE SYSTEM SHALL require `title`, `tagline`, `intro` and `resultLead` to be non-empty strings (after trimming) and `answerStyle` to be `"tiles"` or `"list"`.

2.3 WHEN `copy.json` is validated THE SYSTEM SHALL require `labels` to be an object with exactly these keys, each a non-empty string: `startOver`, `change`, `why`, `rule`, `whatMattered`, `source`, `published`, `readOn`, `notAsked`, `copyLink`, `linkCopied`, `showTable`, `hideTable`, `any`, `outcome`, `yourAnswers`, `noscript`, `questionOf`, `badLink`.

2.4 WHEN `copy.json` is validated THE SYSTEM SHALL require `labels.questionOf` to contain `{n}` and `{max}`, and `labels.badLink` to contain `{count}`.

2.5 WHEN `copy.json` is validated THE SYSTEM SHALL require `footer` to be an array of objects, each with a non-empty string `text` and an optional `href` that starts with `https://` or `http://`.

2.6 IF `copy.json` has a key not listed in 2.1 to 2.5, a missing key or a value of the wrong type THEN THE SYSTEM SHALL report one problem per defect as `<path>: <message>` (for example `labels.change: missing`).

2.7 THE SYSTEM SHALL take every visible word on an app page from `copy.json` or `table.json`, and SHALL write no other text into the page.

## Requirement 3: theme.css contract

**User story:** As an app author, I want a theme file that can restyle colours and fonts and cannot change layout logic.

3.1 THE SYSTEM SHALL define the contract properties as `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--accent-text`, `--border`, `--focus` (colours), `--font-body`, `--font-heading` (font stacks), `--radius`, `--space` (one spacing unit) and `--font-size` (the base font size; `shell.css` sets it as the root font size).

3.2 WHEN `theme.css` is validated (comments removed) THE SYSTEM SHALL accept as a rule prelude only `:root` and `@media (prefers-color-scheme: dark)` (whitespace-insensitive), and SHALL report any other prelude as `theme.css: selector "<text>" is not allowed`.

3.3 WHEN `theme.css` is validated THE SYSTEM SHALL require every declaration to be a custom property whose name is a contract property, and SHALL reject a value containing `url(`.

3.4 WHEN `theme.css` is validated THE SYSTEM SHALL require all thirteen contract properties in the top-level `:root` rule, and the eight colour properties in the `:root` rule inside the dark media block.

3.5 THE SYSTEM SHALL write the shell's own CSS (`shell.css`) using only `var(--<contract property>)` for colour, font, radius and spacing values: no colour literal (`#`, `rgb(`, `hsl(`), no `var()` of another name.

## Requirement 4: Page shell, build output and data

**User story:** As a visitor, I want a static page that works with no server and makes no requests beyond its own files.

4.1 WHEN the build writes an app page THE SYSTEM SHALL write `dist/<name>/index.html` containing the table and `copy.json` as two data blocks (`id="data-table"` and `id="data-copy"`), one `<link rel="stylesheet">` each for `theme.css` and `shell.css`, and one `<script src="app.js" defer>`, all with relative paths.

4.2 WHEN the build writes a data block THE SYSTEM SHALL write `JSON.stringify` of the value with `<`, `>`, `&`, U+2028 and U+2029 replaced by `\u003c`, `\u003e`, `\u0026`, `\u2028`, `\u2029`, so that the block's text contains none of those five characters and parses to the original value.

4.3 THE SYSTEM SHALL write no table text and no copy text into the HTML outside the two data blocks, except one static block `<div id="boot">` holding `copy.title` (as `h1`), `copy.tagline`, `copy.intro` and `copy.labels.noscript`, HTML-escaped, so the page is not blank without JavaScript. The script removes the block at start and renders its own `h1`. The page sets `document.title` from `copy.title` at start.

4.4 THE SYSTEM SHALL include in each page a `<meta http-equiv="Content-Security-Policy">` with `default-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'`, and SHALL use no inline event handler, no inline `<script>` with code, no `style` attribute and no `javascript:` URL in the HTML template or the shell.

4.5 THE SYSTEM SHALL make no network request from the page: no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, dynamic `import()`, and no `url()` or `@import` in CSS.

4.6 THE SYSTEM SHALL build element content only with text nodes (`textContent`, `createTextNode`) and attributes only with `setAttribute`, and SHALL NOT use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` or `new Function`.

4.7 WHEN the page renders a link whose URL comes from the table (`sources[].url`) or `copy.json` (`footer[].href`) THE SYSTEM SHALL create an `<a href>` only if the URL starts with `http://` or `https://`, with `rel="noopener noreferrer"`; any other URL SHALL be shown as plain text.

## Requirement 5: Page, questions and answers

**User story:** As a visitor, I want to answer one clear question at a time and be able to go back.

5.1 WHEN the page starts with no steps THE SYSTEM SHALL show `copy.intro`, then the question `decide(table, {})` returns, or the result if `decide` returns decided.

5.2 WHEN a question is shown THE SYSTEM SHALL show its `question` as an `h2` with `tabindex="-1"`, its `help` if any, and one `<button type="button">` per value, labelled with the value's `label` and, if the value has one, its `hint`.

5.3 WHERE `copy.answerStyle` is `tiles` THE SYSTEM SHALL lay the buttons out as a grid with each button at least 44 by 44 CSS px; WHERE it is `list` THE SYSTEM SHALL lay them out as one vertical column with the hint under the label. The hint SHALL be shown in both styles.

5.4 WHEN the user activates a value button THE SYSTEM SHALL append the step, call `decide` with the answers built from all steps, and show the next question or the result.

5.5 WHEN a question is shown THE SYSTEM SHALL show `labels.questionOf` with `{n}` set to the number of steps plus one and `{max}` set to the number of steps plus the length of `relevant` in the open result.

5.6 WHEN at least one step exists THE SYSTEM SHALL list the steps in the order given under `labels.yourAnswers`, each as `<question>: <value label>` with a button `labels.change`.

5.7 WHEN the user activates `change` on step `i` THE SYSTEM SHALL remove step `i` and every later step and show what `decide` returns for the remaining steps.

5.8 WHEN at least one step exists THE SYSTEM SHALL show a button `labels.startOver`; WHEN it is activated THE SYSTEM SHALL remove all steps and show the first question.

5.9 WHEN the view changes because of a user action, or the page starts with at least one step, THE SYSTEM SHALL move focus to the new question's `h2` or to the result's `h2`. WHEN the page starts with no steps THE SYSTEM SHALL NOT move focus.

5.10 WHEN a new question or result is shown THE SYSTEM SHALL put its text into a live region (`role="status"`, `aria-live="polite"`) that is visually hidden: for a question `labels.questionOf` filled in plus the question text, for a result the result heading text.

## Requirement 6: Page, the result

**User story:** As a visitor, I want the answer and the reason for it.

6.1 WHEN `decide` returns decided THE SYSTEM SHALL show an `h2` with `tabindex="-1"` reading `copy.resultLead`, a space, then the outcome's `label`, followed by the outcome's `detail`.

6.2 WHEN any firing rule has a `note` THE SYSTEM SHALL show each distinct note as a paragraph.

6.3 WHEN the result is shown THE SYSTEM SHALL show a section headed `labels.why` containing: the firing rule ids under `labels.rule`; if `mattered` is not empty, each entry as `<question>: <label>` under `labels.whatMattered`; and for each source in `sources`, under `labels.source`, the title (a link under 4.7), the `at` of each firing rule that cites it, `labels.published` with the `published` text and `labels.readOn` with the `read` text.

6.4 WHEN `skipped` is not empty THE SYSTEM SHALL show the skipped questions' text, as a list headed `labels.notAsked`; WHEN it is empty THE SYSTEM SHALL show no such heading.

6.5 WHEN the result is shown THE SYSTEM SHALL show the steps list, `labels.startOver` and the copy-link control as for a question.

## Requirement 7: Share link

**User story:** As a visitor, I want to send my answers to someone as a link.

7.1 THE SYSTEM SHALL write the hash from the steps with `writeHash(steps)`: `#` followed by `condition=value` pairs joined by `&`, in step order; with no steps the hash is empty.

7.2 WHEN the steps change or the page starts THE SYSTEM SHALL set the address to the page path plus the hash with `history.replaceState`, and SHALL NOT add history entries.

7.3 WHEN the page starts or `hashchange` fires THE SYSTEM SHALL read the hash with `readHash(table, hash)`, which takes each entry in order and keeps it unless it is an ignored entry, and returns the kept steps and the number of ignored entries. The entries are compared as they are, with no percent-decoding.

7.4 WHEN `readHash` ignores at least one entry THE SYSTEM SHALL show `labels.badLink` with `{count}` set to the number of ignored entries, in a visible paragraph and in the live region, until the next user action; and SHALL then rewrite the address with the kept steps only.

7.5 WHEN at least one step exists THE SYSTEM SHALL show a button `labels.copyLink`; WHEN it is activated THE SYSTEM SHALL copy `location.href` with `navigator.clipboard.writeText` and put `labels.linkCopied` in the live region.

7.6 IF copying fails or `navigator.clipboard` is missing THEN THE SYSTEM SHALL show `location.href` in a read-only text input labelled `labels.copyLink` and select its text.

## Requirement 8: The whole table

**User story:** As a visitor, I want to see all the rules the answer came from.

8.1 THE SYSTEM SHALL show a button with `aria-expanded` and `aria-controls`, labelled `labels.showTable` when the table is hidden and `labels.hideTable` when shown; the table starts hidden.

8.2 WHEN shown THE SYSTEM SHALL render a `<table>` with `<caption>` set to the table's `title`, and a header row of `<th scope="col">`: `labels.rule`, one per condition (its `question`), `labels.outcome`, `labels.source`.

8.3 THE SYSTEM SHALL render one body row per rule in table order, with the rule id in a `<th scope="row">`, then for each condition either `labels.any` (not named in `when`) or the named values' labels joined by `, `, then the outcome's `label`, then the source's title and `at`.

8.4 THE SYSTEM SHALL wrap the `<table>` in a keyboard-focusable region (`tabindex="0"`, `role="region"`, `aria-label` set to the table's `title`) that scrolls on its own, so that the page itself does not scroll sideways.

## Requirement 9: Layout and accessibility

**User story:** As a visitor on a phone, with a keyboard or a screen reader, I want a page that works.

9.1 THE SYSTEM SHALL contain exactly one `h1` (`copy.title`) on every page.

9.2 THE SYSTEM SHALL lay out without horizontal page scroll at a viewport width of 360 CSS px.

9.3 THE SYSTEM SHALL give every interactive element a visible focus indicator that uses `var(--focus)`.

9.4 WHERE the visitor prefers reduced motion (`prefers-reduced-motion: reduce`) THE SYSTEM SHALL use no CSS transition or animation.

9.5 THE SYSTEM SHALL set colours only from the contract properties, so that light and dark follow the theme's `prefers-color-scheme` block.

## Requirement 10: Landing page

**User story:** As a visitor, I want one page that lists the apps.

10.1 WHEN the build runs successfully THE SYSTEM SHALL write `dist/index.html` (with a static block `<div id="boot">` holding `landing.title` as `h1`, `landing.tagline` and one link per app) with `app.js`, `shell.css` and `theme.css` beside it, built as in 4.1 to 4.7 with data blocks `data-landing` (`skeleton/shell/landing.json`) and `data-apps` (a list of `{ id, title, tagline }` in folder-name order).

10.2 WHEN the landing page renders THE SYSTEM SHALL show one `h1` (`landing.title`), `landing.tagline`, one list item per app with a link to `./<id>/` whose text is the app's `title` and the app's `tagline`, and `landing.footer` as in 2.5.

10.3 THE SYSTEM SHALL style the landing page with the built-in `skeleton/shell/neutral-theme.css`, which satisfies requirement 3, and the same `shell.css`.

10.4 THE SYSTEM SHALL validate `landing.json` at build time as `title` and `tagline` (non-empty strings) and `footer` (as 2.5).

## Requirement 11: Build

**User story:** As the owner, I want one command that checks everything and writes the site, and writes nothing if anything is wrong.

11.1 WHEN `npm run build` runs THE SYSTEM SHALL process every directory directly under `apps/` in name order, and SHALL NOT read `skeleton/examples/` or `skeleton/template/`.

11.2 IF `apps/` has no app folder THEN THE SYSTEM SHALL fail with `no apps found in <dir>`.

11.3 WHEN an app folder is processed THE SYSTEM SHALL require that it contains exactly `table.json`, `copy.json` and `theme.css`, that the folder name matches the id pattern and equals the table's `id`, and SHALL report each violation as `<dir>: <message>`.

11.4 WHEN an app folder is processed THE SYSTEM SHALL check its `table.json` in process with the engine and the engine's report formatter (the same text `bones check` prints), and IF the table does not pass THEN THE SYSTEM SHALL report that text under the heading `== <path>/table.json ==`. The build does not spawn the CLI.

11.5 WHEN an app folder is processed THE SYSTEM SHALL validate `copy.json` (requirement 2) and `theme.css` (requirement 3), and SHALL reject a table whose `sources[].url` does not start with `http://` or `https://`.

11.6 IF any app, or `landing.json`, or the neutral theme has a problem THEN THE SYSTEM SHALL report all problems of all apps, write nothing to the output directory, and exit with code 1.

11.7 WHEN every check passes THE SYSTEM SHALL remove the output directory, bundle `skeleton/shell/shell.ts` and `skeleton/shell/landing.ts` with esbuild (browser, IIFE, minified), and write exactly: `dist/index.html`, `dist/app.js`, `dist/shell.css`, `dist/theme.css`, and for each app `dist/<name>/index.html`, `app.js`, `shell.css`, `theme.css`; and exit with code 0.

11.8 THE SYSTEM SHALL write only relative `href` and `src` values (none starting with `/`, a scheme or `//`) in the HTML it generates.

11.9 IF the output directory is the repo root, or contains the apps directory, THEN THE SYSTEM SHALL refuse to remove it and fail.

## Requirement 12: CLI, check

**User story:** As a table author, I want one command that tells me what is wrong with my table.

12.1 WHEN `bones check <table.json>` runs THE SYSTEM SHALL read the file, run `validate`, and IF there are problems THEN print one line `<path>: <message>` per problem in the engine's order, then the line `failed`, and exit with code 1.

12.2 WHEN the table is structurally valid THE SYSTEM SHALL run `check` and print: the line `gaps: <count>` followed by one line per example `  <condition>=<value>, <condition>=<value>, ...` (two leading spaces, table condition order); then one line per conflict `conflict: <ruleA> -> <outcomeA> vs <ruleB> -> <outcomeB>, e.g. <condition>=<value>, ...`; then one line per warning `warning: <path>: <message>`; then the last line.

12.3 WHEN `gaps.count` is greater than the number of examples THE SYSTEM SHALL print `  (first <n> shown)` after the examples.

12.4 WHEN the table passes THE SYSTEM SHALL print `ok: <C> conditions, <K> combinations, <R> rules` as the last line and exit with code 0; otherwise it SHALL print `failed` as the last line and exit with code 1.

12.5 IF the file is not valid JSON THEN THE SYSTEM SHALL print `$: invalid JSON: <message>` then `failed` and exit with code 1.

12.6 IF no command, an unknown command, a missing argument, an unknown option, or an unreadable file is given THEN THE SYSTEM SHALL print a message on stderr and nothing on stdout, and exit with code 2.

12.7 THE SYSTEM SHALL print check results on stdout only.

## Requirement 13: CLI, new

**User story:** As a developer, I want `new` to give me an app folder that builds as it is.

13.1 WHEN `bones new <name>` runs THE SYSTEM SHALL create `apps/<name>/` (under `--apps <dir>` when that option is given) holding `table.json`, `copy.json` and `theme.css` copied from `skeleton/template/`, with the table's `id` set to `<name>` and the table's `title` and the copy's `title` set to the name with `-` replaced by a space and the first letter capitalised, print `created <dir>/<name>`, and exit with code 0.

13.2 IF `<name>` does not match `^[a-z0-9]+(-[a-z0-9]+)*$`, or the folder exists, or the name is missing THEN THE SYSTEM SHALL create nothing, print a message on stderr, and exit with code 2.

13.3 WHEN `new` has run and `npm run build` is run with the new folder present THE SYSTEM SHALL build it with no other change.

## Requirement 14: Template and examples

**User story:** As a developer, I want a small valid app to start from and two broken tables to learn from.

14.1 THE SYSTEM SHALL provide `skeleton/template/` holding exactly `table.json` (2 conditions, 3 outcomes, 4 rules, 1 source), `copy.json` and `theme.css`, which passes `bones check` with `ok: 2 conditions, 4 combinations, 4 rules` and no warnings, and passes the copy and theme checks.

14.2 THE SYSTEM SHALL provide `skeleton/examples/gap.table.json`, structurally valid with exactly one gap combination, no conflict and no warning, and `skeleton/examples/conflict.table.json`, structurally valid with no gap, exactly one conflicting pair and no warning.

14.3 THE SYSTEM SHALL NOT include `skeleton/template/` or `skeleton/examples/` in `dist/`.

## Requirement 15: MCP server

**User story:** As an agent editing a table, I want to check it and try answers without leaving the editor.

15.1 WHEN `npm run mcp` runs THE SYSTEM SHALL start an MCP server on stdio exposing the tools `check_table` and `evaluate`, and SHALL write nothing to stdout except protocol messages.

15.2 WHEN `check_table` is called with `path` THE SYSTEM SHALL read that JSON file; WHEN called with `table` THE SYSTEM SHALL use that value; IF both or neither are given THEN THE SYSTEM SHALL return an error result.

15.3 WHEN `check_table` gets a table with structural problems THE SYSTEM SHALL return one text content holding JSON `{ "valid": false, "problems": [...] }`; WHEN it is structurally valid THE SYSTEM SHALL return `{ "valid": true, "report": <CheckReport> }`.

15.4 WHEN `evaluate` is called with `path` and `answers` (an object of strings) THE SYSTEM SHALL validate and check the table, and IF it does not pass THEN return an error result with the JSON text `{ "valid": <bool>, "passed": false, ... }` and no outcome; otherwise return the JSON text of the `decide` result.

15.5 IF a `path` is not inside the repo root (after resolving `..` and symbolic links), does not end in `.json`, does not exist, or is larger than 1 MB THEN THE SYSTEM SHALL return an error result naming the reason, and SHALL NOT read the file's content into the message.

15.6 THE SYSTEM SHALL use `zod` for the tool input schemas only.

## Requirement 16: Decide cost on the page

**User story:** As the owner, I want to know whether `decide` is fast enough to call on every click.

16.1 WHEN a table of 100,000 combinations (five conditions of ten values) with 200 rules, each naming five conditions, is given to `decide` with no answers THE SYSTEM SHALL return in at most 1,000 ms (median of five runs, in Node, on the development machine), and the measured time SHALL be recorded in the task report.

16.2 IF 16.1 is not met THEN the task SHALL stop and report the number to the owner, and SHALL NOT add a cache or change the engine.

## Owner answers

Given after the spec session; they override anything above that they contradict, and the body above has been adjusted to match.

1. Shared pieces. The check report formatter lives in `skeleton/engine/format.ts` (pure, no imports outside the engine, exported from `index.ts`) and is used by the CLI and the build. The build does not spawn the CLI. The build may `import type` from `skeleton/shell` (the `Copy` type) and nothing else; value imports from `shell` into `build` stay forbidden. There is one `Copy` type, in `skeleton/shell/copy-type.ts`.
2. Labels `published`, `outcome`, `yourAnswers` accepted. New label `noscript` (19 labels). The build writes `copy.title` (as `h1`), `tagline`, `intro` and `labels.noscript` into the static HTML (4.3), so the page is not blank without JavaScript.
3. Dark colours are required in every `theme.css`.
4. Accepted: the CSP meta tag, http(s)-only links, unknown `copy.json` keys are errors, `new` sets the table title.
5. No jsdom. Browser behaviour is tested in the `apps` spec.
6. Confirmed: invalid JSON exits 1; the table view scrolls in its own region; tiles show hints.
7. The theme contract gains `--font-size` (13 properties; the dark block stays at 8 colours). The owner's `--heading-font` is taken to be the existing `--font-heading` (the `apps` spec uses that name); no second heading property is added. Heading weight is set by `shell.css`, not by the theme, so the stack is weight-free.
8. `@types/node` stays pinned at 22.20.5.
9. Amendment (apps session): the static `<title>` was empty until the script ran. The build writes the page's title into `<title>`, HTML-escaped: `copy.title` for an app page, `landing.title` for the landing page. `renderPage` takes the title as a fourth argument; Property 12 gains clause (f): the `<title>` text, with the five entities decoded, equals `copy.title`, and the rest of the page still does not depend on the input.

10. Amendment (design pass, outside the three specs): the page shell is restyled and restructured after the owner reviewed headless screenshots of both apps and the landing page. The behaviour tested so far stays (one `h1`, live region, buttons as buttons, table view, hash, no `innerHTML`, no inline styles, 44 px targets, no horizontal scroll at 360 px, axe clean in light and dark, reduced motion). Changes, limited to `skeleton/shell/`, `skeleton/build/` (copy and landing validation), the e2e tests that select by text, and `copy.json` in both apps and the template:
    a. "Your answers": each step is a row with the question small and muted above, the chosen answer in bold below, and `labels.change` as a small text-style button at the right. No `question: answer` run-on text anywhere, including "What mattered".
    b. The result is a card: surface background, a thick accent bar on the left, a small uppercase `resultLead` above the outcome label in large type (still one `h2` whose text is `resultLead`, a space, the label), the outcome detail, then each rule note in its own inset block.
    c. "Why" is a quieter section below the card: a two-column definition list (Rule, What mattered, Source; the source is title as link, then the `at` text, then published and read dates on one line); it stacks on a 360 px screen.
    d. Skipped questions: a short muted list of smaller type under the `notAsked` heading.
    e. One primary button style (`copyLink`), secondary outline buttons (`startOver`, table toggle); answer options keep their tile or list style. A thin decorative progress bar (`aria-hidden`) sits under the `questionOf` text, which stays.
    f. Script-focused headings (`tabindex="-1"`) show no outline unless `:focus-visible` applies; every interactive element keeps a 3 px `--focus` ring.
    g. The footer has a top border and space; its links sit in a row that wraps.
    h. Every app page starts with a link to `../` labelled by the new label `labels.allApps` (20 labels; `allApps` is added to the `Labels` type, `validateCopy`, both app `copy.json` files and the template).
    i. The landing page shows the title, the tagline, an explanatory paragraph, one card per app (title as link, tagline, answer style), and a note naming `table.json`, `copy.json` and `theme.css`. `landing.json` gains `intro`, `styles` (`tiles`, `list`), `noteTitle` and `note`; `validateLanding` checks them; `AppSummary` gains `answerStyle`.
    The engine, the tables and the theme contract are unchanged.

### Amendments from the playground spec (owner answers, 2026-11)

- 11.1 (amended): the build also reads `skeleton/examples/which-bin-broken.table.json`, `skeleton/playground/playground.json` and `playground.css`.
- 11.7 (amended): the eight files for one app plus the five files of `dist/playground/` (thirteen).
- 10.1 to 10.4 (amended): `landing.json` and the `Landing` type gain `playground: { title, text }` (non-empty strings), rendered as a link after the app cards.
