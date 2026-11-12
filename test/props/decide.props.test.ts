import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decide, evaluate } from '../../skeleton/engine/index.ts';
import type { Answers } from '../../skeleton/engine/index.ts';
import { arbCheckedTable, arbComplete, arbOrdering, arbTableWithAnswers } from './generators.ts';
import * as oracle from './oracle.ts';

const runs = { numRuns: 200 };
const arbCase = arbTableWithAnswers(arbCheckedTable);

describe('decide properties', () => {
  it('Property 5 decide ignores answer order', () => {
    fc.assert(
      fc.property(
        arbCase.chain(({ table, answers }) => arbOrdering(answers).map((reordered) => ({ table, answers, reordered }))),
        ({ table, answers, reordered }) => {
          expect(JSON.stringify(decide(table, reordered))).toBe(JSON.stringify(decide(table, answers)));
        },
      ),
      runs,
    );
  });

  it('Property 6 decide asks only relevant questions', () => {
    fc.assert(
      fc.property(arbCase, ({ table, answers }) => {
        const result = decide(table, answers);
        expect(result.status).not.toBe('error');
        if (result.status !== 'open') return;
        const expected = oracle.relevant(table, answers);
        expect(result.relevant).toEqual(expected);
        expect(result.relevant.map((r) => r.condition)).toContain(result.next.condition);
        expect(result.next.condition).toBe(oracle.pick(expected));
        expect(answers[result.next.condition]).toBeUndefined();
        const condition = table.conditions.find((c) => c.id === result.next.condition);
        expect(result.next).toEqual({
          condition: condition?.id,
          question: condition?.question,
          values: condition?.values,
        });
      }),
      runs,
    );
  });

  it('Property 7 decide stops exactly when decided', () => {
    fc.assert(
      fc.property(arbCase, ({ table, answers }) => {
        const result = decide(table, answers);
        const outcomes = oracle.distinctOutcomes(table, oracle.consistent(table, answers));
        expect(result.status).toBe(outcomes.length === 1 ? 'decided' : 'open');
        if (result.status !== 'decided') return;
        const firing = oracle.firingRules(table, answers);
        expect(result.outcome.id).toBe(outcomes[0]);
        expect(result.rules.map((r) => r.id)).toEqual(firing.map((r) => r.id));
        expect(result.rules.map((r) => r.source)).toEqual(firing.map((r) => r.source));
        expect(result.mattered.map((m) => m.condition)).toEqual(oracle.matteredConditions(table, answers));
        for (const m of result.mattered) expect(answers[m.condition]).toBe(m.value);
        expect(result.sources).toEqual(oracle.sourcesOf(table, firing));
      }),
      runs,
    );
  });

  it('Property 8 full walk equals complete combination', () => {
    fc.assert(
      fc.property(
        arbCheckedTable.chain((table) => arbComplete(table).map((combo) => ({ table, combo }))),
        ({ table, combo }) => {
          const answers: Record<string, string> = {};
          let result = decide(table, answers);
          let steps = 0;
          while (result.status === 'open') {
            const asked = result.next.condition;
            expect(answers[asked]).toBeUndefined();
            answers[asked] = combo[asked] ?? '';
            steps++;
            expect(steps).toBeLessThanOrEqual(table.conditions.length);
            result = decide(table, answers);
          }
          expect(result.status).toBe('decided');
          const full = evaluate(table, combo);
          expect(full.status).toBe('decided');
          if (result.status === 'decided' && full.status === 'decided') {
            expect(result.outcome).toEqual(full.outcome);
            expect(result.outcome.id).toBe(oracle.outcomeOf(table, combo));
          }
        },
      ),
      runs,
    );
  });

  it('Property 9 skipped questions cannot change the outcome', () => {
    fc.assert(
      fc.property(arbCase, ({ table, answers }) => {
        const result = decide(table, answers);
        if (result.status !== 'decided') return;
        const unanswered = table.conditions.filter((c) => answers[c.id] === undefined);
        expect(result.skipped).toEqual(unanswered.map((c) => ({ condition: c.id, question: c.question })));
        for (const skipped of unanswered) {
          for (const value of skipped.values) {
            const more: Answers = { ...answers, [skipped.id]: value.id };
            const again = decide(table, more);
            expect(again.status).toBe('decided');
            if (again.status === 'decided') expect(again.outcome).toEqual(result.outcome);
          }
        }
      }),
      runs,
    );
  });
});

