// Brute-force reference implementations, written from the definitions in requirements.md.
// Imports only types from the engine.
import type { Answers, Combination, Rule, Source, Table } from '../../skeleton/engine/index.ts';

export function matches(rule: Rule, combo: Combination): boolean {
  for (const [conditionId, entry] of Object.entries(rule.when)) {
    const value = combo[conditionId];
    const accepted = typeof entry === 'string' ? [entry] : entry;
    if (value === undefined || !accepted.includes(value)) return false;
  }
  return true;
}

/** Cartesian product, first condition slowest, values in table order. */
export function enumerate(table: Table): Combination[] {
  let all: Record<string, string>[] = [{}];
  for (const condition of table.conditions) {
    const next: Record<string, string>[] = [];
    for (const partial of all) {
      for (const value of condition.values) next.push({ ...partial, [condition.id]: value.id });
    }
    all = next;
  }
  return all;
}

/** Distinct outcome ids of the rules matching `combo`, in table order. */
export function outcomesOf(table: Table, combo: Combination): string[] {
  const seen: string[] = [];
  for (const rule of table.rules) {
    if (matches(rule, combo) && !seen.includes(rule.then)) seen.push(rule.then);
  }
  return seen;
}

export function gaps(table: Table): Combination[] {
  return enumerate(table).filter((combo) => !table.rules.some((rule) => matches(rule, combo)));
}

export function conflicts(table: Table): { rules: [string, string]; outcomes: [string, string] }[] {
  const all = enumerate(table);
  const found: { rules: [string, string]; outcomes: [string, string] }[] = [];
  table.rules.forEach((a, i) => {
    table.rules.forEach((b, j) => {
      if (j <= i || a.then === b.then) return;
      if (all.some((combo) => matches(a, combo) && matches(b, combo))) {
        found.push({ rules: [a.id, b.id], outcomes: [a.then, b.then] });
      }
    });
  });
  return found;
}

export function unusedOutcomePaths(table: Table): string[] {
  const used = new Set(table.rules.map((r) => r.then));
  return table.outcomes.flatMap((o, i) => (used.has(o.id) ? [] : [`outcomes[${i}]`]));
}

export function consistent(table: Table, answers: Answers): Combination[] {
  return enumerate(table).filter((combo) => Object.entries(answers).every(([k, v]) => combo[k] === v));
}

/** The single outcome of a combination in a passing table. */
export function outcomeOf(table: Table, combo: Combination): string {
  const outcomes = outcomesOf(table, combo);
  if (outcomes.length !== 1) throw new Error(`oracle: ${outcomes.length} outcomes for ${JSON.stringify(combo)}`);
  return outcomes[0] ?? '';
}

export function distinctOutcomes(table: Table, combos: Combination[]): string[] {
  return [...new Set(combos.map((c) => outcomeOf(table, c)))];
}

/** Relevant conditions with their worst cases, in table order. */
export function relevant(table: Table, answers: Answers): { condition: string; worstCase: number }[] {
  const space = consistent(table, answers);
  const result: { condition: string; worstCase: number }[] = [];
  for (const condition of table.conditions) {
    if (answers[condition.id] !== undefined) continue;
    const isRelevant = space.some((x) =>
      condition.values.some((v) => {
        const y = { ...x, [condition.id]: v.id };
        return outcomeOf(table, y) !== outcomeOf(table, x);
      }),
    );
    if (!isRelevant) continue;
    const worstCase = Math.max(
      ...condition.values.map((v) => distinctOutcomes(table, space.filter((c) => c[condition.id] === v.id)).length),
    );
    result.push({ condition: condition.id, worstCase });
  }
  return result;
}

/** Smallest worst case; earliest condition on ties (the list is already in table order). */
export function pick(list: { condition: string; worstCase: number }[]): string | undefined {
  let best: { condition: string; worstCase: number } | undefined;
  for (const item of list) {
    if (best === undefined || item.worstCase < best.worstCase) best = item;
  }
  return best?.condition;
}

/** Rules that match at least one consistent combination, in table order. */
export function firingRules(table: Table, answers: Answers): Rule[] {
  const space = consistent(table, answers);
  return table.rules.filter((rule) => space.some((combo) => matches(rule, combo)));
}

export function matteredConditions(table: Table, answers: Answers): string[] {
  const firing = firingRules(table, answers);
  return table.conditions
    .filter((c) => answers[c.id] !== undefined && firing.some((r) => Object.hasOwn(r.when, c.id)))
    .map((c) => c.id);
}

export function sourcesOf(table: Table, rules: Rule[]): Source[] {
  const refs = new Set(rules.map((r) => r.source.ref));
  return table.sources.filter((s) => refs.has(s.id));
}
