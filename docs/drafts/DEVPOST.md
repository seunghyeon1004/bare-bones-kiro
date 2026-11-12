# Devpost submission draft: Bare Bones

**Category:** Skeleton Crew
**Live:** https://seunghyeon1004.github.io/bare-bones-kiro/ (Which bin?: `/which-bin/`, Which licence?: `/which-licence/`)
**Repo:** https://github.com/seunghyeon1004/bare-bones-kiro (MIT)
**Tagline:** A decision is a table, and a table can be checked. One skeleton, two apps, three files each.

---

## Inspiration

In Korea, household rubbish is sorted by detailed rules. A pizza box: paper, or the general waste bag? A broken glass? The official guides answer it, but in Korean, spread over a city web page and a 36-page Ministry PDF, which leaves the many people who live here without reading Korean guessing.

When I looked at how small tools like "which bin" or "which licence" are usually built, the answer was a pile of if-statements. Nobody can see whether the pile has a hole (a case no branch answers) or a contradiction (two branches that answer the same case differently). Those are exactly the mistakes that matter in a tool people trust for a quick answer.

So the idea was a skeleton where the decision is data, a table, and a program checks the whole table before anyone sees it.

## What it does

**The skeleton** takes a decision table (conditions with their allowed answers, rules, outcomes, and a source for every rule) and gives you:

- **A checker.** `npm run bones -- check table.json` reports structural errors with a path, every gap (combinations no rule covers, with examples) and every conflict (two rules that answer the same combination differently, with an example). Exit 1 on either. The build refuses to publish a table that fails.
- **The fewest questions.** After each answer the engine asks only a question that can still change the outcome, chosen so its worst answer leaves the fewest outcomes open, and stops the moment the outcome is decided. A greasy paper box takes two questions out of seven.
- **An explanation.** Every result shows the rule that fired, the answers that mattered, the rule's source with publication and reading dates, and the questions it skipped because they could not change the answer.
- **A page shell.** Any valid table becomes an accessible one-question-at-a-time web page: real buttons, keyboard only works, focus moves to each new question, light and dark, phone width, the answers in the URL so a result can be shared, and a "show the whole table" view. Static files: no login, no server, no tracking, no network requests.
- **A CLI that makes the template real.** `npm run bones -- new my-app` copies a starter app; the next build publishes it.
- **A dev MCP server** with `check_table` and `evaluate`, so an AI agent editing a table can check it.

**Two apps** from that skeleton, each nothing but `table.json`, `copy.json` and `theme.css`:

1. **Which bin?** Where a household item goes under Seoul's 2025 separate-discharge rules and the Ministry of Environment guide, in English. 7 questions, 960 combinations, 33 rules; it asks 1 to 4. Big tiles, warm colours, large type. Every rule cites a quoted line of the Korean source. Where the sources are silent (a plastic container with food rinsing will not remove), it says "Ask your district office" instead of guessing.
2. **Which licence?** Which of seven open-source licences (MIT, Apache-2.0, Unlicense, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0) fits a project, from choosealicense.com's licence data. A list with a sentence per option, ink on paper, a serif heading. Every rule cites the licence file and the permission or condition that decides it. Not legal advice, and the page says so.

`diff -rq apps/which-bin apps/which-licence` lists three files. The skeleton under them is the same code.

## How we built it

TypeScript with no runtime dependencies in the engine, so the same code runs in the CLI, the MCP server and the browser. esbuild bundles the page script; the build inlines the table and the copy into each page, so a page loads only its own files. vitest and fast-check for unit and property tests, Playwright with axe for the browser. A GitHub Actions workflow runs typecheck, tests, build and the browser tests, then publishes to GitHub Pages.

The checker is plain enumeration over the table's combinations (capped at 100,000; decide takes about 80 ms at the cap), which keeps it simple enough to prove: ten invariants, each a fast-check property compared against a brute-force oracle.

## How Kiro was used

Kiro CLI 3.2.1, driven headless, wrote all the code in 12 recorded sessions. I wrote the brief and the source notes, made the decisions, reviewed every diff, and re-ran every check outside Kiro. Every session's transcript is in `docs/kiro-evidence/`, and `.kiro/README.md` is the honest record.

- **Steering (6 files).** Kiro wrote them from the brief. The key one is `invariants.md`: ten guarantees no change may weaken (a reported gap really matches no rule, a passing table yields exactly one outcome everywhere, decide never asks a question that cannot change the answer, the result does not depend on answer order...), each naming the property test that proves it. `table-format.md` says every rule cites a quoted source row and silent cases get an explicit outcome. That rule made Kiro list every uncovered case and ask instead of inventing answers.
- **Specs (3, spec mode, claude-sonnet-5.5).** engine, shell-and-cli, apps: 198 EARS acceptance criteria, 12 correctness properties, 23 tasks, each with one Verify command and ticked only after it passed. Kiro's open questions came back to me; my answers went into the next prompt and into the spec.
- **Custom agents (2).** `bonesetter`, the builder, with write access only to code folders and two hooks: a `PostToolUse` hook that typechecks after every write (40 firings, 14 caught a type error that Kiro then fixed) and a `Stop` hook that runs the whole suite (5 firings, all green). `x-ray`, a read-only auditor on claude-haiku-5.5: it checked all 27 rules of the waste table against the quoted sources and found 2 unsupported and 7 stretched rules, a hint that contradicted its own rule, and copy that overclaimed. A builder session fixed every finding.
- **MCP.** Kiro built the `bones` server; in a V3 headless session with `--require-mcp-startup` it used only `check_table` and `evaluate` to check the broken demo table, explain its gap and its conflict, and walk two answer sets.
- **Property-based testing.** fast-check properties prove all ten invariants against a brute-force oracle. Because Kiro never saw one fail, I checked they can: three hand-made engine mutants each turned at least one property red.
- **Vibe versus spec.** One session was deliberately unspecced: a design pass after I looked at screenshots. It was quick and fine for CSS; everything the checker's correctness depends on went through specs.

About 145 credits for the whole project.

## Challenges

- **Sources that disagree or are silent.** Seoul's 2025 page and the Ministry's 2018 guide overlap, and some cases are in neither. The format forced the decision into the open: Kiro listed every uncovered combination, I found three missing lines in the Ministry FAQ, and one case still goes to "Ask your district office".
- **"Fewest questions" that is honest.** The engine never asks a question that cannot change the outcome and stops as soon as the outcome is decided; which relevant question to ask is a greedy choice (the smallest worst case). The README says exactly that rather than claiming an optimum.
- **Proving properties can fail.** All properties passed first time, so I broke the engine on purpose to see them go red.
- **Headless Kiro details.** A spec session once exited with no output (the retry worked), the V3 engine cannot write `.kiro/agents` or `.kiro/settings` (agents written by hand, MCP registered with `kiro-cli mcp add`), and an editor `PostFileSave` hook does not fire in the CLI (the agent's `PostToolUse` hook did the work).

## What we learned

A decision table makes a whole class of bugs checkable, and the same idea works on the AI side: give the agent invariants it can test, sources it must cite, and a read-only reviewer, and its output becomes something you can verify instead of something you have to trust. The cheapest session in the project (0.18 credits, the read-only audit) found the most real problems.

## What's next

- A table editor page that runs the checker as you type.
- More apps from the skeleton: visa and document checklists, medicine disposal, school form choosers.
- Per-district tables for Which bin?, each citing its own district's page.
- Translations, as copy files.

## Built with

Kiro, TypeScript, Node.js, esbuild, vitest, fast-check, Playwright, axe-core, Model Context Protocol SDK, GitHub Actions, GitHub Pages

## Gallery

| # | File | Caption |
| --- | --- | --- |
| 1 | `docs/screens/01-landing.png` | One skeleton, two apps. A decision is a table, checked for gaps and conflicts. |
| 2 | `docs/screens/02-which-bin-question.png` | Which bin?: Korea's recycling rules in English, big tiles. |
| 3 | `docs/screens/03-which-bin-result.png` | Every answer shows the rule that fired, what mattered and the source line. |
| 4 | `docs/screens/04-which-bin-phone.png` | On a phone: only the questions that can still change the answer. |
| 5 | `docs/screens/05-which-licence-question.png` | Which licence?: the same skeleton, a different table, words and theme. |
| 6 | `docs/screens/06-which-licence-result-dark.png` | AGPL-3.0 in two questions; the others are listed as not asked. Dark mode. |
| 7 | `docs/screens/07-which-licence-table.png` | The whole decision as a plain table, with the source of every rule. |
| 8 | `docs/screens/08-checker-finds-gap-and-conflict.png` | The checker finds a hole and a conflict in a broken table, with examples. |
| 9 | `docs/screens/09-same-skeleton-three-files.png` | Two apps differ in three files; `bones new` scaffolds a third. |

---

## Form texts

### Testing instructions for judges

No login, nothing to install. Open https://seunghyeon1004.github.io/bare-bones-kiro/ and pick an app. In Which bin?, try "Paper or cardboard box" then "Yes" (greasy): two questions, then the result with its rule, source and the skipped questions. "Copy link" gives a link that reopens the same result; "Show every rule" shows the table. Which licence? works the same way with a list. To run it locally: Node 22+, `npm ci`, `npm run build`, `node scripts/serve.mjs`, then http://127.0.0.1:4173/bare-bones-kiro/. To see the checker: `npm run bones -- check skeleton/examples/which-bin-broken.table.json` (exits 1 with a gap and a conflict) and `npm run bones -- check apps/which-bin/table.json` (passes). To make a third app: `npm run bones -- new my-app && npm run build`. Tests: `npm test` (93) and `npm run test:e2e` (12, headless Chromium).

### How the project uses Kiro

Kiro CLI 3.2.1, headless, wrote all the code in 12 recorded sessions (transcripts in docs/kiro-evidence/). Steering: 6 files, including invariants.md with the engine's ten guarantees, each tied to a property test, and table-format.md, which makes every rule cite a quoted source. Specs: 3 in spec mode (198 EARS criteria, 12 correctness properties, 23 tasks, each ticked only after its Verify command passed). Custom agents: bonesetter (builder) with hooks that typecheck after every write and run the suite on stop (logged to hook-fires.log), and x-ray, a read-only auditor that checked every rule against the sources and found two unsupported rules that were then fixed. MCP: a bones server with check_table and evaluate, used by Kiro in a recorded session to check a broken table. Property-based testing: fast-check proves all ten invariants against a brute-force oracle. .kiro/README.md records what Kiro got wrong and what was done by hand.

### Pre-existing work disclosure

Everything in the repository was created during the submission period, on 2026-11-12. Two helper scripts were reused from my own earlier Kiroween 2026 entry (also built during the submission period): scripts/kiro-render.mjs, which renders Kiro's stream-json output into transcripts, and the pattern of scripts/kiro-run.sh. The source data comes from public documents: Seoul Metropolitan Government's separate-discharge page (2025), the Ministry of Environment's recycling guide (2018), and choosealicense.com's licence data (CC BY 3.0), all cited in docs/sources/README.md. The project uses open-source dev dependencies listed in package.json; it has no runtime dependencies.
