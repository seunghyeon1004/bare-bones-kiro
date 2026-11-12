# How Bare Bones was built with Kiro

All the code in `skeleton/`, `apps/`, `test/`, `e2e/`, `scripts/serve.mjs`, `scripts/time-decide.ts` and `.github/workflows/` was written by Kiro CLI 3.2.1, driven headless, in 12 recorded sessions (one failed). The owner wrote the product brief and the source notes, made the decisions, read the diffs, re-ran every check outside Kiro before each commit, and did the short list of things by hand at the end. Each session's transcript is in [`docs/kiro-evidence/`](../docs/kiro-evidence/README.md).

## The strategy

1. **Brief and sources first.** `docs/product-brief.md` defines the table format and what check and decide must do. `docs/sources/README.md` quotes every source line a rule may cite, in Korean with an English gloss. Kiro wrote the steering from these, then the specs, then the code.
2. **Guarantees as invariants, invariants as properties.** The engine's ten guarantees are numbered in `steering/invariants.md`. The engine spec has exactly one property per invariant, and each is a fast-check test named after it.
3. **One spec per layer, one session per spec.** engine, then shell-and-cli, then apps. Each spec was written in spec mode by `claude-sonnet-5.5` and implemented by the `bonesetter` agent on `auto`, told to run each task's Verify command before ticking it. Answers to Kiro's open questions went into the next prompt and were recorded in the spec ("Owner answers").
4. **Trust the gate, not the summary.** After every session: typecheck, vitest, Playwright, `bones check`, and a look at screenshots, outside Kiro.

## Steering (`steering/`)

| File | Inclusion | What it pins down |
| --- | --- | --- |
| `product.md` | always | What Bare Bones is, the two apps, non-goals, "app folders differ only in three files" |
| `tech.md` | always | Node, TypeScript strict, the pinned dev dependencies, the npm scripts, six rules for Kiro (never commit, never read secrets, never weaken a check, never mock the subject, tick only after Verify, stop when spec and code disagree) |
| `structure.md` | always | Folders and the dependency direction (the engine imports nothing) |
| `invariants.md` | always | I1 to I10, each with the name of the property test that proves it |
| `table-format.md` | fileMatch `apps/**`, `skeleton/template/**`, `skeleton/examples/**` | The JSON format, the 100,000 combination limit, "every rule cites a quoted row; when the sources are silent, say so with an explicit outcome" |
| `kiro-workflow.md` | always | EARS criteria, Correctness properties, tasks with one Verify command, tests proportionate |

What made the biggest difference: `table-format.md` rule 5. When Kiro designed the waste table it did not invent answers for cases the sources do not cover; it listed them (three groups, with combination counts) and asked. The owner then found the missing lines in the Ministry FAQ and added them to the source notes, and only one case still goes to "Ask your district office".

## Specs (`specs/`)

| Spec | Criteria | Properties | Tasks | What it built |
| --- | --- | --- | --- | --- |
| `engine` | 49 | 10 | 8 | validate, check, decide, evaluate; the oracle and generators for the properties |
| `shell-and-cli` | 87 | 2 | 8 | copy.json and theme.css contracts, page shell, landing page, build, `bones check` and `bones new`, template, examples, MCP server, a timing of decide at 100,000 combinations |
| `apps` | 62 | 0 | 7 | Which bin? and Which licence?, the broken demo table, golden examples, 12 Playwright tests with axe, the Pages workflow |

All 23 tasks are ticked, each with its Verify command's result line. The full suite is 93 vitest tests (12 of them properties) and 12 Playwright tests.

Did the properties earn their keep? Kiro found no failing case while writing them, so the owner checked that they can fail: three hand-made mutants of the engine (asking a question that cannot change the outcome, missing one in seven gaps, the wrong tie-break for the next question) each turned at least one property red (Properties 6; 1, 3, 4 and 6; 6). They were reverted.

## Agents (`agents/`)

| Agent | Job | Real use |
| --- | --- | --- |
| `bonesetter` | The builder. Writes only under `skeleton/`, `apps/`, `test/`, `e2e/` and a few config files; may not touch steering, docs or the hook scripts; may not run git commands that change anything | Sessions 05, 06, 07, 10, 11 |
| `x-ray` | Read-only auditor: runs `bones check` and checks every rule of a table against the quoted source rows. No write tool; shell limited to `bones check`, `git diff`, `ls`, `grep` and reading `apps/` and `docs/sources/` | Session 08, once, on `claude-haiku-5.5` for 0.18 credits |

Both were written by hand (V3 agents cannot write `.kiro/agents/`) and checked with `kiro-cli agent validate`.

The x-ray run was the most useful single session. It went through the 27 rules and marked 18 supported, 7 stretched and 2 unsupported: broken glass and broken lamps went to the general bag at any amount, while the Seoul rule splits small and large amounts. It also found a hint that contradicted its own rule, "window glass" listed as ordinary glass while the next question treats it as special, notes that quoted a second source the rule did not cite, and copy that called Seoul's rules "the rules for South Korea". Session 11 fixed all of them: a new "How much is there?" question, one source per rule, and plainer notes and copy.

## Hooks

| Hook | Where | Trigger | What it does |
| --- | --- | --- | --- |
| `bonesetter-after-write` | `agents/bonesetter.json` | `PostToolUse` on the write tools | `scripts/hooks/after-write.sh`: typecheck, prints the tail and exit code to the agent, logs the firing |
| `bonesetter-on-stop` | `agents/bonesetter.json` | `Stop` | `scripts/hooks/on-stop.sh`: typecheck and the full vitest suite, summary to the agent and the log |
| `check-table-on-save.json` | `hooks/` | `PostFileSave` on `apps/*/table.json` | `bones check` on every app table |

From `docs/kiro-evidence/hook-fires.log`: the after-write hook fired 40 times across the five builder sessions, 14 of them with a failing typecheck that Kiro then fixed; the stop hook fired 5 times, each time typecheck 0 and vitest green (31, 60, 91, 91, 93 tests). The workspace `PostFileSave` hook never fired: in these headless CLI runs file saves are tool writes, not editor saves. It is kept for the IDE, and the agent's `PostToolUse` hook does the work in the CLI.

## MCP (`settings/mcp.json`, `skeleton/mcp/server.ts`)

`bones` is a dev-only stdio server with two tools: `check_table` (a path inside the repo, or an inline table) and `evaluate` (a path and answers, returns the full decide result). Kiro built it in session 06; the owner registered it with `kiro-cli mcp add --scope workspace`. In session 09, a V3 headless run with `--require-mcp-startup`, Kiro used only the two tools: it checked the broken table and explained its gap (a dirty uncoated paper cup) and its conflict (two receipt rules), confirmed the real table passes, and walked a paper box and the AGPL case, listing the skipped questions. It is the same check an agent would run while editing a table, without a shell.

## Where Kiro went wrong, and what was done

- **TypeScript 7.0.2** pinned in steering because `npm view` returned it; the owner pinned 6.0.3 for tool compatibility before any code.
- **A failed spec session** (`04a`): exit 1 after reading, no output, no files. Retried unchanged; it worked.
- **Its own Verify string was wrong twice**: a package.json check expected script names "sorted" in an unsorted order. Kiro noticed, fixed the string and said so.
- **Lock file**: twice an `npm install` dropped the cross-platform native bindings for vitest's bundler, and vitest would not start. Kiro deleted and regenerated the lock both times and reported it.
- **Stretched sources**: the first which-bin table applied some source lines beyond their subject and missed the amount split; caught by the x-ray agent, fixed in session 11.
- **Temp files outside the repo**: Kiro left a build in `/tmp/bt` and screenshots in `/tmp/shots`, and said so; the owner deleted them.
- **Not seen**: Kiro did not weaken a property or a test, mock the engine, or tick a task without running its command.

## Done by hand

- `docs/product-brief.md`, `docs/sources/` (reading the Seoul page and the Ministry PDF, the quote table, the choosealicense files), the owner answers in each prompt, this file, `README.md`, `LICENSE`, `.gitignore`.
- Steering: TypeScript 6.0.3 in `tech.md`; the `@types/node` row and the `mcp` script in `tech.md`; the build-to-shell type import exception in `structure.md`.
- `agents/bonesetter.json`, `agents/x-ray.json`, `hooks/check-table-on-save.json`, `scripts/hooks/*.sh`, `scripts/kiro-run.sh`, `scripts/kiro-render.mjs` (the renderer was reused from the owner's earlier project), and `kiro-cli mcp add`.
- Two small fixes after the design session: the "Change" button kept on one line (`shell.css`, 5 lines), and the colons dropped from the two `resultLead` strings.
- The three engine mutants (reverted), commits, pushes, enabling GitHub Pages.

## Not verified

- A real screen reader has not been used. Structure is tested (one `h1`, live region, buttons, focus, axe clean in light and dark), not the listening experience.
- The waste rules were checked against the Seoul page and the Ministry PDF as read on 2026-11-12, not against any district's own rules.
- The IDE was not used; the `PostFileSave` hook is untested.

## Credits

The account's meter read 3,327.85 before the first session and 3,472.48 after the last: about 145 credits for the whole project, the three spec sessions on `claude-sonnet-5.5` (about 70) being the largest part. The meter is shared with other sessions, so this is an upper bound.
