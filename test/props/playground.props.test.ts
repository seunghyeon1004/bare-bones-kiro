import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { analyse } from '../../skeleton/playground/analyse.ts';
import { formatTable, removeRule } from '../../skeleton/playground/rules.ts';
import { arbPassingTable } from './generators.ts';
import * as oracle from './oracle.ts';

describe('playground properties', () => {
  it('Property 13 removing a rule exposes exactly the combinations only it covered', () => {
    fc.assert(
      fc.property(arbPassingTable, fc.nat(), (table, seed) => {
        fc.pre(table.rules.length > 0);
        const index = seed % table.rules.length;
        const removed = table.rules[index];
        if (removed === undefined) throw new Error('no rule at index');

        const text = removeRule(formatTable(table), index);
        const analysis = analyse(text);
        expect(analysis.kind).toBe('checked');
        if (analysis.kind !== 'checked') return;

        // The table read back is the original without rule `index`; every other key is equal.
        const original = JSON.parse(JSON.stringify(table)) as typeof table;
        expect(JSON.parse(text)).toEqual({ ...original, rules: original.rules.filter((_, i) => i !== index) });

        const rest = analysis.table;
        const onlyIt = oracle
          .enumerate(table)
          .filter((combo) => oracle.matches(removed, combo) && !rest.rules.some((rule) => oracle.matches(rule, combo)));

        const { report } = analysis;
        expect(report.conflicts).toEqual([]);
        expect(report.gaps.count).toBe(onlyIt.length);
        expect(report.passed).toBe(onlyIt.length === 0);
        expect(report.gaps.examples).toEqual(onlyIt.slice(0, 20));
        for (const example of report.gaps.examples) {
          expect(oracle.matches(removed, example)).toBe(true);
          expect(rest.rules.some((rule) => oracle.matches(rule, example))).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });
});
