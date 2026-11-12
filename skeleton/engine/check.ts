import { advance, compile, matches, toCombination } from './space.ts';
import { MAX_GAP_EXAMPLES } from './types.ts';
import type { CheckReport, Combination, Conflict, Table, Warning } from './types.ts';

export function check(table: Table): CheckReport {
  const space = compile(table);
  const { rules, sizes } = space;

  // Gaps: walk every combination, odometer style.
  let gapCount = 0;
  const examples: Combination[] = [];
  const digits: number[] = sizes.map(() => 0);
  for (let i = 0; i < space.total; i++) {
    let hit = false;
    for (let r = 0; r < rules.length; r++) {
      const rule = rules[r];
      if (rule !== undefined && matches(rule, digits)) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      gapCount++;
      if (examples.length < MAX_GAP_EXAMPLES) examples.push(toCombination(space, digits));
    }
    advance(digits, sizes);
  }

  // Conflicts: two rules with different outcomes conflict when every condition has a shared accepted value.
  const conflicts: Conflict[] = [];
  for (let i = 0; i < rules.length; i++) {
    const a = rules[i];
    const ruleA = table.rules[i];
    if (a === undefined || ruleA === undefined) continue;
    for (let j = i + 1; j < rules.length; j++) {
      const b = rules[j];
      const ruleB = table.rules[j];
      if (b === undefined || ruleB === undefined || a.outcome === b.outcome) continue;
      const shared: number[] = [];
      let overlap = true;
      for (let c = 0; c < sizes.length && overlap; c++) {
        const ma = a.masks[c] ?? null;
        const mb = b.masks[c] ?? null;
        let found = -1;
        for (let v = 0; v < (sizes[c] ?? 0); v++) {
          if ((ma === null || ma[v] === 1) && (mb === null || mb[v] === 1)) {
            found = v;
            break;
          }
        }
        if (found < 0) overlap = false;
        else shared.push(found);
      }
      if (overlap) {
        conflicts.push({
          rules: [ruleA.id, ruleB.id],
          outcomes: [ruleA.then, ruleB.then],
          example: toCombination(space, shared),
        });
      }
    }
  }

  // Unused outcomes.
  const used = new Set<number>(rules.map((r) => r.outcome));
  const warnings: Warning[] = [];
  table.outcomes.forEach((o, i) => {
    if (!used.has(i)) {
      warnings.push({ kind: 'unused-outcome', path: `outcomes[${i}]`, message: `Outcome "${o.id}" is used by no rule.` });
    }
  });

  return {
    passed: gapCount === 0 && conflicts.length === 0,
    counts: { conditions: sizes.length, combinations: space.total, rules: rules.length },
    gaps: { count: gapCount, examples },
    conflicts,
    warnings,
  };
}
