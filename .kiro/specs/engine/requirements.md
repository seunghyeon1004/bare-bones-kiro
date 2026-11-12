# Requirements: engine

Scope: the types, `validate`, `check`, `decide` and `evaluate` in `skeleton/engine/`, an `index.ts` that exports them, and the repo-wide `package.json`, `tsconfig.json` and vitest config. Source of truth for behaviour: `docs/product-brief.md`, `.kiro/steering/invariants.md`, `.kiro/steering/table-format.md`.

Out of scope: the page shell, the landing page, filtering bad answers from a shared link (the shell does that; the engine rejects them), the CLI, the MCP server, the build script, any table under `apps/`.

## Terms

- **Combination**: one value id for every condition, as `{ [conditionId]: valueId }` with keys in table condition order.
- **Matches**: a rule matches a combination when, for every condition named in the rule's `when`, the combination's value equals the named value id or is one of the named value ids. A condition not named in `when` matches every value.
- **Enumeration order**: combinations in the order of the conditions, first condition varying slowest, values in table order.
- **Gap**: a combination no rule matches.
- **Conflict**: a pair of rules with different outcomes that both match at least one combination.
- **Answers**: `{ [conditionId]: valueId }` for any subset of the conditions.
- **Consistent combinations**: those that agree with every answer.
- **Relevant** (condition): unanswered, and two consistent combinations that differ only in that condition have different outcomes.
- **Worst case** (of a relevant condition): the largest, over its values, of the number of distinct outcomes among the consistent combinations that also have that value.

## Requirement 1: Repo tooling

**User story:** As the owner, I want one pinned, dependency-free setup so that every later spec uses the same scripts.

1.1 WHEN `package.json` is read THE SYSTEM SHALL contain `"type": "module"`, no `dependencies` key, and `devDependencies` of exactly typescript 6.0.3, tsx 4.23.15, vitest 5.1.0 and fast-check 4.10.2, each an exact version with no `^` or `~`.

1.2 WHEN `npm run typecheck` runs THE SYSTEM SHALL run `tsc --noEmit` over all TypeScript in the repo with `strict: true` and report no errors.

1.3 WHEN `npm test` runs THE SYSTEM SHALL run vitest once (`vitest --run`) over `test/**/*.test.ts`, including `test/props/*.props.test.ts`.

1.4 WHEN `npm run test:props` runs THE SYSTEM SHALL run `vitest --run test/props`.

1.5 WHERE a script named in `tech.md` points at a file this spec does not create (`test:e2e`, `build`, `bones`) THE SYSTEM SHALL leave that script undefined until the spec that creates the file adds it.

## Requirement 2: Engine surface

**User story:** As the author of the CLI, MCP server and page shell, I want one import and plain data so that every consumer can print results as JSON.

2.1 WHEN a consumer imports `skeleton/engine/index.ts` THE SYSTEM SHALL export the functions `validate`, `check`, `decide` and `evaluate`, the constants `MAX_COMBINATIONS` (100000) and `MAX_GAP_EXAMPLES` (20), and every type that appears in their signatures.

2.2 WHEN any engine function returns THE SYSTEM SHALL return only plain JSON data (objects, arrays, strings, numbers, booleans), with no class instances, `Map`, `Set`, functions or `undefined` values.

2.3 WHERE a file is in `skeleton/engine/` THE SYSTEM SHALL import only other files in `skeleton/engine/`: no packages, no Node built-ins, no other folder.

## Requirement 3: validate

**User story:** As a table author, I want every structural problem reported with its path so that I can fix them in one pass.

3.1 WHEN `validate` receives a table with no problems THE SYSTEM SHALL return `{ ok: true, table }` with the input typed as `Table`.

3.2 WHEN `validate` finds problems THE SYSTEM SHALL return `{ ok: false, problems }` listing every problem found, not only the first, each as `{ kind, path, message }`, in a fixed order (see design).

3.3 IF the input is not an object, or a required field is missing or has the wrong JSON type (including a list that is not an array, a `when` entry that is neither a string nor an array of strings, and an optional field that is present but not a string), THEN THE SYSTEM SHALL report `bad-shape` at the path of that field.

3.4 IF a table, condition, value, outcome, rule or source id does not match `^[a-z0-9]+(-[a-z0-9]+)*$` THEN THE SYSTEM SHALL report `bad-id` at that id's path.

3.5 IF two items in the same list share an id (conditions; values within one condition; outcomes; rules; sources) THEN THE SYSTEM SHALL report `duplicate-id` at the later item's id.

3.6 IF a condition has fewer than two values THEN THE SYSTEM SHALL report `too-few-values` at `conditions[i].values`.

3.7 IF a rule's `when` maps a condition to an empty array THEN THE SYSTEM SHALL report `empty-when-list` at `rules[i].when.<condition id>`.

3.8 IF a rule's `when` names a condition id that is not in `conditions` THEN THE SYSTEM SHALL report `unknown-condition` at `rules[i].when.<condition id>`.

3.9 IF a rule's `when` names a value id that is not a value of that condition THEN THE SYSTEM SHALL report `unknown-value` at `rules[i].when.<condition id>` (single value) or `rules[i].when.<condition id>[k]` (array entry).

3.10 IF a rule's `then` is not an outcome id THEN THE SYSTEM SHALL report `unknown-outcome` at `rules[i].then`.

3.11 IF a rule's `source.ref` is not a source id THEN THE SYSTEM SHALL report `unknown-source` at `rules[i].source.ref`, and SHALL accept any string for `source.at`.

3.12 IF the product of the value counts of all conditions is more than 100,000 THEN THE SYSTEM SHALL report `too-many-combinations` at `conditions`; a product of exactly 100,000 SHALL be accepted.

## Requirement 4: check

**User story:** As a table author, I want to know every hole and contradiction in my table so that I can trust it.

4.1 WHEN `check` receives a validated table THE SYSTEM SHALL count the gaps by examining every combination, and report the total as `gaps.count`.

4.2 WHEN the table has gaps THE SYSTEM SHALL report in `gaps.examples` the first 20 gap combinations in enumeration order (all of them if there are fewer than 20).

4.3 WHEN two rules with different outcomes both match some combination THE SYSTEM SHALL report that pair once in `conflicts`, as `{ rules: [earlierRuleId, laterRuleId], outcomes: [outcomeOfEarlier, outcomeOfLater], example }`, where `example` is the first combination in enumeration order that both rules match, and SHALL order the conflicts by the position of the earlier rule, then of the later rule.

4.4 WHEN two rules match a common combination and have the same outcome THE SYSTEM SHALL NOT report a conflict for them.

4.5 WHEN an outcome is produced by no rule THE SYSTEM SHALL add a warning `{ kind: 'unused-outcome', path: 'outcomes[i]', message }`, and the warning SHALL NOT change `passed`.

4.6 WHEN the table has no gaps and no conflicts THE SYSTEM SHALL report `passed: true`; otherwise `passed: false`.

4.7 THE SYSTEM SHALL report `counts` as the number of conditions, the number of combinations and the number of rules.

4.8 IF `check` reports `passed: true` THEN THE SYSTEM SHALL guarantee that every combination is matched by at least one rule and that all rules matching it have the same outcome, so each combination has exactly one outcome.

4.9 WHEN the table has one condition THE SYSTEM SHALL check it like any other table.

## Requirement 5: decide, answers and status

**User story:** As the page shell, I want a result that depends only on the set of answers so that links and back-navigation behave.

5.1 IF the answers name a condition that is not in the table, or a value that is not a value of the named condition, THEN THE SYSTEM SHALL return `{ status: 'error', errors }` with one `unknown-condition` or `unknown-value` problem per bad answer at path `answers.<condition id>`, ordered by condition id (plain string order), and SHALL NOT ignore any answer.

5.2 WHEN the answers are valid and all consistent combinations have the same outcome THE SYSTEM SHALL return `status: 'decided'`.

5.3 WHEN the answers are valid and the consistent combinations have more than one outcome THE SYSTEM SHALL return `status: 'open'`.

5.4 WHEN `decide` is called with the same answers inserted in a different order THE SYSTEM SHALL return a result whose JSON text is identical.

## Requirement 6: decide, the next question

**User story:** As a user, I want to be asked the fewest questions, and never one that cannot change my answer.

6.1 WHEN the result is open THE SYSTEM SHALL list in `relevant` exactly the relevant conditions, in table order, each as `{ condition, worstCase }`.

6.2 THE SYSTEM SHALL compute `worstCase` for a relevant condition as the largest, over its values, of the number of distinct outcomes among the consistent combinations that also have that value.

6.3 WHEN the result is open THE SYSTEM SHALL choose `next` as the relevant condition with the smallest `worstCase`, and when several tie, the one that comes first in the table's condition order.

6.4 WHEN the result is open THE SYSTEM SHALL return `next` as the full question of that condition: `{ condition, question, help?, values: [{ id, label, hint? }] }`.

6.5 WHEN the table has one condition with at least two different outcomes and no answers are given THE SYSTEM SHALL return open with that condition as `next`.

## Requirement 7: decide, the decided result

**User story:** As a user, I want to see the outcome, why it applies and which questions were not needed.

7.1 WHEN the result is decided THE SYSTEM SHALL return `outcome` as the table's `{ id, label, detail }` for that outcome.

7.2 WHEN the result is decided THE SYSTEM SHALL return `rules` as every rule that matches at least one consistent combination, in table order, each as `{ id, note?, source: { ref, at } }`.

7.3 WHEN the result is decided THE SYSTEM SHALL return `mattered` as the answered conditions named in the `when` of at least one of those rules, in table order, each as `{ condition, question, value, label }`.

7.4 WHEN the result is decided THE SYSTEM SHALL return `sources` as the full source record of each distinct source cited by those rules, in table source order.

7.5 WHEN the result is decided THE SYSTEM SHALL return `skipped` as every unanswered condition, in table order, each as `{ condition, question }`.

7.6 WHEN the result is decided and any skipped condition is then answered with any of its values THE SYSTEM SHALL return decided with the same outcome.

7.7 WHEN the questions that `decide` asks are answered from one complete combination, until `decide` stops, THE SYSTEM SHALL return the same outcome as `evaluate` on that complete combination.

## Requirement 8: evaluate and the table precondition

**User story:** As a consumer, I want a plain "what is the outcome of this complete combination" call.

8.1 WHEN `evaluate` receives a table that passed `check` and a complete combination THE SYSTEM SHALL return the same result as `decide` with those answers, with the outcome being the one outcome that every rule matching the combination gives.

8.2 IF `decide` meets a consistent combination that no rule matches, or that rules with different outcomes match, THEN THE SYSTEM SHALL throw an `Error` that names the combination and says to run `check` first.

## Requirement 9: purity

**User story:** As the author of the browser build, I want the engine to behave the same everywhere.

9.1 WHEN `validate`, `check`, `decide` or `evaluate` is called twice with equal arguments THE SYSTEM SHALL return equal results, and SHALL NOT modify its arguments.

9.2 THE SYSTEM SHALL read nothing except its arguments: no `Date`, `Math.random`, `console`, `process`, `fetch`, file or network access, and no state kept between calls.

## Owner answers

1. Criterion 8.2 stays and gets one example test in `test/decide.test.ts`: a table with a gap, where `decide` on answers that reach the gap throws; the same for a conflict.
2. The extra checks inside Properties 4, 6 and 7 are accepted.
3. "Passing" means `validate` ok and `check` passed, two calls: accepted.
4. `evaluate` on an incomplete combination returning open: accepted.
5. Id pattern `^[a-z0-9]+(-[a-z0-9]+)*$`, dates as strings, extra keys ignored: accepted.
6. `@types/node` arrives with the shell-and-cli spec; the engine must not need it.
7. If TypeScript 6.0.3 rejects a tsconfig option, report it; never drop a strict flag.
