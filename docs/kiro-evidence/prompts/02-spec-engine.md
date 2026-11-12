Write the spec `engine` in .kiro/specs/engine/ (requirements.md, design.md, tasks.md), following .kiro/steering/kiro-workflow.md. Read docs/product-brief.md and all steering first. Write nothing outside .kiro/specs/engine/.

Owner answers to the points you raised in the steering session:
- TypeScript is pinned to 6.0.3 (tech.md was corrected by hand).
- Next question: among the relevant questions, for each one take the worst of its values, measured as the number of distinct outcomes among the consistent combinations once that value is added; pick the question with the smallest worst case; ties go to the earlier condition in the table. Put this in a criterion.
- Conflicts: report every conflicting pair of rules once, ordered by rule position, each with one example combination. Gaps: the total count plus up to 20 examples in enumeration order (first condition varies slowest).
- Filtering of bad answers from a shared link lives in the shell, not the engine. The engine rejects them.
- The landing page belongs to skeleton/shell (shell-and-cli spec).
- `source.at` is free text; the table-format rule about Refs stands. The engine only checks that `source.ref` names a source in the table.
- Property files: keep `test/props/*.props.test.ts`.
- I9 as you wrote it.

Scope of this spec: the types, `validate`, `check`, `decide` (and `evaluate` for a complete combination, as a thin wrapper over decide) in skeleton/engine/, with an index.ts exporting them, plus package.json, tsconfig.json and vitest config for the whole repo, with the pinned versions from tech.md (install only what this spec needs: typescript, tsx, vitest, fast-check). Return values are plain data (no classes), so the CLI, MCP server and browser can print them as JSON. Decide's result carries everything the page needs for "why": outcome, firing rule ids, what mattered, notes, sources, skipped questions; or the next question and the list of relevant ones.

Design for the 100,000 combination limit with plain enumeration; say what the worst-case cost of decide is per call and whether that is fine for a page.

Correctness properties: exactly I1 to I10. Add example tests only for: each structural error kind (one each), the 100,000 limit, a table with one condition, overlapping rules that agree (not a conflict), and an unknown answer being rejected. Generators for random small tables go in one shared file under test/props/.

Tasks: at most 8, each with one Verify command. End with a summary: number of criteria, properties and tasks, and anything you are unsure of.
