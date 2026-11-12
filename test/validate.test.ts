import { describe, expect, it } from 'vitest';
import { validate } from '../skeleton/engine/index.ts';
import type { Table } from '../skeleton/engine/index.ts';
import { baseTable, gridTable } from './tables.ts';

function problemsOf(input: unknown): { kind: string; path: string }[] {
  const result = validate(input);
  if (result.ok) return [];
  return result.problems.map((p) => ({ kind: p.kind, path: p.path }));
}

describe('validate', () => {
  it('accepts the base table and returns it', () => {
    const table = baseTable();
    const result = validate(table);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.table).toEqual(table);
  });

  const rows: { name: string; change: (t: Table) => void; expected: { kind: string; path: string }[] }[] = [
    {
      name: 'bad-shape',
      change: (t) => {
        (t as unknown as Record<string, unknown>)['title'] = 5;
      },
      expected: [{ kind: 'bad-shape', path: 'title' }],
    },
    {
      name: 'bad-id',
      change: (t) => {
        t.rules[0]!.id = 'R_1';
      },
      expected: [{ kind: 'bad-id', path: 'rules[0].id' }],
    },
    {
      name: 'duplicate-id',
      change: (t) => {
        t.rules[1]!.id = 'r1';
      },
      expected: [{ kind: 'duplicate-id', path: 'rules[1].id' }],
    },
    {
      name: 'too-few-values',
      change: (t) => {
        t.conditions[1]!.values = [{ id: 'yes', label: 'Yes' }];
        t.rules[2]!.when = { kind: 'plastic', clean: 'yes' };
      },
      expected: [{ kind: 'too-few-values', path: 'conditions[1].values' }],
    },
    {
      name: 'empty-when-list',
      change: (t) => {
        t.rules[0]!.when = { clean: [] };
      },
      expected: [{ kind: 'empty-when-list', path: 'rules[0].when.clean' }],
    },
    {
      name: 'unknown-condition',
      change: (t) => {
        t.rules[0]!.when = { size: 'big' };
      },
      expected: [{ kind: 'unknown-condition', path: 'rules[0].when.size' }],
    },
    {
      name: 'unknown-value (two bad references in two rules)',
      change: (t) => {
        t.rules[0]!.when = { kind: 'metal' };
        t.rules[2]!.when = { kind: 'plastic', clean: ['no', 'maybe'] };
      },
      expected: [
        { kind: 'unknown-value', path: 'rules[0].when.kind' },
        { kind: 'unknown-value', path: 'rules[2].when.clean[1]' },
      ],
    },
    {
      name: 'unknown-outcome',
      change: (t) => {
        t.rules[0]!.then = 'burn';
      },
      expected: [{ kind: 'unknown-outcome', path: 'rules[0].then' }],
    },
    {
      name: 'unknown-source',
      change: (t) => {
        t.rules[0]!.source.ref = 'nowhere';
      },
      expected: [{ kind: 'unknown-source', path: 'rules[0].source.ref' }],
    },
  ];

  for (const row of rows) {
    it(`reports ${row.name}`, () => {
      const table = baseTable();
      row.change(table);
      expect(problemsOf(table)).toEqual(row.expected);
    });
  }

  it('does not treat inherited names as conditions or values', () => {
    const table = baseTable();
    table.rules[0]!.when = { constructor: 'x', kind: 'toString' };
    expect(problemsOf(table)).toEqual([
      { kind: 'unknown-condition', path: 'rules[0].when.constructor' },
      { kind: 'unknown-value', path: 'rules[0].when.kind' },
    ]);
  });

  it('reports a non-object input at $', () => {
    expect(problemsOf(null)).toEqual([{ kind: 'bad-shape', path: '$' }]);
  });

  it('accepts exactly 100,000 combinations and rejects more', () => {
    const atLimit = gridTable([10, 10, 10, 10, 10]);
    expect(validate(atLimit).ok).toBe(true);
    const over = gridTable([10, 10, 10, 10, 10, 2]);
    expect(problemsOf(over)).toEqual([{ kind: 'too-many-combinations', path: 'conditions' }]);
  });
});
