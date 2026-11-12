Implement the spec in .kiro/specs/shell-and-cli/: tasks 1 to 8, in order. Read requirements.md, design.md and tasks.md fully first, the steering, and the engine code in skeleton/engine/ (done and tested; do not change its behaviour).

Owner answers to your spec session. Record them first in a short "Owner answers" section at the end of requirements.md and adjust design.md and tasks.md where they change something:
1. Shared pieces: move the check report formatter to skeleton/engine/format.ts (pure, no imports outside the engine, exported from index.ts) and use it from both the CLI and the build; the build does not spawn the CLI. The build may `import type` from skeleton/shell (the Copy type) and nothing else from it; change the task 8 grep so it still forbids value imports from shell into build.
2. Extra labels `published`, `outcome`, `yourAnswers` accepted. Add `noscript`: the build writes the copy title (as the h1), tagline, intro and `labels.noscript` into the static HTML, so the page is not blank without JavaScript; the script takes over from there.
3. Dark colours are required in every theme.css.
4. Additions accepted: the CSP meta tag, http(s)-only links, unknown copy.json keys are errors, `new` sets the table title.
5. No jsdom. Browser behaviour is tested in the apps spec.
6. Behaviours confirmed: invalid JSON exits 1; table view scrolls in its own region; tiles show hints.
7. New, from the apps spec session: add `--font-size` (base font size, used as the root font size) and `--heading-font` weight-free stack to the theme contract, so a theme can set larger type.
8. @types/node is pinned as you found it.

Tasks 3 and 4 may be done together. Task 7 (timing decide on a 100,000-combination table) must report the measured time; if it is over 1,000 ms on the first call, say so and stop there, do not add a cache.

npm install is allowed (network for npm only). Work one task at a time; after each, run its Verify command and only then tick it, quoting the result line. Never weaken a check. Do not stage, commit or push. Do not create anything under apps/.

End with the real output of `npm run typecheck && npm test` (last 15 lines), `npm run bones -- check skeleton/examples/gap.table.json` and `npm run bones -- check skeleton/examples/conflict.table.json` (full output), the files you created, and anything left open.
