import type { Table } from '../skeleton/engine/index.ts';

/**
 * Small valid table that passes check: two conditions, two outcomes, three rules.
 * Returns a fresh object each call so tests can change it freely.
 */
export function baseTable(): Table {
  return {
    id: 'base',
    title: 'Base table',
    conditions: [
      {
        id: 'kind',
        question: 'What is it made of?',
        values: [
          { id: 'glass', label: 'Glass' },
          { id: 'plastic', label: 'Plastic' },
        ],
      },
      {
        id: 'clean',
        question: 'Is it clean?',
        help: 'Rinsed out.',
        values: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No', hint: 'Food is still on it' },
        ],
      },
    ],
    outcomes: [
      { id: 'recycle', label: 'Recycle', detail: 'Put it in the recycling bin.' },
      { id: 'trash', label: 'Trash', detail: 'Put it in general waste.' },
    ],
    rules: [
      { id: 'r1', when: { kind: 'glass' }, then: 'recycle', source: { ref: 's1', at: 'A1' } },
      { id: 'r2', when: { kind: 'plastic', clean: 'yes' }, then: 'recycle', note: 'Rinsed plastic', source: { ref: 's1', at: 'A2' } },
      { id: 'r3', when: { kind: 'plastic', clean: 'no' }, then: 'trash', source: { ref: 's1', at: 'A3' } },
    ],
    sources: [{ id: 's1', title: 'Guide', url: 'https://example.com/guide', published: '2025-01-01', read: '2026-01-01' }],
  };
}

/** A table with `counts.length` conditions; condition k has counts[k] values, and one rule matching everything. */
export function gridTable(counts: number[]): Table {
  return {
    id: 'grid',
    title: 'Grid',
    conditions: counts.map((n, k) => ({
      id: `c${k}`,
      question: `Question ${k}?`,
      values: Array.from({ length: n }, (_, v) => ({ id: `v${v}`, label: `Value ${v}` })),
    })),
    outcomes: [{ id: 'o0', label: 'Only', detail: 'The only outcome.' }],
    rules: [{ id: 'r0', when: {}, then: 'o0', source: { ref: 's0', at: 'x' } }],
    sources: [{ id: 's0', title: 'Source', url: 'https://example.com', published: 'unknown', read: '2026-01-01' }],
  };
}
