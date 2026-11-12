import { describe, expect, it } from 'vitest';
import { check } from '../skeleton/engine/index.ts';
import type { Table } from '../skeleton/engine/index.ts';
import { baseTable } from './tables.ts';

describe('check', () => {
  it('does not report a conflict for overlapping rules with the same outcome', () => {
    const table = baseTable();
    table.rules.push({ id: 'r4', when: { kind: ['glass', 'plastic'], clean: 'yes' }, then: 'recycle', source: { ref: 's1', at: 'A4' } });
    const report = check(table);
    expect(report.conflicts).toEqual([]);
    expect(report.gaps).toEqual({ count: 0, examples: [] });
    expect(report.passed).toBe(true);
    expect(report.counts).toEqual({ conditions: 2, combinations: 4, rules: 4 });
  });

  it('checks a table with one condition', () => {
    const table: Table = {
      id: 'one',
      title: 'One condition',
      conditions: [
        {
          id: 'kind',
          question: 'Which?',
          values: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        },
      ],
      outcomes: [
        { id: 'x', label: 'X', detail: 'x' },
        { id: 'y', label: 'Y', detail: 'y' },
      ],
      rules: [{ id: 'r1', when: { kind: 'a' }, then: 'x', source: { ref: 's1', at: 'p1' } }],
      sources: [{ id: 's1', title: 'S', url: 'https://example.com', published: 'unknown', read: '2026-01-01' }],
    };
    const gapped = check(table);
    expect(gapped.passed).toBe(false);
    expect(gapped.counts).toEqual({ conditions: 1, combinations: 2, rules: 1 });
    expect(gapped.gaps).toEqual({ count: 1, examples: [{ kind: 'b' }] });
    expect(gapped.warnings.map((w) => w.path)).toEqual(['outcomes[1]']);

    table.rules.push({ id: 'r2', when: { kind: 'b' }, then: 'y', source: { ref: 's1', at: 'p2' } });
    const fixed = check(table);
    expect(fixed.passed).toBe(true);
    expect(fixed.warnings).toEqual([]);
  });
});
