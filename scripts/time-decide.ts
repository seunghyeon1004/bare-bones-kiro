// Measurement helper (requirement 16): how long does `decide` take on the largest table the engine accepts?
// Five conditions of ten values (100,000 combinations), 200 rules that each name all five conditions.
import { check, decide, validate } from '../skeleton/engine/index.ts';
import type { Table } from '../skeleton/engine/index.ts';

const ten = Array.from({ length: 10 }, (_, v) => v);
const valueId = (c: number, v: number): string => `c${c}-v${v}`;

const rules: Table['rules'] = [];
for (const copy of ['a', 'b']) {
  for (const i of ten) {
    for (const j of ten) {
      rules.push({
        id: `${copy}-${i}-${j}`,
        when: {
          c0: valueId(0, i),
          c1: valueId(1, j),
          c2: ten.map((v) => valueId(2, v)),
          c3: ten.map((v) => valueId(3, v)),
          c4: ten.map((v) => valueId(4, v)),
        },
        then: `o${(i + j) % 4}`,
        source: { ref: 's0', at: `row ${i}-${j}` },
      });
    }
  }
}

const candidate: Table = {
  id: 'large',
  title: 'Large',
  conditions: [0, 1, 2, 3, 4].map((c) => ({
    id: `c${c}`,
    question: `Question ${c}?`,
    values: ten.map((v) => ({ id: valueId(c, v), label: `Value ${c}.${v}` })),
  })),
  outcomes: [0, 1, 2, 3].map((o) => ({ id: `o${o}`, label: `Outcome ${o}`, detail: `Detail ${o}` })),
  rules,
  sources: [{ id: 's0', title: 'Generated', url: 'https://example.com/', published: 'unknown', read: '2026-01-01' }],
};

const valid = validate(candidate);
if (!valid.ok) {
  console.error('table is not valid:', JSON.stringify(valid.problems.slice(0, 3)));
  process.exit(1);
}
const report = check(valid.table);
if (!report.passed) {
  console.error(`table does not pass check: ${report.gaps.count} gaps, ${report.conflicts.length} conflicts`);
  process.exit(1);
}

const times: number[] = [];
for (let run = 0; run < 5; run++) {
  const start = performance.now();
  const result = decide(valid.table, {});
  times.push(performance.now() - start);
  if (result.status === 'error') {
    console.error('decide returned an error');
    process.exit(1);
  }
}
const first = times[0] ?? 0;
const median = [...times].sort((a, b) => a - b)[2] ?? 0;
console.log(`combinations: ${report.counts.combinations}, rules: ${report.counts.rules}`);
console.log(`decide first call ms: ${first.toFixed(1)}; all: ${times.map((t) => t.toFixed(1)).join(', ')}`);
console.log(`decide median ms: ${median.toFixed(1)}`);
if (first > 1000 || median > 1000) {
  console.error('over 1000 ms');
  process.exit(1);
}
