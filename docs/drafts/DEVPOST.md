# Devpost submission draft: Bare Bones

**Category:** Skeleton Crew
**Live:** https://seunghyeon1004.github.io/bare-bones-kiro/ (Playground: `/playground/`, Which bin?: `/which-bin/`, Which licence?: `/which-licence/`)
**Repo:** https://github.com/seunghyeon1004/bare-bones-kiro (MIT)
**Tagline:** A decision is a table, and a table can be checked. One skeleton, two apps, three files each.

---

## Inspiration

In Korea, household rubbish is sorted by detailed rules. Does a pizza box go with paper or in the general waste bag? What about a broken glass? The official guides have the answers, but they are in Korean and spread over a city web page and a 36-page Ministry PDF, so a lot of people who live here without reading Korean end up guessing.

Then I looked at how small tools like "which bin" or "which licence" usually get built. The answer is a pile of if-statements. Nobody can look at that pile and see whether it has a hole (a case no branch answers) or a contradiction (two branches that answer the same case differently). Those are exactly the mistakes that hurt in a tool people trust for a quick answer.

So the idea was a skeleton where the decision is data, a table, and a program checks the whole table before anyone sees it.

## What it does

Start with the **playground**. It loads the licence table: 7 rules, 32 combinations, all covered. Click "Remove" on one rule and the checker answers right away: "Fails: 4 gaps", with the four answer combinations that now have no rule. The app running beside it is replaced by "This table fails the check". Click Undo and it passes again.

**The skeleton** takes a decision table (questions with fixed answers, rules, outcomes, and a source for every rule) and gives you:

- **A checker.** `npm run bones -- check table.json` reports structural errors with a path, every gap with examples, and every conflict with the two rules and an example. It exits 1 on either. The build refuses to publish a table that fails, and the playground runs the same check in the browser as you type.
- **Only useful questions.** After each answer the engine asks only a question that can still change the outcome (the one whose worst answer leaves the fewest outcomes open), and it stops the moment the outcome is settled. A greasy paper box takes two questions out of seven.
- **An explanation.** Each result shows the rule that fired, the answers that mattered, the rule's source with its dates, and the questions it skipped because they could not change the answer.
- **A page shell.** Any valid table becomes an accessible, one-question-at-a-time web page: real buttons, works with the keyboard alone, focus moves to each new question, light and dark, phone width, answers kept in the URL so a result can be shared, and a "show the whole table" view. Pictograms and a keyword filter can be switched on from the copy file. Static files only: no login, no server, no tracking, no network requests.
- **A CLI that makes the template real.** `npm run bones -- new my-app` copies a starter app, and the next build publishes it.
- **A dev MCP server** with `check_table` and `evaluate`, so an AI agent editing a table can check it.

**Two apps** come from that skeleton, and each is nothing but `table.json`, `copy.json` and `theme.css`:

1. **Which bin?** Where a household item goes under Seoul's 2025 separate-discharge rules and the Ministry of Environment guide, in English. It has 7 questions, 960 combinations and 33 rules, and asks between 1 and 4 of them. You see line pictograms on big tiles, and a filter box: type "pizza" and only the paper box is left. Every rule cites a quoted line of the Korean source. Where the sources say nothing (a plastic container with food that rinsing will not remove), it says "Ask your district office".
2. **Which licence?** Which of seven open-source licences (MIT, Apache-2.0, Unlicense, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0) fits a project, from choosealicense.com's licence data. It is a list with a sentence under each option, ink-on-paper colours and a serif heading. Every rule cites the licence file and the permission or condition that decides it. It is not legal advice, and the page says so.

Run `diff -rq apps/which-bin apps/which-licence` and you get three files. The code under them is the same.

## How we built it

The engine is TypeScript with no runtime dependencies, so the same code runs in the CLI, the MCP server, the playground and the app pages. esbuild bundles the page scripts, and the build inlines each table and copy file into its page, so a page loads only its own files. vitest and fast-check cover the unit and property tests, and Playwright with axe covers the browser. A GitHub Actions workflow runs typecheck, tests, build and the browser tests, then publishes to GitHub Pages.

The checker is plain enumeration over the table's combinations, capped at 100,000 (decide takes about 80 ms at the cap; the Which bin? table checks in about 4 ms in the browser). That keeps it simple enough to prove: ten invariants, each a fast-check property compared against a brute-force oracle.

## How Kiro was used

Kiro CLI 3.2.1, driven headless, wrote all the code in 16 recorded sessions. I wrote the brief and the source notes, made the decisions, reviewed every diff and re-ran every check outside Kiro. Every session's transcript is in `docs/kiro-evidence/`, and `.kiro/README.md` is the honest record, including where Kiro went wrong.

- **Steering (6 files).** Kiro wrote them from the brief. The most important one is `invariants.md`: ten guarantees no change may weaken (a reported gap really matches no rule, a passing table yields exactly one outcome everywhere, decide never asks a question that cannot change the answer, the result does not depend on answer order, and so on), each naming the property test that proves it. `table-format.md` says every rule cites a quoted source row and a case the sources skip gets an explicit outcome. Because of that rule, Kiro listed every uncovered case and asked me instead of inventing answers.
- **Specs (4, spec mode, claude-sonnet-5.5).** engine, shell-and-cli, apps and playground: 266 EARS acceptance criteria, 13 correctness properties, 29 tasks, each with one Verify command and ticked only after it passed. Kiro's open questions came back to me, and my answers went into the next prompt and into the spec as numbered "Owner answers". Later changes, like the Which bin? filter and the landing page, were recorded the same way before they were built.
- **Custom agents (2).** `bonesetter` is the builder. It can write only to code folders and has two hooks: a `PostToolUse` hook that typechecks after every write (74 firings, 24 of which caught a type error that Kiro then fixed) and a `Stop` hook that runs the whole suite (8 firings, all green). `x-ray` is a read-only auditor on claude-haiku-5.5. It checked all 27 rules of the waste table against the quoted sources and found 2 unsupported rules, 7 stretched ones, a hint that contradicted its own rule, and copy that claimed too much. A builder session fixed every finding.
- **MCP.** Kiro built the `bones` server. In a V3 headless session with `--require-mcp-startup` it used only `check_table` and `evaluate` to check the broken demo table, explain its gap and its conflict, and walk two answer sets.
- **Property-based testing.** fast-check properties prove all ten invariants against a brute-force oracle, plus one for the playground (removing any one rule exposes exactly the combinations only that rule covered). They all passed the first time, so I checked that they can fail: three hand-made engine mutants each turned at least one property red.
- **Vibe versus spec.** One session was deliberately unspecced, a design pass after I looked at screenshots. That was quick and fine for CSS. Everything the checker's correctness depends on went through specs.

About 214 credits for the whole project.

## Challenges

- **Sources that disagree or say nothing.** Seoul's 2025 page and the Ministry's 2018 guide overlap, and some cases appear in neither. The table format forced the decision into the open: Kiro listed every uncovered combination, I found three missing lines in the Ministry FAQ, and one case still goes to "Ask your district office".
- **An honest "fewest questions".** The engine never asks a question that cannot change the outcome and stops as soon as the outcome is settled. Choosing which relevant question to ask is greedy (smallest worst case), and the README says so.
- **Making the checker visible.** In the first version the checker only showed up in a terminal. The playground needed the page shell to become mountable on any element and the preview to get its own theme under a strict Content Security Policy. The twelve existing browser tests stayed green through that refactor without edits.
- **Proving properties can fail.** Every property passed on the first run, so I broke the engine on purpose to watch them go red.
- **Headless Kiro details.** One spec session exited with no output (the retry worked). The V3 engine cannot write `.kiro/agents` or `.kiro/settings`, so I wrote the agents by hand and registered MCP with `kiro-cli mcp add`. An editor `PostFileSave` hook does not fire in the CLI, so the agent's `PostToolUse` hook did that job.

## What we learned

A decision table makes a whole class of bugs checkable, and the same idea works on the AI side. Give the agent invariants it can test, sources it must cite and a read-only reviewer, and its output becomes something you can check. The cheapest session in the project, the read-only audit at 0.18 credits, found the most real problems.

## What's next

- Saving and sharing playground tables, so the playground grows into an editor for new apps.
- More apps from the skeleton: visa and document checklists, medicine disposal, school form choosers.
- Per-district tables for Which bin?, each citing its district's own page.
- Translations, as copy files.

## Built with

Kiro, TypeScript, Node.js, esbuild, vitest, fast-check, Playwright, axe-core, Model Context Protocol SDK, GitHub Actions, GitHub Pages

## Gallery

| # | File | Caption |
| --- | --- | --- |
| 1 | `docs/screens/01-landing.png` | A decision is a table: table in, checker in the middle, app out. Two apps and a playground. |
| 2 | `docs/screens/02-playground-gap-found.png` | The playground: one rule removed, 4 gaps found with examples, and the app refuses to run. |
| 3 | `docs/screens/03-which-bin-question.png` | Which bin?: Korea's recycling rules in English, pictogram tiles and a filter box. |
| 4 | `docs/screens/04-which-bin-result.png` | Every answer shows the rule that fired, what mattered and the source line. |
| 5 | `docs/screens/05-which-bin-phone-filter.png` | On a phone: type "bottle" and two tiles are left. |
| 6 | `docs/screens/06-which-licence-question.png` | Which licence?: the same skeleton with a different table, words and theme. |
| 7 | `docs/screens/07-which-licence-result-dark.png` | AGPL-3.0 in two questions; the others are listed as not asked. Dark mode. |
| 8 | `docs/screens/08-checker-finds-gap-and-conflict.png` | The CLI checker finds a hole and a conflict in a broken table, with examples. |
| 9 | `docs/screens/09-same-skeleton-three-files.png` | Two apps differ in three files; `bones new` scaffolds a third. |

---

## Form texts

### Testing instructions for judges

No login and nothing to install. Open https://seunghyeon1004.github.io/bare-bones-kiro/playground/, click "Remove" next to any rule and watch the checker list the gaps while the app on the right refuses to run; click Undo to restore it. Then open Which bin? from the home page, type "pizza" in the search box, pick the paper box and answer "Yes": you get the result after two questions, with its rule, source and skipped questions. "Copy link" gives a link that reopens the same result, and "Show every rule" shows the table. Which licence? works the same way with a list. To run it locally: Node 22+, `npm ci`, `npm run build`, `node scripts/serve.mjs`, then open http://127.0.0.1:4173/bare-bones-kiro/. The CLI checker: `npm run bones -- check skeleton/examples/which-bin-broken.table.json` exits 1 with a gap and a conflict, and `npm run bones -- check apps/which-bin/table.json` passes. A third app: `npm run bones -- new my-app && npm run build`. Tests: `npm test` (137) and `npm run test:e2e` (20, headless Chromium).

### How the project uses Kiro

Kiro CLI 3.2.1, headless, wrote all the code in 16 recorded sessions (transcripts in docs/kiro-evidence/). Steering: 6 files, including invariants.md with the engine's ten guarantees, each tied to a property test, and table-format.md, which makes every rule cite a quoted source. Specs: 4 in spec mode (266 EARS criteria, 13 correctness properties, 29 tasks, each ticked only after its Verify command passed). Custom agents: bonesetter, the builder, with hooks that typecheck after every write and run the suite on stop (logged to hook-fires.log: 74 and 8 firings), and x-ray, a read-only auditor that checked every rule against the sources and found two unsupported rules, which were then fixed. MCP: a bones server with check_table and evaluate, which Kiro used in a recorded session to check a broken table. Property-based testing: fast-check proves all ten invariants against a brute-force oracle. .kiro/README.md records what Kiro got wrong and what was done by hand.

### Pre-existing work disclosure

Everything in the repository was created during the submission period, on 2026-11-12. Two helper scripts were reused from my own earlier Kiroween 2026 entry, which was also built during the submission period: scripts/kiro-render.mjs, which renders Kiro's stream-json output into transcripts, and the pattern of scripts/kiro-run.sh. The source data comes from public documents: Seoul Metropolitan Government's separate-discharge page (2025), the Ministry of Environment's recycling guide (2018) and choosealicense.com's licence data (CC BY 3.0), all cited in docs/sources/README.md. The project uses the open-source dev dependencies listed in package.json and has no runtime dependencies.
