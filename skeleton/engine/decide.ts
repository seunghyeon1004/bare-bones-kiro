import { compile } from './space.ts';
import type { CompiledRule } from './space.ts';
import type { Answers, Combination, DecideResult, Problem, Question, Table } from './types.ts';

export function decide(table: Table, answers: Answers): DecideResult {
  const space = compile(table);
  const { sizes } = space;
  const nCond = sizes.length;

  // 1. Resolve the answers against the table's own ids.
  const fixed: number[] = sizes.map(() => -1);
  const errors: (Problem & { sortKey: string })[] = [];
  for (const key of Object.keys(answers)) {
    const c = space.conditionIndex.get(key);
    if (c === undefined) {
      errors.push({ kind: 'unknown-condition', path: `answers.${key}`, message: `"${key}" is not a condition id.`, sortKey: key });
      continue;
    }
    const value: unknown = answers[key];
    const v = typeof value === 'string' ? space.valueIndex[c]?.get(value) : undefined;
    if (v === undefined) {
      errors.push({
        kind: 'unknown-value',
        path: `answers.${key}`,
        message: `${JSON.stringify(value)} is not a value of condition "${key}".`,
        sortKey: key,
      });
      continue;
    }
    fixed[c] = v;
  }
  if (errors.length > 0) {
    errors.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
    return { status: 'error', errors: errors.map(({ kind, path, message }) => ({ kind, path, message })) };
  }

  // 2. Candidate rules: those accepting every answered value, with only their free tests left.
  interface Candidate { index: number; rule: CompiledRule; freeTests: CompiledRule['tests'] }
  const candidates: Candidate[] = [];
  space.rules.forEach((rule, index) => {
    for (const t of rule.tests) {
      const f = fixed[t.c] ?? -1;
      if (f >= 0 && t.allowed[f] !== 1) return;
    }
    candidates.push({ index, rule, freeTests: rule.tests.filter((t) => (fixed[t.c] ?? -1) < 0) });
  });

  // 3. Enumerate the consistent combinations (product of the free conditions).
  const free: number[] = [];
  for (let c = 0; c < nCond; c++) if ((fixed[c] ?? -1) < 0) free.push(c);
  const freeStride: number[] = new Array<number>(free.length).fill(1);
  let m = 1;
  for (let k = free.length - 1; k >= 0; k--) {
    freeStride[k] = m;
    m *= sizes[free[k] ?? 0] ?? 1;
  }
  const digits: number[] = fixed.map((f) => Math.max(f, 0));
  const out = new Int32Array(m);
  const describe = (): string => {
    const combo: Combination = Object.fromEntries(space.conditionIds.map((id, c) => [id, space.valueIds[c]?.[digits[c] ?? 0] ?? '']));
    return JSON.stringify(combo);
  };
  for (let i = 0; i < m; i++) {
    let outcome = -1;
    for (const cand of candidates) {
      let ok = true;
      for (const t of cand.freeTests) {
        if (t.allowed[digits[t.c] ?? 0] !== 1) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (outcome === -1) outcome = cand.rule.outcome;
      else if (outcome !== cand.rule.outcome) {
        throw new Error(`decide: combination ${describe()} is matched by rules with different outcomes; run check first.`);
      }
    }
    if (outcome === -1) {
      throw new Error(`decide: combination ${describe()} is matched by no rule; run check first.`);
    }
    out[i] = outcome;
    // Advance the odometer over the free conditions only.
    for (let k = free.length - 1; k >= 0; k--) {
      const c = free[k] ?? 0;
      const next = (digits[c] ?? 0) + 1;
      if (next < (sizes[c] ?? 0)) {
        digits[c] = next;
        break;
      }
      digits[c] = 0;
    }
  }

  // 4. Decided?
  const first = out[0] ?? 0;
  let allSame = true;
  for (let i = 1; i < m; i++) {
    if (out[i] !== first) {
      allSame = false;
      break;
    }
  }
  if (allSame) {
    const outcome = table.outcomes[first];
    if (outcome === undefined) throw new Error('decide: outcome index out of range; run check first.');
    const firing = new Set(candidates.map((c) => c.index));
    const rules = table.rules.flatMap((r, i) =>
      firing.has(i) ? [{ id: r.id, ...(r.note !== undefined ? { note: r.note } : {}), source: { ref: r.source.ref, at: r.source.at } }] : [],
    );
    const mattered = table.conditions.flatMap((cond, c) => {
      const f = fixed[c] ?? -1;
      if (f < 0 || !candidates.some((cand) => cand.rule.masks[c] != null)) return [];
      const value = cond.values[f];
      return value === undefined ? [] : [{ condition: cond.id, question: cond.question, value: value.id, label: value.label }];
    });
    const refs = new Set(rules.map((r) => r.source.ref));
    return {
      status: 'decided',
      outcome: { id: outcome.id, label: outcome.label, detail: outcome.detail },
      rules,
      mattered,
      sources: table.sources.filter((s) => refs.has(s.id)).map((s) => ({ ...s })),
      skipped: free.map((c) => ({ condition: space.conditionIds[c] ?? '', question: table.conditions[c]?.question ?? '' })),
    };
  }

  // 5. Relevance and worst case.
  const nOut = table.outcomes.length;
  const slotOffset: number[] = [];
  let slots = 0;
  for (const c of free) {
    slotOffset.push(slots);
    slots += sizes[c] ?? 0;
  }
  const seen = new Uint8Array(slots * nOut);
  const seenCount = new Int32Array(slots);
  const relevantFlag: boolean[] = free.map(() => false);
  for (let k = 0; k < free.length; k++) {
    const n = sizes[free[k] ?? 0] ?? 1;
    const s = freeStride[k] ?? 1;
    const base = slotOffset[k] ?? 0;
    for (let i = 0; i < m; i++) {
      const v = Math.floor(i / s) % n;
      const o = out[i] ?? 0;
      const slot = base + v;
      if (seen[slot * nOut + o] === 0) {
        seen[slot * nOut + o] = 1;
        seenCount[slot] = (seenCount[slot] ?? 0) + 1;
      }
      if (v < n - 1 && o !== out[i + s]) relevantFlag[k] = true;
    }
  }

  const relevant: { condition: string; worstCase: number }[] = [];
  let bestK = -1;
  let bestWorst = Infinity;
  for (let k = 0; k < free.length; k++) {
    if (relevantFlag[k] !== true) continue;
    let worst = 0;
    const n = sizes[free[k] ?? 0] ?? 0;
    for (let v = 0; v < n; v++) worst = Math.max(worst, seenCount[(slotOffset[k] ?? 0) + v] ?? 0);
    relevant.push({ condition: space.conditionIds[free[k] ?? 0] ?? '', worstCase: worst });
    if (worst < bestWorst) {
      bestWorst = worst;
      bestK = k;
    }
  }

  // 6. Pick next.
  const nextCondition = table.conditions[free[bestK] ?? -1];
  if (nextCondition === undefined) throw new Error('decide: open result without a relevant condition; run check first.');
  const next: Question = {
    condition: nextCondition.id,
    question: nextCondition.question,
    ...(nextCondition.help !== undefined ? { help: nextCondition.help } : {}),
    values: nextCondition.values.map((v) => ({ id: v.id, label: v.label, ...(v.hint !== undefined ? { hint: v.hint } : {}) })),
  };
  return { status: 'open', next, relevant };
}

/** `decide` called with a complete combination. */
export function evaluate(table: Table, combination: Combination): DecideResult {
  return decide(table, combination);
}
