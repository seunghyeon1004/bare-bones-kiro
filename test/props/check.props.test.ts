import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { check, evaluate } from '../../skeleton/engine/index.ts';
import type { Combination, Table } from '../../skeleton/engine/index.ts';
import { arbCheckedTable, arbTable } from './generators.ts';
import * as oracle from './oracle.ts';

const runs = { numRuns: 200 };

function isCompleteValid(table: Table, combo: Combination): boolean {
  const keys = Object.keys(combo);
  return (
    keys.length === table.conditions.length &&
    table.conditions.every((c, k) => keys[k] === c.id && c.values.some((v) => v.id === combo[c.id]))
  );
}

describe('check properties', () => {
  it('Property 1 gap examples match no rule', () => {
    fc.assert(
      fc.property(arbTable, (table) => {
        const report = check(table);
        expect(report.gaps.examples.length).toBeLessThanOrEqual(20);
        expect(report.gaps.examples.length).toBe(Math.min(report.gaps.count, 20));
        for (const example of report.gaps.examples) {
          expect(isCompleteValid(table, example)).toBe(true);
          expect(table.rules.some((rule) => oracle.matches(rule, example))).toBe(false);
        }
        // The examples are the first gaps in enumeration order.
        expect(report.gaps.examples).toEqual(oracle.gaps(table).slice(0, 20));
      }),
      runs,
    );
  });

  it('Property 2 conflict examples match both rules with different outcomes', () => {
    fc.assert(
      fc.property(arbTable, (table) => {
        const report = check(table);
        for (const conflict of report.conflicts) {
          const [idA, idB] = conflict.rules;
          const a = table.rules.find((r) => r.id === idA);
          const b = table.rules.find((r) => r.id === idB);
          expect(a).toBeDefined();
          expect(b).toBeDefined();
          if (a === undefined || b === undefined) return;
          expect(isCompleteValid(table, conflict.example)).toBe(true);
          expect(oracle.matches(a, conflict.example)).toBe(true);
          expect(oracle.matches(b, conflict.example)).toBe(true);
          expect(a.then).not.toBe(b.then);
          expect(conflict.outcomes).toEqual([a.then, b.then]);
        }
      }),
      runs,
    );
  });

  it('Property 3 passing table has exactly one outcome per combination', () => {
    fc.assert(
      fc.property(arbCheckedTable, (table) => {
        expect(check(table).passed).toBe(true);
        for (const combo of oracle.enumerate(table)) {
          const outcomes = oracle.outcomesOf(table, combo);
          expect(outcomes.length).toBe(1);
          expect(table.rules.some((rule) => oracle.matches(rule, combo))).toBe(true);
          const result = evaluate(table, combo);
          expect(result.status).toBe('decided');
          if (result.status === 'decided') expect(result.outcome.id).toBe(outcomes[0]);
        }
      }),
      runs,
    );
  });

  it('Property 4 check agrees with brute force', () => {
    fc.assert(
      fc.property(arbTable, (table) => {
        const report = check(table);
        const gaps = oracle.gaps(table);
        const conflicts = oracle.conflicts(table);
        expect(report.gaps.count).toBe(gaps.length);
        expect(report.conflicts.map((c) => ({ rules: c.rules, outcomes: c.outcomes }))).toEqual(conflicts);
        expect(report.warnings.map((w) => w.path)).toEqual(oracle.unusedOutcomePaths(table));
        expect(report.passed).toBe(gaps.length === 0 && conflicts.length === 0);
        expect(report.counts).toEqual({
          conditions: table.conditions.length,
          combinations: oracle.enumerate(table).length,
          rules: table.rules.length,
        });
      }),
      runs,
    );
  });
});
