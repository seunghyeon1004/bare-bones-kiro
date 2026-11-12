---
inclusion: always
---

# Kiro workflow

Specs live in `.kiro/specs/<name>/` with three files.

## requirements.md

EARS criteria, numbered `1.1`, `1.2`, ... under numbered requirements. Form: `WHEN <event> THE SYSTEM SHALL <response>` (or `IF`, `WHILE`, `WHERE`).

## design.md

Includes a section `## Correctness properties`. Each entry reads:

`Property N: for all <inputs>, <statement>. Validates: x.y`

Each property is one fast-check test whose name starts with `Property N` (for example `Property 5 decide ignores answer order`). The engine spec's properties are exactly I1 to I10 from invariants.md.

## tasks.md

Checkbox tasks. Each names the requirements it covers (`Requirements: 1.1, 2.3`) and has exactly one line `Verify: <command>`. Tick a task only after its Verify command ran in the same session and passed (see tech.md rule 5).

## Order of specs

1. `engine`: validate, check, decide, with properties I1 to I10.
2. `shell-and-cli`: page shell, build, `bones check`, `bones new`, MCP server, template, examples.
3. `apps`: `which-bin` and `which-licence` (table.json, copy.json, theme.css), e2e with axe, GitHub Pages workflow.

Do not start a spec before the previous one is fully ticked.

## Keep tests proportionate

- One property per invariant.
- A few examples per edge case (2 to 4), not a matrix.
- No test that restates another test.
