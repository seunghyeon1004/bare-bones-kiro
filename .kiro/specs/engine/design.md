# Design: engine

## Overview

The engine is four pure functions over plain data. `validate` turns unknown JSON into a `Table` or a list of problems. `check` finds gaps and conflicts in a `Table`. `decide` takes a `Table` and partial answers and returns a decided, open or error result. `evaluate` is `decide` called with a complete combination. All of it uses plain enumeration of the combination space (at most 100,000 combinations).

Two functions take a table, with different preconditions:

- `validate(input: unknown)`: no precondition.
- `check(table: Table)`, `decide(table, answers)`, `evaluate(table, combination)`: the table came from `validate` with `ok: true`. `decide` and `evaluate` also expect `check` to have passed (see "Errors").

A table passes overall when `validate` is ok and `check(...).passed` is true. The CLI, build script and MCP server do both calls; the engine does not combine them.

## Files

```
package.json  tsconfig.json  vitest.config.ts
skeleton/engine/types.ts      all exported types and the two constants
skeleton/engine/validate.ts   validate
skeleton/engine/space.ts      internal: index tables, rule masks, strides, matching (not exported from index.ts)
skeleton/engine/check.ts      check
skeleton/engine/decide.ts     decide, evaluate
skeleton/engine/index.ts      re-exports
test/tables.ts                small hand-written tables for the example tests (not a test file)
test/validate.test.ts  test/check.test.ts  test/decide.test.ts
test/props/generators.ts      all fast-check generators (one shared file)
test/props/oracle.ts          brute-force reference implementations used by the properties
test/props/check.props.test.ts    Properties 1 to 4
test/props/decide.props.test.ts   Properties 5 to 9
test/props/purity.props.test.ts   Property 10
```

Every test imports from `skeleton/engine/index.ts`, never from an inner file.

## Root config

- `package.json`: `"type": "module"`, `devDependencies` pinned as in `tech.md` (typescript 6.0.3, tsx 4.23.15, vitest 5.1.0, fast-check 4.10.2), scripts `typecheck` (`tsc --noEmit`), `test` (`vitest --run`), `test:props` (`vitest --run test/props`). The other `tech.md` scripts are added by the specs that create their targets. esbuild, Playwright, axe, the MCP SDK and zod are not installed here.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `noEmit`, `target`/`lib` ES2023, `module` ESNext, `moduleResolution` Bundler, `skipLibCheck`, `types: []`, `include` of `skeleton`, `test`, `e2e` and `vitest.config.ts`. These flags are what task 1 starts with. If TypeScript 6.0.3 rejects one, the task stops and reports it instead of dropping a strict flag. Later specs add what they need (the `DOM` lib for the shell, Node types for the CLI).
- `vitest.config.ts`: `include: ['test/**/*.test.ts']`, `environment: 'node'`.

## Types (`types.ts`)

```ts
export const MAX_COMBINATIONS = 100000;
export const MAX_GAP_EXAMPLES = 20;

export interface Value { id: string; label: string; hint?: string }
export interface Condition { id: string; question: string; help?: string; values: Value[] }
export interface Outcome { id: string; label: string; detail: string }
export interface Rule {
  id: string;
  when: Record<string, string | string[]>;
  then: string;
  note?: string;
  source: { ref: string; at: string };
}
export interface Source { id: string; title: string; url: string; published: string; read: string }
export interface Table {
  id: string; title: string;
  conditions: Condition[]; outcomes: Outcome[]; rules: Rule[]; sources: Source[];
}

export type Combination = Readonly<Record<string, string>>; // one entry per condition, table order
export type Answers = Readonly<Record<string, string>>;     // any subset of the conditions

export type ProblemKind =
  | 'bad-shape' | 'bad-id' | 'duplicate-id' | 'too-few-values' | 'empty-when-list'
  | 'unknown-condition' | 'unknown-value' | 'unknown-outcome' | 'unknown-source'
  | 'too-many-combinations';
export interface Problem { kind: ProblemKind; path: string; message: string }
export type ValidationResult = { ok: true; table: Table } | { ok: false; problems: Problem[] };

export interface Warning { kind: 'unused-outcome'; path: string; message: string }
export interface Conflict {
  rules: [string, string];      // rule ids, earlier rule first
  outcomes: [string, string];   // outcome ids, same order
  example: Combination;
}
export interface CheckReport {
  passed: boolean;
  counts: { conditions: number; combinations: number; rules: number };
  gaps: { count: number; examples: Combination[] };
  conflicts: Conflict[];
  warnings: Warning[];
}

export interface Question {
  condition: string; question: string; help?: string;
  values: { id: string; label: string; hint?: string }[];
}
export interface DecidedResult {
  status: 'decided';
  outcome: Outcome;
  rules: { id: string; note?: string; source: { ref: string; at: string } }[];
  mattered: { condition: string; question: string; value: string; label: string }[];
  sources: Source[];
  skipped: { condition: string; question: string }[];
}
export interface OpenResult {
  status: 'open';
  next: Question;
  relevant: { condition: string; worstCase: number }[];
}
export interface ErrorResult { status: 'error'; errors: Problem[] }
export type DecideResult = DecidedResult | OpenResult | ErrorResult;
```

Optional fields (`help`, `hint`, `note`) are left out of results when the table does not have them. A result never holds `undefined`.

## validate

`validate(input: unknown): ValidationResult`.

Problems are collected in this fixed visiting order, so the output is deterministic:

1. Table `id` and `title`.
2. `conditions`, each condition in order: its fields, its `id`, then its `values` (fields, ids, duplicates, count).
3. `outcomes`, then `sources`, each in order (fields, ids, duplicates).
4. `rules`, each in order: fields, id, duplicate id, then `then`, `source.ref`, then each `when` entry in the object's key order. Sources and outcomes are visited before rules so that references can be resolved while visiting a rule.
5. The combination count, last.

Paths follow `rules[3].when.kind` and `rules[3].when.kind[1]`. The root is reported as `$` (only used for "input is not an object"). Other paths have no prefix.

Rules for reporting:

- **Shape first.** A field with a bad shape gets one `bad-shape`. Checks that depend on it (id format, duplicates, references) are skipped for that field, so one defect gives one problem.
- **No cascades.** A reference is resolved only against well-formed items. A `when` entry for a condition whose `values` is malformed is not checked for `unknown-value`. A duplicate id resolves to its first occurrence.
- **Id format.** `^[a-z0-9]+(-[a-z0-9]+)*$`. This also keeps ids safe in URL hashes (`#kind=glass`).
- **Own keys only.** Condition, value and `when` lookups go through `Map`s built from the table's own ids, so names like `constructor` or `__proto__` are unknown, never inherited. The same holds for answers in `decide`.
- **Combination count.** Multiply the value counts of the conditions that have a `values` array, stopping as soon as the product exceeds 100,000. No overflow is possible. It is reported once, at `conditions`. A condition with fewer than two values is also reported, separately.
- **Extra keys** on any object are ignored. Dates (`published`, `read`) are only checked to be strings; `source.at` is free text.

## Internal index (`space.ts`)

`compile(table)` builds, in one pass over the table:

- `Map`s from condition id, value id (per condition) and outcome id to numeric indexes;
- for each rule: its outcome index and `tests`, a list of `{ c, allowed }` for the conditions it names, where `allowed` is a `Uint8Array` of length `values.length` (1 = value accepted). Unnamed conditions have no test, so they cost nothing per combination;
- `stride[c]` = product of the value counts of the conditions after `c`. The combination with digits `d` has index `Σ d[c]·stride[c]`, so index order is enumeration order (first condition slowest).

A rule matches a combination (digits `d`) when every test has `allowed[d[c]] === 1`; a test list is scanned in order and stops at the first failure.

## check

`check(table: Table): CheckReport`.

**Gaps.** Walk all `N` combinations in enumeration order with an odometer (increment the last digit, carry left). For each, scan the rules until one matches. If none does, add 1 to `gaps.count` and, while fewer than 20 examples are held, store the combination as `{ conditionId: valueId }`. Nothing else is stored, so `check` uses memory proportional to the table plus 20 examples.

**Conflicts.** No enumeration. Rules `i < j` (positions) with different outcomes conflict exactly when, for every condition `c`, the accepted values of `i` and `j` share at least one value (an unnamed condition accepts all values). The combination space is a product, so such a shared choice per condition exists exactly when some combination is matched by both rules. The example is the first one in enumeration order: for each condition, the first value (in table order) accepted by both. Pairs are produced in `(i, j)` order, which is the required order, and no pair is produced twice.

**Unused outcomes.** An outcome index no rule uses gives a warning at `outcomes[i]`.

`passed` is `gaps.count === 0 && conflicts.length === 0`. Warnings never affect it. `counts.combinations` is the product of the value counts.

Why the table "has exactly one outcome per combination" when it passes (4.8): no gap means every combination has at least one matching rule. No conflict means no two rules with different outcomes share a combination, so all matching rules of a combination have one outcome.

## decide

`decide(table: Table, answers: Answers): DecideResult`. Steps:

1. **Resolve answers.** Look up each answer's condition and value in the index maps. Collect every failure as a `Problem` (`unknown-condition` or `unknown-value`, path `answers.<id>`, a non-string value counts as `unknown-value`). If there are failures, return `{ status: 'error', errors }` sorted by condition id with plain `<` comparison, not locale order, so the key order of `answers` cannot change the result. Otherwise `fixed[c]` is the answered value index or -1.
2. **Candidate rules.** A rule is a candidate if it accepts every answered value (`allowed[fixed[c]] === 1` for each of its tests on an answered condition). Its remaining tests are those on unanswered ("free") conditions. A rule that rejects an answer matches no consistent combination and is dropped.
3. **Enumerate the consistent combinations.** They are the product of the values of the free conditions, `M` combinations, walked with the same odometer. For each, scan all candidates: the first match gives the outcome; any later match with another outcome, or no match at all, throws (see "Errors"). Store the outcome index in `out`, an `Int32Array(M)`.
4. **Decided?** If every `out[i]` is equal, build the decided result (below). Otherwise continue.
5. **Relevance and worst case**, in one pass over `out` for the free conditions `k` (each with stride `s_k` inside the consistent space and `n_k` values):
   - `k` is relevant if some index `i` whose digit for `k` is below `n_k - 1` has `out[i] !== out[i + s_k]`. Checking neighbouring values is enough: if the outcomes along a line (all other digits fixed) are not all equal, two neighbours differ.
   - For each free condition `k`, value `v`, keep the set of outcomes seen among combinations whose digit for `k` is `v`: a `Uint8Array` indexed `[(k, v) slot][outcome]` and a counter per slot. `worstCase(k)` is the maximum counter over `v`.
6. **Pick `next`.** Among relevant conditions take the smallest `worstCase`; on a tie take the lowest condition index. Return `{ status: 'open', next, relevant }`.

**An open result always has a relevant condition.** If the consistent combinations have two different outcomes, change one free digit at a time from the first combination to the second. Every step stays inside the consistent set (the answered conditions never change), and at some step the outcome changes. The condition changed in that step is relevant.

**Building the decided result.** The outcome is `out[0]`'s outcome object. The firing rules are exactly the candidates: a candidate accepts every answer and has a non-empty set of accepted values on each of its free tests, so it matches at least one consistent combination. All of them have the decided outcome because the table passed `check`. `mattered` is the answered conditions that appear in some firing rule's `when` (named, whatever the values), in table order. `sources` is each distinct `source.ref` of firing rules, as the full source record, in table source order. `skipped` is every free condition, in table order. When decided, every free condition is irrelevant by definition, which is why all of them can be listed as skipped.

**Order independence.** The result is built from table order only. Answer key order is used nowhere except to collect the errors, which are then sorted.

**`evaluate(table, combination)`** is `decide(table, combination)`. For a complete combination `M = 1`, so the result is `decided`. A caller who passes an incomplete combination gets what `decide` gives for those answers.

## Errors

- Bad answers are data: `{ status: 'error', errors }`.
- A table that has not passed `validate` and `check` is a caller bug. `decide` throws an `Error` instead of returning a made-up outcome. The message names the combination, says whether it has no rule or has rules with different outcomes, and ends with "run check first". It cannot be silent: the scan in step 3 looks at every candidate rule for every consistent combination. A table that failed `validate` may also throw a `TypeError`; the engine does not defend against that.

## Cost

Symbols: `N` combinations (at most 100,000), `R` rules, `C` conditions, `T` conditions named by a rule (at most `C`), `M` consistent combinations, `F` unanswered conditions, `V` total values.

| Call | Time | Memory |
| --- | --- | --- |
| `validate` | linear in table size | linear in table size |
| `check`, gaps | at most `N · R · T` (stops at the first matching rule and the first failing test) | table + 20 examples |
| `check`, conflicts | at most `R² / 2 · C · V` | table |
| `decide` | at most `M · R · T` for step 3, plus `M · F` for step 5 | `Int32Array(M)` (400 KB at 100,000) plus `V · outcomes` bytes |

`M` is `N` divided by the product of the value counts of the answered conditions, so every answer at least halves it. The `decide` calls in one full walk therefore cost at most about twice the first call (`N`, `N/2`, `N/4`, ...).

Worst case for one `decide` call: no answers, `N = 100,000`, 200 rules each naming 10 conditions, none failing early: about `2 × 10^8` array reads. My estimate is 0.3 to 1 second on a laptop and a few seconds on a slow phone. It is an estimate; nothing here has been measured.

Is that fine for a page? For the two planned apps, yes. They are small decisions (a few thousand combinations at most, under 100 rules), which is about `10^6` steps, a few milliseconds. At the 100,000 cap with a large rule set, the first call could be noticeable on a phone. The cap is the owner's choice; the shell spec should time `decide` on a 100,000-combination table and decide whether anything is needed. No cache is added: a cache would be hidden state between calls (Property 10) and the realistic cost does not call for one.

## Testing

**Example tests** (the only ones; each uses a small table from `test/tables.ts`):

- `test/validate.test.ts`
  - One row per structural error kind, nine rows: `bad-shape`, `bad-id`, `duplicate-id`, `too-few-values`, `empty-when-list`, `unknown-condition`, `unknown-value`, `unknown-outcome`, `unknown-source`. Each row changes one thing in a valid base table and expects exactly the listed problems with `kind` and `path`. The `unknown-value` row has two bad references in two rules and expects both problems (criterion 3.2).
  - The 100,000 limit: five conditions of ten values (exactly 100,000) gives `ok: true`; adding a sixth condition of two values gives `too-many-combinations` at `conditions`.
- `test/check.test.ts`
  - Two overlapping rules with the same outcome: no conflict, `passed: true`.
  - A table with one condition: counts and `passed` are right.
- `test/decide.test.ts`
  - An unknown answer is rejected: one unknown condition, one unknown value, both as `status: 'error'` with the right kind and path.
  - A table with one condition: open with that condition as `next`; after answering, decided.

Not covered by an example test, by the owner's list: throwing on an unchecked table (8.2). `unused-outcome` (4.5), `passed` and `counts` (4.6, 4.7), and the content of the decided result (7.1 to 7.4) are asserted inside the property bodies below.

**Generators** (`test/props/generators.ts`, small tables only: 1 to 4 conditions, 2 to 4 values each, at most 256 combinations):

- `arbTable`: a structurally valid table with random rules (each `when` entry absent, one value, or a non-empty subset), so it may have gaps and conflicts. Ids are `c0`, `c0-v1`, `o0`, `r0`, `s0`, which are valid kebab-case. The generator passes each table through `validate` and throws if it is not ok, so a generator bug cannot hide behind a property.
- `arbPassingTable`: always passes `check`. It builds a random decision tree: each internal node splits one unused condition into groups of values, each leaf has an outcome, and each leaf becomes a rule naming the conditions on its path (a group of one value as a string, otherwise an array). Leaves partition the space, so there are no gaps or conflicts. Then 0 to 2 extra rules are added, each a random sub-box of a leaf with that leaf's outcome (overlaps that agree). Outcomes are drawn from 1 to 4, so some are unused and the walks often decide early.
- `arbAnswers(table)`: for each condition, absent or a random value. `arbComplete(table)`: a value for every condition.
- `arbOrdering`: a permutation of the answer entries, for Property 5.

**Oracle** (`test/props/oracle.ts`): brute-force functions written from the definitions in the requirements, importing only types from the engine: `matches`, `enumerate` (cartesian product, first condition slowest), `outcomesOf(combo)`, `consistent(answers)`, `gaps`, `conflicts` (all pairs seen on any combination), `relevant(answers)`, `worstCase`, `pick`, `firingRules`. The properties compare the engine with the oracle. The engine is never mocked or stubbed.

Each property runs 200 cases (`numRuns: 200`) and is named `Property N <invariant name>` using the property names in `invariants.md`.

## Correctness properties

Property 1: for all small tables (`arbTable`), every example in `gaps.examples` is a complete valid combination, matches no rule, and there are at most 20 of them, in enumeration order. Validates: 4.1, 4.2

Property 2: for all small tables, every `conflicts[k].example` is a complete valid combination matched by both rules of the pair, and the two rules have different outcomes. Validates: 4.3

Property 3: for all small tables that pass `check` (half drawn from `arbPassingTable`, half from `arbTable` filtered to `passed`), every combination is matched by at least one rule, the matching rules all share one outcome, and `evaluate` returns that outcome. Validates: 4.8, 8.1

Property 4: for all small tables, `gaps.count`, the set of conflicting rule pairs (with their outcome ids), the `unused-outcome` warnings, `passed` and `counts` equal what the oracle gets by brute-force enumeration. Validates: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7

Property 5: for all small passing tables, answer sets and two orderings of the answer entries, `decide` returns results with identical JSON text. Validates: 5.4

Property 6: for all small passing tables and answer sets whose result is open, `relevant` equals the oracle's relevant conditions with the oracle's worst cases, `next` is in `relevant`, and `next` is the oracle's pick (smallest worst case, earliest condition on ties), so an irrelevant or answered condition is never asked. Validates: 6.1, 6.2, 6.3, 6.4

Property 7: for all small passing tables and answer sets, `decide` returns `decided` exactly when the oracle finds one outcome among the consistent combinations, and `open` otherwise; when decided, `outcome`, `rules`, `mattered` and `sources` equal the oracle's. Validates: 5.2, 5.3, 7.1, 7.2, 7.3, 7.4

Property 8: for all small passing tables and complete combinations, answering each question `decide` asks from that combination, until `decide` returns decided, ends with the same outcome as `evaluate` on the combination, in at most as many steps as there are conditions. Validates: 7.7, 8.1

Property 9: for all small passing tables and answer sets whose result is decided, `skipped` is exactly the unanswered conditions in table order, and adding to the answers any skipped condition with any of its values still gives `decided` with the same outcome. Validates: 7.5, 7.6

Property 10: for all small tables and answer sets, `validate`, `check`, `decide` and `evaluate` give identical JSON text when called twice, give it again on deep-frozen deep copies of the arguments (so any mutation would throw), each result strictly equals its own JSON round trip (no `undefined`, `Map`, `Set` or class instance), and all of it runs with `Date`, `Math.random` and `performance.now` replaced by functions that throw for the duration of the call. Validates: 2.2, 9.1, 9.2

Property 10 replaces three globals only around the engine call and restores them in `finally`. That is not mocking the subject. It cannot see I/O, so "no imports" is checked separately by the grep in task 8 (criterion 2.3).

## Traceability of the example-only and command-only criteria

| Criterion | Checked by |
| --- | --- |
| 1.1 to 1.5 | task 1 command |
| 2.1 | every test imports from `index.ts`; `npm run typecheck` |
| 2.3 | grep in task 8 |
| 3.1, 3.12 | the limit test (`ok: true` at exactly 100,000) |
| 3.2 to 3.11 | the nine rows in `test/validate.test.ts` |
| 4.9, 6.5 | the one-condition tests |
| 5.1 | the unknown-answer test |
| 8.2 | nothing (see "Testing") |

## Points the owner may want to change

- The overall pass is `validate` plus `check`, two calls, not one. Merging them is a small change if wanted.
- Throwing for an unchecked table in `decide`, instead of an error result, keeps the result type small; it adds one untested branch.
- `evaluate` on an incomplete combination returns whatever `decide` gives (possibly open), it does not fail.
- The selection rule (6.3), the decided-result content (7.1 to 7.4) and the unused-outcome warning are asserted inside Properties 6, 7 and 4. Those bodies check slightly more than the one-line text of I6, I7 and I4.
- The node types (`@types/node`) are not in the `tech.md` list. The CLI, build and MCP specs will need them for `tsc --noEmit`. That is a question for the owner before the `shell-and-cli` spec.
