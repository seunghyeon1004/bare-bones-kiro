Implement the spec in .kiro/specs/playground/: tasks 1 to 6, in order. Read requirements.md, design.md and tasks.md fully first, the steering (the owner has updated product.md and structure.md with your Departures 1 and 2), and the shell and build code.

Owner answers, record them first in an "Owner answers" section at the end of requirements.md, and amend the older specs' numbers where your Departure 3 says (shell-and-cli 11.1/11.7, apps 10.10 and its task 5 Verify, the Landing type), as amendments, not rewrites:
1. Keep `headingOffset`; class selectors for headings in shell.css are accepted (Departure 5).
2. Preview theme via `style.setProperty` is accepted (Departure 4). The larger `--font-size` of which-bin need not show in the preview.
3. Re-serialising the JSON with two-space indentation on rule removal is fine.
4. "Would not build" covering structure, gaps and conflicts is enough; say "the table fails the check" rather than claiming to run the whole build.
5. Display caps (5 gaps, 5 conflicts, 10 errors) accepted. Answers reset on a table change: accepted.
6. Measure `check` on the which-bin table in the browser once (console timing in the e2e test is enough) and report the number.

npm install is allowed (npm only). One task at a time; after each, run its Verify command, then tick it with the quoted result line. Never weaken a check or an existing test: every existing e2e test must stay green unchanged except for counts the amendments name. Do not stage, commit or push.

End with the real output of `npm run typecheck && npm test && npm run test:e2e` (last 20 lines), the files you created or changed, and anything left open.
