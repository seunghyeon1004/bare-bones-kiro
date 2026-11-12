import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { check, decide, evaluate, validate } from '../../skeleton/engine/index.ts';
import type { Answers, Table } from '../../skeleton/engine/index.ts';
import { arbCheckedTable, arbTable, arbTableWithAnswers } from './generators.ts';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function frozenCopy<T>(value: T): T {
  return deepFreeze(JSON.parse(JSON.stringify(value)) as T);
}

// The tsconfig has no DOM or Node types, so describe the one global used here.
const perf = (globalThis as unknown as { performance: { now: () => number } }).performance;

function thrower(name: string): () => never {
  return () => {
    throw new Error(`engine used ${name}`);
  };
}

/** Runs `fn` with Date, Math.random and performance.now replaced by functions that throw; restores them in finally. */
function withoutClocksOrRandom<T>(fn: () => T): T {
  const realDate = globalThis.Date;
  const realRandom = Math.random;
  const realNow = perf.now;
  try {
    Reflect.set(globalThis, 'Date', thrower('Date'));
    Math.random = thrower('Math.random');
    perf.now = thrower('performance.now');
    return fn();
  } finally {
    Reflect.set(globalThis, 'Date', realDate);
    Math.random = realRandom;
    perf.now = realNow;
  }
}

/** The call twice, then on frozen copies; all give the same JSON text, and the result is plain JSON data. */
function expectPure<R>(call: (table: Table, answers: Answers) => R, table: Table, answers: Answers): void {
  const first = withoutClocksOrRandom(() => call(table, answers));
  const again = withoutClocksOrRandom(() => call(table, answers));
  const frozen = withoutClocksOrRandom(() => call(frozenCopy(table), frozenCopy(answers)));
  const text = JSON.stringify(first);
  expect(JSON.stringify(again)).toBe(text);
  expect(JSON.stringify(frozen)).toBe(text);
  expect(first).toStrictEqual(JSON.parse(text));
}

describe('purity property', () => {
  it('the harness really stops the clock and the dice', () => {
    expect(() => withoutClocksOrRandom(() => Math.random())).toThrow(/Math.random/);
    expect(() => withoutClocksOrRandom(() => new Date())).toThrow(/Date/);
    expect(() => withoutClocksOrRandom(() => perf.now())).toThrow(/performance.now/);
    expect(typeof Math.random()).toBe('number');
  });

  it('Property 10 engine is pure', () => {
    fc.assert(
      fc.property(
        fc.record({
          anyTable: arbTable,
          checked: arbTableWithAnswers(arbCheckedTable),
        }),
        ({ anyTable, checked }) => {
          expectPure((table) => validate(table), anyTable, {});
          expectPure((table) => check(table), anyTable, {});
          expectPure((table, answers) => decide(table, answers), checked.table, checked.answers);
          // evaluate with the answers as given (complete or not) and with a complete combination.
          expectPure((table, answers) => evaluate(table, answers), checked.table, checked.answers);
          const complete = Object.fromEntries(checked.table.conditions.map((c) => [c.id, c.values[0]?.id ?? '']));
          expectPure((table, answers) => evaluate(table, answers), checked.table, complete);
        },
      ),
      { numRuns: 200 },
    );
  });
});
