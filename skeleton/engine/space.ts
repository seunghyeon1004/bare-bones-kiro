import type { Combination, Table } from './types.ts';

/** One condition a rule names: `allowed[v] === 1` when value index v is accepted. */
export interface RuleTest {
  c: number;
  allowed: Uint8Array;
}

export interface CompiledRule {
  /** Index into the table's outcomes. */
  outcome: number;
  /** Tests on the conditions the rule names, in condition order. */
  tests: RuleTest[];
  /** Per condition: the accepted-values mask, or null when the rule does not name it (accepts all). */
  masks: (Uint8Array | null)[];
}

export interface Space {
  conditionIds: string[];
  valueIds: string[][];
  sizes: number[];
  /** stride[c] = product of the value counts of the conditions after c. */
  stride: number[];
  /** Number of combinations. */
  total: number;
  conditionIndex: Map<string, number>;
  valueIndex: Map<string, number>[];
  outcomeIndex: Map<string, number>;
  rules: CompiledRule[];
}

/** Builds the index of a validated table in one pass. */
export function compile(table: Table): Space {
  const conditionIds = table.conditions.map((c) => c.id);
  const valueIds = table.conditions.map((c) => c.values.map((v) => v.id));
  const sizes = valueIds.map((v) => v.length);
  const conditionIndex = new Map<string, number>();
  conditionIds.forEach((id, c) => {
    if (!conditionIndex.has(id)) conditionIndex.set(id, c);
  });
  const valueIndex = valueIds.map((ids) => {
    const m = new Map<string, number>();
    ids.forEach((id, v) => {
      if (!m.has(id)) m.set(id, v);
    });
    return m;
  });
  const outcomeIndex = new Map<string, number>();
  table.outcomes.forEach((o, i) => {
    if (!outcomeIndex.has(o.id)) outcomeIndex.set(o.id, i);
  });

  const stride: number[] = new Array<number>(sizes.length).fill(1);
  let total = 1;
  for (let c = sizes.length - 1; c >= 0; c--) {
    stride[c] = total;
    total *= sizes[c] ?? 1;
  }

  const rules = table.rules.map((rule): CompiledRule => {
    const masks: (Uint8Array | null)[] = sizes.map(() => null);
    const tests: RuleTest[] = [];
    for (const key of Object.keys(rule.when)) {
      const c = conditionIndex.get(key);
      if (c === undefined) continue;
      const allowed = new Uint8Array(sizes[c] ?? 0);
      const entry = rule.when[key];
      const list = typeof entry === 'string' ? [entry] : (entry ?? []);
      for (const valueId of list) {
        const v = valueIndex[c]?.get(valueId);
        if (v !== undefined) allowed[v] = 1;
      }
      masks[c] = allowed;
    }
    masks.forEach((allowed, c) => {
      if (allowed !== null) tests.push({ c, allowed });
    });
    return { outcome: outcomeIndex.get(rule.then) ?? -1, tests, masks };
  });

  return { conditionIds, valueIds, sizes, stride, total, conditionIndex, valueIndex, outcomeIndex, rules };
}

/** True when the rule accepts the combination with value indexes `digits`. Stops at the first failing test. */
export function matches(rule: CompiledRule, digits: ArrayLike<number>): boolean {
  const tests = rule.tests;
  for (let t = 0; t < tests.length; t++) {
    const test = tests[t];
    if (test === undefined || test.allowed[digits[test.c] ?? 0] !== 1) return false;
  }
  return true;
}

/** Moves `digits` to the next combination in enumeration order (last digit fastest). */
export function advance(digits: number[], sizes: number[]): void {
  for (let c = digits.length - 1; c >= 0; c--) {
    const next = (digits[c] ?? 0) + 1;
    if (next < (sizes[c] ?? 0)) {
      digits[c] = next;
      return;
    }
    digits[c] = 0;
  }
}

/** The combination `{ conditionId: valueId }` for value indexes `digits`, keys in condition order. */
export function toCombination(space: Space, digits: ArrayLike<number>): Combination {
  const out: Record<string, string> = {};
  space.conditionIds.forEach((id, c) => {
    out[id] = space.valueIds[c]?.[digits[c] ?? 0] ?? '';
  });
  return out;
}
