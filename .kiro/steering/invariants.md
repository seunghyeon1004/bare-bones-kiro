---
inclusion: always
---

# Engine invariants

No change may weaken these. Each is proved by one fast-check property of the given name, in `test/props/`. "Small random tables" means generated tables of at most 4 conditions with at most 4 values each.

- I1. Every example combination reported for a gap matches no rule. Property: `gap examples match no rule`
- I2. Every example reported for a conflict matches both rules of the pair, and the two rules have different outcomes. Property: `conflict examples match both rules with different outcomes`
- I3. A table that passes check yields exactly one outcome for every combination. Property: `passing table has exactly one outcome per combination`
- I4. Check finds every gap and every conflict: its gap count and conflicting pairs equal a brute-force enumeration on small random tables. Property: `check agrees with brute force`
- I5. Decide gives the same result for any ordering of the same answers. Property: `decide ignores answer order`
- I6. Decide only asks a relevant question (two consistent combinations differing only in it have different outcomes). Property: `decide asks only relevant questions`
- I7. Decide returns decided exactly when all consistent combinations share one outcome, and open otherwise. Property: `decide stops exactly when decided`
- I8. Answering each question decide asks, until it stops, gives the same outcome as evaluating the complete combination. Property: `full walk equals complete combination`
- I9. Setting any skipped question to any value never changes the decided outcome. Property: `skipped questions cannot change the outcome`
- I10. The engine reads only its arguments: same arguments, same result; no I/O, no `Date`, no `Math.random`. Property: `engine is pure`

Each property above is also named `Property N` in the spec's design.md (see kiro-workflow.md). Do not add a property that duplicates one of these.
