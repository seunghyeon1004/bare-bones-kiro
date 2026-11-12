# Requirements: apps

Scope: the two app folders `apps/which-bin/` and `apps/which-licence/` (`table.json`, `copy.json`, `theme.css` each), the broken demo table `skeleton/examples/which-bin-broken.table.json`, `test/apps.test.ts`, the Playwright setup and tests (`playwright.config.ts`, `e2e/`, `scripts/serve.mjs`), the `test:e2e` script and the two extra devDependencies, and `.github/workflows/pages.yml`. Source of truth for content: `docs/sources/README.md` and `docs/sources/choosealicense/*.yml`. Source of truth for behaviour: `docs/product-brief.md`, `.kiro/steering/*.md`, and the `engine` and `shell-and-cli` specs.

Out of scope: any change in `skeleton/engine/`, `skeleton/shell/`, `skeleton/build/`, `skeleton/cli/`, `skeleton/mcp/`, `skeleton/template/` (the only new file in `skeleton/` is the demo table), new properties (see design), translations, search over items.

This spec assumes the owner's answers to the shell-and-cli session are recorded in that spec before it is implemented: the report formatter lives in `skeleton/engine/format.ts`; `build` may `import type` from the shell; every `theme.css` must define the dark colours; no jsdom; the build writes the title, the intro and the `labels.noscript` sentence into the HTML; `labels` therefore has 19 keys (the 18 of shell-and-cli requirement 2.3 plus `noscript`).

## Terms

- **README Ref**: the text of the first cell of a row in the quote table of `docs/sources/README.md` (for example `seoul-2025 A2 가`). Two pairs of rows share a Ref (`moe-2018 FAQ p.21` and `moe-2018 FAQ p.22`).
- **Silent rule**: a which-bin rule that sends a case to `ask-district` because the README says the sources are silent on it. Its `source.at` is the README note.
- **Unlisted rule**: a which-bin rule that sends a case to `ask-district` because no README row covers it and the README note does not mention it. Its `source.at` starts with `none:`. These need the owner's agreement (design, open question 1).
- **Yml fact**: a token in a licence rule's `source.at` after `<file>.yml: `. It is `<key>` (the key is listed under `permissions` or `conditions` in that file), `no <key>` (it is listed under neither), or `no conditions` (`conditions: []`).
- **Golden item**: a row of answers with an expected outcome, rule and source, evaluated through the engine in `test/apps.test.ts`.
- **Walk**: answering the question `decide` asks, from one complete combination, until `decide` returns decided (as in engine Property 8).

## Requirement 1: Tooling and boundaries

**User story:** As the owner, I want the apps added without touching the skeleton, so that the two folders differ only in their three files.

1.1 WHEN `package.json` is read THE SYSTEM SHALL contain, besides the devDependencies of shell-and-cli, exactly `@playwright/test` 1.65.0 and `@axe-core/playwright` 4.14.0 as exact versions with no `^` or `~`, and no `dependencies` key.

1.2 WHEN `package.json` is read THE SYSTEM SHALL define `test:e2e` as `npm run build && playwright test`, and SHALL leave every other script unchanged.

1.3 WHEN `apps/which-bin/` or `apps/which-licence/` is listed THE SYSTEM SHALL show exactly `copy.json`, `table.json` and `theme.css`.

1.4 THE SYSTEM SHALL add no file to `skeleton/` except `skeleton/examples/which-bin-broken.table.json`, and SHALL NOT edit any existing file in `skeleton/`.

1.5 IF a test or the build shows a defect in the shell, the build, the CLI or the engine THEN the task SHALL stop and report where, and SHALL NOT edit `skeleton/` or weaken a check to continue.

1.6 WHEN `npm run build` runs THE SYSTEM SHALL succeed, SHALL list `apps/which-bin` and `apps/which-licence` in `dist/` beside the landing page, and SHALL NOT write the demo table to `dist/`.

## Requirement 2: which-bin, table structure

**User story:** As a reader living in Korea, I want the app to ask as few questions as the sources allow.

2.1 THE SYSTEM SHALL define the conditions of `apps/which-bin/table.json` in this order: `kind`, `soiled`, `broken`, `glass-type`, `coated`, `clear-drink`, with the values, questions and hints listed in design.md.

2.2 THE SYSTEM SHALL define exactly these 13 outcomes: `paper`, `cartons`, `glass-bottles`, `cans`, `clear-pet`, `plastics`, `plastic-film`, `styrofoam`, `battery-box`, `lamp-box`, `general-waste`, `special-sack`, `ask-district`.

2.3 WHEN the engine validates and checks `apps/which-bin/table.json` THE SYSTEM SHALL report no problem, 6 conditions, 448 combinations, 30 rules, 0 gaps, 0 conflicts and no warning (every outcome is produced by a rule).

2.4 WHERE a condition does not change the outcome for a kind THE SYSTEM SHALL leave it out of that kind's rules ("any"), so that the walk lengths in design.md (golden items) hold.

2.5 THE SYSTEM SHALL define the sources `seoul-2025` and `moe-2018` with the title, url, `published` and `read` dates of design.md, and no other source.

2.6 THE SYSTEM SHALL write the outcome `general-waste` so that its `detail` explains in English what a 종량제봉투 is, and the outcome `special-sack` so that its `detail` explains in English what a 특수규격마대 is.

## Requirement 3: which-bin, every rule traced to a source row

**User story:** As the owner, I want each rule tied to a quoted row, and the gaps in the sources shown, not filled.

3.1 WHEN a which-bin rule does not send to `ask-district` THE SYSTEM SHALL set `source.ref` to a source id and `source.at` to exactly one README Ref that begins with that source id.

3.2 THE SYSTEM SHALL use every README Ref as the `source.at` of at least one rule except `seoul-2025 A1 1`; that row is not turned into a rule because no condition can express it (design, open question 3).

3.3 THE SYSTEM SHALL give every rule a `note`, with the instruction of its row (rinse, peel the label, wrap broken glass in newspaper, and so on) as listed in design.md.

3.4 WHEN a which-bin rule is a silent rule THE SYSTEM SHALL set its `source.at` to `docs/sources/README.md, note below the quote table`, and exactly two rules (`plastic-bottle-soiled`, `plastic-container-soiled`) SHALL be silent rules.

3.5 WHEN a which-bin rule is an unlisted rule THE SYSTEM SHALL set its `source.at` to `none: no quoted row (open question 1)` and its `note` to say that the guides do not cover the case, and exactly three rules (`glass-soiled`, `can-soiled`, `pet-clear-soiled`) SHALL be unlisted rules.

3.6 THE SYSTEM SHALL send to `ask-district` exactly the five rules named in 3.4 and 3.5, and SHALL write no rule for any case outside a quoted row except those five.

3.7 IF a README row depends on a fact the six conditions do not ask (the amount of broken glass or lamp, a foil or plastic lining on a box, a coating on a flyer, grease on only the inner paper of a pizza box) THEN THE SYSTEM SHALL NOT add a rule or a condition for it, and SHALL carry the fact in the `note` of the nearest rule or in the `hint` of the `kind` value, as listed in design.md.

## Requirement 4: which-bin, copy

**User story:** As a reader who cannot read the Korean guides, I want friendly English that says whose rules these are.

4.1 WHEN `apps/which-bin/copy.json` is validated by the build THE SYSTEM SHALL pass, with `answerStyle` `tiles` and all 19 labels.

4.2 THE SYSTEM SHALL make `intro` contain the phrases `South Korea, as published by Seoul in 2025` and `vary by district`.

4.3 THE SYSTEM SHALL list in `footer` both sources with their dates, each as a link whose `href` equals that source's `url` in `table.json`, and a line that says the rules vary by district.

## Requirement 5: which-licence, table

**User story:** As a developer, I want a licence suggestion that is tied to published licence facts, and honest when nothing fits.

5.1 THE SYSTEM SHALL define the conditions of `apps/which-licence/table.json` in this order: `copyleft` (values `none`, `file`, `library`, `whole`), `network`, `patent`, `credit` (each `no`, `yes`), with the questions and hints listed in design.md.

5.2 THE SYSTEM SHALL define exactly 7 outcomes: `mit`, `apache-2-0`, `unlicense`, `mpl-2-0`, `lgpl-3-0`, `gpl-3-0`, `agpl-3-0`; each outcome's `detail` SHALL equal, character for character, the `description` field of its file in `docs/sources/choosealicense/`, and its `label` SHALL be the file's `title` followed by the `spdx-id` in parentheses.

5.3 WHEN the engine validates and checks `apps/which-licence/table.json` THE SYSTEM SHALL report no problem, 4 conditions, 32 combinations, 7 rules, 0 gaps, 0 conflicts and no warning.

5.4 WHEN a which-licence rule is read THE SYSTEM SHALL have `source.ref` `choosealicense` and `source.at` of the form `<file>.yml: <fact>; <fact>`, where `<file>.yml` exists in `docs/sources/choosealicense/` and every yml fact is true in that file.

5.5 WHERE the answers match no licence of the seven (a patent grant wanted with no notice required; file-level or library-level copyleft with network use counting as distribution) THE SYSTEM SHALL offer the nearest licence, and the rule's `note` SHALL name the unmet answer and the yml facts that show it (rules `permissive-patent`, `copyleft-file`, `copyleft-library`).

5.6 THE SYSTEM SHALL give every which-licence rule a `note`, as listed in design.md, using only facts present in the seven yml files.

5.7 THE SYSTEM SHALL define the single source `choosealicense` with the commit-pinned url, `published` `unknown` and `read` `2026-11-12` of design.md.

## Requirement 6: which-licence, copy

**User story:** As a developer, I want precise wording, the data credit, and a clear "not legal advice".

6.1 WHEN `apps/which-licence/copy.json` is validated by the build THE SYSTEM SHALL pass, with `answerStyle` `list` and all 19 labels.

6.2 THE SYSTEM SHALL list in `footer` an entry whose `text` is exactly `Licence data from choosealicense.com, CC BY 3.0` and whose `href` is `https://choosealicense.com/`, an entry linking to `https://github.com/github/choosealicense.com`, and an entry linking to `https://creativecommons.org/licenses/by/3.0/`.

6.3 THE SYSTEM SHALL contain the words `not legal advice` (any letter case) in `intro` and in a `footer` entry.

## Requirement 7: themes

**User story:** As a visitor, I want each app to look like itself and to be readable in light and dark.

7.1 WHEN the build validates `apps/which-bin/theme.css` and `apps/which-licence/theme.css` THE SYSTEM SHALL pass both, with the twelve contract properties in the top-level `:root` and the eight colours in the dark block.

7.2 THE SYSTEM SHALL give the two themes different values for `--bg`, `--accent`, `--font-body`, `--font-heading`, `--radius` and `--space`; the which-bin `--radius` SHALL be at least `1rem`; the which-licence `--radius` SHALL be `0`; the which-licence `--font-heading` SHALL end in a generic `serif`.

7.3 WHEN the contrast ratio (WCAG 2.x relative luminance) of these pairs is computed from each theme, in the light rule and in the dark rule, THE SYSTEM SHALL give at least 4.5 for `--text` and `--muted` on `--bg` and on `--surface`, for `--accent` on `--bg` and on `--surface`, and for `--accent-text` on `--accent`; and at least 3 for `--border` and `--focus` on `--bg` and on `--surface`.

7.4 THE SYSTEM SHALL use only system font names in the font stacks: no `@font-face`, no `url(`, no `@import`.

7.5 THE SYSTEM SHALL include `"Apple SD Gothic Neo"` and `"Malgun Gothic"` in the which-bin font stacks, so that the Korean terms in the text have a system font.

7.6 WHERE the build's theme contract includes `--font-size` THE SYSTEM SHALL define it in both light rules (which-bin `1.25rem`, which-licence `1rem`); IF it does not THEN the task report SHALL say that "large type" for which-bin is not delivered (design, open question 6).

## Requirement 8: broken demo table

**User story:** As a demonstrator, I want one real table with a hole and a contradiction to show the checker.

8.1 THE SYSTEM SHALL provide `skeleton/examples/which-bin-broken.table.json`, equal to `apps/which-bin/table.json` with the rule `glass-soiled` removed and the rule `receipt-as-paper` (`kind=receipt` → `paper`) added, `id` `which-bin-broken`, and a `title` that names the removed rule and the added rule.

8.2 WHEN the engine validates and checks the demo table THE SYSTEM SHALL report no structural problem, 4 gaps (all with `kind=glass`, `soiled=yes`, `broken=no`, `glass-type=ordinary`), exactly one conflict (`receipt` against `receipt-as-paper`, outcomes `general-waste` and `paper`) and no warning.

8.3 WHEN `npm run bones -- check skeleton/examples/which-bin-broken.table.json` runs THE SYSTEM SHALL exit with code 1.

## Requirement 9: golden examples

**User story:** As the owner, I want a short list of real items with the answer I expect and the row it comes from.

9.1 THE SYSTEM SHALL hold in `test/apps.test.ts` 8 golden items for which-bin and 8 for which-licence, as listed in design.md, each evaluated with `decide` on the validated table.

9.2 WHEN a golden item runs THE SYSTEM SHALL return `status: 'decided'`, the listed outcome id, exactly the listed firing rule, and that rule's `source.at` equal to the listed README Ref (which-bin) or yml facts (which-licence).

9.3 WHEN a golden item is walked THE SYSTEM SHALL ask the listed number of questions and end with the same outcome.

9.4 THE SYSTEM SHALL NOT include an unlisted rule among the golden items (a case without a source row has no source-backed expected answer).

## Requirement 10: end-to-end tests

**User story:** As the owner, I want the built site exercised in a real browser, with the keyboard and with axe.

10.1 WHEN `npm run test:e2e` runs THE SYSTEM SHALL build, then run Playwright on Chromium only, with `retries` 0, against `dist/` served by `scripts/serve.mjs` under the path `/bare-bones-kiro/`, started by the Playwright `webServer` setting.

10.2 WHEN `scripts/serve.mjs` runs THE SYSTEM SHALL listen on `127.0.0.1` only, answer GET and HEAD only, serve files of `dist/` below `/bare-bones-kiro/` (a directory gives its `index.html`), answer 404 for anything else including paths that leave `dist/`, and exit with code 1 and a message if `dist/` does not exist.

10.3 WHEN the landing page is opened THE SYSTEM SHALL show the landing title, one link per app named with the app's title and tagline, and WHEN the first link is followed with the keyboard THE SYSTEM SHALL open that app.

10.4 WHEN a visitor answers with the keyboard only (Tab and Enter, no pointer) THE SYSTEM SHALL reach the result of the greasy pizza box in 2 questions and of the MIT case in 3 questions, with focus on the result heading, the steps list holding that many entries, and the skipped list holding the unasked questions.

10.5 WHEN which-bin is opened with a complete hash (`#kind=glass&glass-type=ordinary&broken=yes`) THE SYSTEM SHALL show the result without any click; WHEN it is opened with a hash holding unknown or repeated entries THE SYSTEM SHALL show the bad-link notice with their count, keep the valid entries, and rewrite the address to the valid entries only.

10.6 WHEN the whole-table button is activated THE SYSTEM SHALL show a table whose body has one row per rule of that app and whose header has one column per condition plus three, with the `any` label in every cell of a condition the rule does not name.

10.7 WHEN the question screen, the result screen, and the result screen with the whole table open are scanned by axe, for each app, in the light and in the dark colour scheme, THE SYSTEM SHALL report no violation.

10.8 WHEN either app is opened at a viewport width of 360 px, on the question screen, the result screen and with the whole table open, THE SYSTEM SHALL have no horizontal scroll on the page (`scrollWidth` not greater than `clientWidth` of the document element).

10.9 WHEN either app is opened with JavaScript off THE SYSTEM SHALL show the title, the intro and the `labels.noscript` sentence.

10.10 THE SYSTEM SHALL hold 12 tests in `e2e/`, and SHALL take every visible word a test looks for from `copy.json`, `table.json` or `skeleton/shell/landing.json`, not from a literal in the test.

10.11 IF axe reports a violation THEN the task SHALL stop and report the rule, the selector and the file that causes it, and SHALL NOT disable a rule, exclude an element or lower a threshold.

## Requirement 11: GitHub Pages workflow

**User story:** As the owner, I want a push to `main` to check everything and publish the site.

11.1 WHEN `.github/workflows/pages.yml` is read THE SYSTEM SHALL trigger on `push` to the branch `main` only.

11.2 WHEN the workflow runs THE SYSTEM SHALL run in this order: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, install of Chromium, `npx playwright test`, upload of `dist`, deploy.

11.3 THE SYSTEM SHALL build once and upload the same `dist/` that the end-to-end tests ran against.

11.4 THE SYSTEM SHALL use only actions owned by `actions/` (`checkout`, `setup-node`, `upload-pages-artifact`, `deploy-pages`).

11.5 THE SYSTEM SHALL set top-level `permissions` to `contents: read` only, and give `pages: write` and `id-token: write` to the deploy job only; the deploy job SHALL `need` the build job and use the environment `github-pages`.

11.6 THE SYSTEM SHALL set Node 22 and `cache: npm` in `setup-node`.
