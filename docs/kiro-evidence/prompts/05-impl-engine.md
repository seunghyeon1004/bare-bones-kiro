Implement the spec in .kiro/specs/engine/: tasks 1 to 8, in order. Read requirements.md, design.md and tasks.md fully first, and the steering (tech.md, structure.md, invariants.md, kiro-workflow.md).

Owner answers to your spec session, record them in the spec first (a short "Owner answers" section at the end of requirements.md):
1. Criterion 8.2 stays and gets one example test in test/decide.test.ts (a table with a gap: decide on answers that reach the gap throws; same for a conflict).
2. The extra checks inside Properties 4, 6 and 7 are accepted.
3. Passing = validate ok and check passed, two calls: accepted.
4. evaluate on an incomplete combination returning open: accepted.
5. Id pattern `^[a-z0-9]+(-[a-z0-9]+)*$`, dates as strings, extra keys ignored: accepted.
6. @types/node arrives with the shell-and-cli spec; the engine must not need it.
7. If TypeScript 6.0.3 rejects a tsconfig option, report it; never drop a strict flag.

npm install is allowed (network for npm only). Work one task at a time; after each, run its Verify command and only then tick it, quoting the result line. Never weaken a property, generator or check to get green: if a property fails, find out whether the engine or the property is wrong and say which, with the counterexample fast-check printed. Do not stage, commit or push.

End with the real output of `npm run typecheck && npm test` (last 15 lines), the list of files you created, and anything left open.
