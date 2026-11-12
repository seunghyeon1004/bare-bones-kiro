import fc from 'fast-check';
import { check, validate } from '../../skeleton/engine/index.ts';
import type { Answers, Combination, Table } from '../../skeleton/engine/index.ts';

/** Per condition: null = not named in `when`, otherwise the accepted value indexes (non-empty). */
export type WhenSpec = (number[] | null)[];
export interface RuleSpec { when: WhenSpec; then: number }

/** Builds a table with ids c0, c0-v1, o0, r0, s0 and checks it with `validate`; a generator bug throws. */
export function makeTable(sizes: number[], nOutcomes: number, rules: RuleSpec[]): Table {
  const table: Table = {
    id: 'generated',
    title: 'Generated',
    conditions: sizes.map((n, k) => ({
      id: `c${k}`,
      question: `Question ${k}?`,
      values: Array.from({ length: n }, (_, v) => ({ id: `c${k}-v${v}`, label: `Value ${k}.${v}` })),
    })),
    outcomes: Array.from({ length: nOutcomes }, (_, i) => ({ id: `o${i}`, label: `Outcome ${i}`, detail: `Detail ${i}` })),
    rules: rules.map((rule, i) => {
      const when: Record<string, string | string[]> = {};
      rule.when.forEach((list, k) => {
        if (list === null) return;
        const ids = list.map((v) => `c${k}-v${v}`);
        when[`c${k}`] = ids.length === 1 && ids[0] !== undefined && i % 2 === 0 ? ids[0] : ids;
      });
      return { id: `r${i}`, when, then: `o${rule.then}`, source: { ref: 's0', at: `row ${i}` } };
    }),
    sources: [{ id: 's0', title: 'Generated source', url: 'https://example.com', published: 'unknown', read: '2026-01-01' }],
  };
  const result = validate(table);
  if (!result.ok) throw new Error(`generator bug: ${JSON.stringify(result.problems)}`);
  return result.table;
}

const arbSizes = fc.array(fc.integer({ min: 2, max: 4 }), { minLength: 1, maxLength: 4 });

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function arbEntry(n: number): fc.Arbitrary<number[] | null> {
  return fc.oneof(
    { weight: 3, arbitrary: fc.constant<number[] | null>(null) },
    { weight: 2, arbitrary: fc.integer({ min: 0, max: n - 1 }).map((v): number[] | null => [v]) },
    { weight: 2, arbitrary: fc.subarray(range(n), { minLength: 1 }) as fc.Arbitrary<number[] | null> },
  );
}

/** A structurally valid small table with random rules; it may have gaps and conflicts. */
export const arbTable: fc.Arbitrary<Table> = fc
  .record({ sizes: arbSizes, nOutcomes: fc.integer({ min: 1, max: 4 }) })
  .chain(({ sizes, nOutcomes }) =>
    fc
      .array(
        fc.record({
          when: fc.tuple(...sizes.map((n) => arbEntry(n))) as fc.Arbitrary<WhenSpec>,
          then: fc.integer({ min: 0, max: nOutcomes - 1 }),
        }),
        { maxLength: 8 },
      )
      .map((rules) => makeTable(sizes, nOutcomes, rules)),
  );

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A table that always passes check: leaves of a random decision tree partition the space. */
export const arbPassingTable: fc.Arbitrary<Table> = fc
  .record({
    sizes: arbSizes,
    nOutcomes: fc.integer({ min: 1, max: 4 }),
    seed: fc.integer({ min: 0, max: 2 ** 31 }),
    extra: fc.integer({ min: 0, max: 2 }),
  })
  .map(({ sizes, nOutcomes, seed, extra }) => {
    const rnd = mulberry32(seed);
    const pick = (n: number): number => Math.floor(rnd() * n);
    const leaves: RuleSpec[] = [];

    const grow = (path: WhenSpec, unused: number[]): void => {
      if (unused.length === 0 || rnd() < 0.15) {
        leaves.push({ when: path.map((p) => (p === null ? null : [...p])), then: pick(nOutcomes) });
        return;
      }
      const c = unused[pick(unused.length)] ?? 0;
      const n = sizes[c] ?? 2;
      const groups = 1 + pick(n);
      const buckets: number[][] = Array.from({ length: groups }, () => []);
      for (let v = 0; v < n; v++) buckets[pick(groups)]?.push(v);
      for (const bucket of buckets) {
        if (bucket.length === 0) continue;
        const next = path.slice();
        next[c] = bucket;
        grow(next, unused.filter((u) => u !== c));
      }
    };
    grow(
      sizes.map(() => null),
      range(sizes.length),
    );

    const rules = leaves.slice();
    for (let e = 0; e < extra; e++) {
      const leaf = leaves[pick(leaves.length)];
      if (leaf === undefined) break;
      const when: WhenSpec = leaf.when.map((list, c) => {
        const pool = list ?? range(sizes[c] ?? 2);
        if (list === null && rnd() < 0.5) return null;
        const chosen = pool.filter(() => rnd() < 0.6);
        return chosen.length > 0 ? chosen : [pool[pick(pool.length)] ?? 0];
      });
      rules.push({ when, then: leaf.then });
    }
    return makeTable(sizes, nOutcomes, rules);
  });

/** For each condition: absent or a random value. */
export function arbAnswers(table: Table): fc.Arbitrary<Answers> {
  const entries = table.conditions.map((c) =>
    fc.option(fc.constantFrom(...c.values.map((v) => v.id)), { nil: undefined, freq: 2 }),
  );
  return fc.tuple(...entries).map((picked) => {
    const answers: Record<string, string> = {};
    table.conditions.forEach((c, k) => {
      const v = picked[k];
      if (v !== undefined) answers[c.id] = v;
    });
    return answers;
  });
}

/** A value for every condition. */
export function arbComplete(table: Table): fc.Arbitrary<Combination> {
  const entries = table.conditions.map((c) => fc.constantFrom(...c.values.map((v) => v.id)));
  return fc.tuple(...entries).map((picked) => {
    const combo: Record<string, string> = {};
    table.conditions.forEach((c, k) => {
      combo[c.id] = picked[k] ?? '';
    });
    return combo;
  });
}

/** A permutation of the entries of `answers`, as a new object with the keys inserted in that order. */
export function arbOrdering(answers: Answers): fc.Arbitrary<Answers> {
  const keys = Object.keys(answers);
  return fc.shuffledSubarray(keys, { minLength: keys.length, maxLength: keys.length }).map((order) => {
    const out: Record<string, string> = {};
    for (const key of order) out[key] = answers[key] ?? '';
    return out;
  });
}

/** A table with answers, drawn together. */
export function arbTableWithAnswers(source: fc.Arbitrary<Table>): fc.Arbitrary<{ table: Table; answers: Answers }> {
  return source.chain((table) => arbAnswers(table).map((answers) => ({ table, answers })));
}

/** A table that passes check: half from the tree generator, half random tables that happen to pass. */
export const arbCheckedTable: fc.Arbitrary<Table> = fc.oneof(
  arbPassingTable,
  arbTable.filter((table) => check(table).passed),
);
