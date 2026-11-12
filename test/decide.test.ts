import { describe, expect, it } from 'vitest';
import { decide, evaluate } from '../skeleton/engine/index.ts';
import type { Table } from '../skeleton/engine/index.ts';
import { baseTable } from './tables.ts';

function oneConditionTable(): Table {
  return {
    id: 'one',
    title: 'One condition',
    conditions: [
      {
        id: 'kind',
        question: 'Which?',
        help: 'Pick one.',
        values: [
          { id: 'a', label: 'A', hint: 'first' },
          { id: 'b', label: 'B' },
        ],
      },
    ],
    outcomes: [
      { id: 'x', label: 'X', detail: 'x' },
      { id: 'y', label: 'Y', detail: 'y' },
    ],
    rules: [
      { id: 'r1', when: { kind: 'a' }, then: 'x', source: { ref: 's1', at: 'p1' } },
      { id: 'r2', when: { kind: 'b' }, then: 'y', note: 'because', source: { ref: 's1', at: 'p2' } },
    ],
    sources: [{ id: 's1', title: 'S', url: 'https://example.com', published: 'unknown', read: '2026-01-01' }],
  };
}

describe('decide', () => {
  it('rejects unknown answers instead of ignoring them', () => {
    const result = decide(baseTable(), { zeta: 'glass', kind: 'metal', clean: 'yes' });
    expect(result).toEqual({
      status: 'error',
      errors: [
        { kind: 'unknown-value', path: 'answers.kind', message: expect.any(String) },
        { kind: 'unknown-condition', path: 'answers.zeta', message: expect.any(String) },
      ],
    });
  });

  it('does not treat inherited names as answers', () => {
    const result = decide(baseTable(), { constructor: 'x' });
    expect(result.status).toBe('error');
  });

  it('asks the only condition, then decides', () => {
    const table = oneConditionTable();
    const open = decide(table, {});
    expect(open).toEqual({
      status: 'open',
      next: {
        condition: 'kind',
        question: 'Which?',
        help: 'Pick one.',
        values: [
          { id: 'a', label: 'A', hint: 'first' },
          { id: 'b', label: 'B' },
        ],
      },
      relevant: [{ condition: 'kind', worstCase: 1 }],
    });

    const done = decide(table, { kind: 'b' });
    expect(done).toEqual({
      status: 'decided',
      outcome: { id: 'y', label: 'Y', detail: 'y' },
      rules: [{ id: 'r2', note: 'because', source: { ref: 's1', at: 'p2' } }],
      mattered: [{ condition: 'kind', question: 'Which?', value: 'b', label: 'B' }],
      sources: table.sources,
      skipped: [],
    });
    expect(evaluate(table, { kind: 'b' })).toEqual(done);
  });

  it('throws when the answers reach a gap', () => {
    const table = oneConditionTable();
    table.rules.pop();
    expect(() => decide(table, {})).toThrow(/run check first/);
    expect(() => decide(table, { kind: 'b' })).toThrow(/"kind":"b".*run check first/);
    expect(decide(table, { kind: 'a' }).status).toBe('decided');
  });

  it('throws when the answers reach a conflict', () => {
    const table = oneConditionTable();
    table.rules.push({ id: 'r3', when: { kind: 'a' }, then: 'y', source: { ref: 's1', at: 'p3' } });
    expect(() => decide(table, { kind: 'a' })).toThrow(/"kind":"a".*run check first/);
    expect(decide(table, { kind: 'b' }).status).toBe('decided');
  });
});
