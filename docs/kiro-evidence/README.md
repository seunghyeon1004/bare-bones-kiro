# Kiro evidence

Every numbered `.txt` file here is one real Kiro CLI 3.2.1 run in this repository, started by [`scripts/kiro-run.sh`](../../scripts/kiro-run.sh). It holds the exact command, the prompt (also kept in `prompts/`), and the transcript rendered from Kiro's `stream-json` event stream by [`scripts/kiro-render.mjs`](../../scripts/kiro-render.mjs): Kiro's text, every tool call, every shell command with its exit code and output tail, the steering files Kiro loaded, and the credits the session reported. The only edit is the home directory replaced with `~`. `hook-fires.log` is written by the hooks themselves; `credits.log` by the run script.

| File | Agent, model | What happened |
| --- | --- | --- |
| `01-steering.txt` | default, auto | Six steering files from the product brief, versions pinned with `npm view`. Raised nine ambiguities in the brief; it also pinned TypeScript 7.0.2, which the owner changed to 6.0.3. |
| `02-spec-engine.txt` | spec mode, sonnet 5.5 | 49 EARS criteria, 10 properties (one per invariant), 8 tasks with Verify commands. Flagged an untested criterion and its own extra checks inside three properties. |
| `03-spec-shell-and-cli.txt` | spec mode, sonnet 5.5 | 87 criteria, 2 properties, 8 tasks. Asked how build and shell may share code without importing each other. |
| `04a-spec-apps-failed.txt` | spec mode, sonnet 5.5 | Exited 1 after reading the specs, with no message. Nothing written. |
| `04-spec-apps.txt` | spec mode, sonnet 5.5 | The retry: 62 criteria, 7 tasks, both tables designed rule by rule with a model run of the checker, and every combination the sources do not cover listed for the owner. |
| `05-impl-engine.txt` | bonesetter, auto | Engine and all 10 properties. 31 tests. |
| `06-impl-shell-and-cli.txt` | bonesetter, auto | Shell, build, CLI, template, examples, MCP server; timed decide at 100,000 combinations (80 ms). 60 tests. |
| `07-impl-apps.txt` | bonesetter, auto | Both apps, the broken demo table, 12 Playwright tests with axe, the Pages workflow. 91 tests. |
| `08-x-ray-which-bin.txt` | x-ray (read-only), haiku 5.5 | Audited all 27 rules against the quoted sources: 2 unsupported, 7 stretched, 12 further findings. |
| `09-mcp-check-draft.txt` | default, auto, `--require-mcp-startup` | Used the `bones` MCP server only: checked the broken table, explained the gap and the conflict, evaluated three answer sets. |
| `10-design-polish.txt` | bonesetter, auto | Design pass on the shell and landing page after the owner looked at screenshots. |
| `11-fix-x-ray-findings.txt` | bonesetter, auto | Fixed the audit findings: an amount question for broken glass and lamps, one source per rule, clearer notes and copy. 93 tests. |
| `12-spec-playground.txt` | spec mode, sonnet 5.5 | Second round. The playground spec: 68 criteria, 1 property, 6 tasks; found the shell must become mountable and listed five departures from steering. |
| `13-impl-playground.txt` | bonesetter, auto | The playground page and the mountable shell; the 12 existing browser tests stayed green unchanged. 122 tests, 16 e2e. |
| `14-which-bin-first-screen.txt` | bonesetter, auto | Pictograms, short tiles and the keyword filter for Which bin?, switched on by copy data. 129 tests, 17 e2e. |
| `15-landing.txt` | bonesetter, auto | Landing page with the idea diagram and app-styled cards; playground layout, pass/fail marks, Undo. 137 tests, 20 e2e. |

The credit figures at the end of each file are the whole account's meter before and after the run. Other sessions may use the same account, so a difference is an upper bound for that run. Files are numbered in the order the prompts were written; `credits.log` has the order they ran (10, 08, 11, 09, then 12 to 15).
