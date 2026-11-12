import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyse } from '../skeleton/playground/analyse.ts';
import { locateJsonError } from '../skeleton/playground/json-error.ts';
import { formatTable, listRules, removeRule, restoreRule, takeRule } from '../skeleton/playground/rules.ts';
import { summarise } from '../skeleton/playground/summary.ts';
import type { PlaygroundCopy } from '../skeleton/playground/types.ts';
import { check } from '../skeleton/engine/index.ts';
import type { Table } from '../skeleton/engine/index.ts';
import { fill } from '../skeleton/shell/dom.ts';

const repo = path.resolve(import.meta.dirname, '..');
const read = (file: string): string => readFileSync(path.join(repo, file), 'utf8');
const copy = JSON.parse(read('skeleton/playground/playground.json')) as PlaygroundCopy;
const readTable = (file: string): Table => JSON.parse(read(file)) as Table;

const licenceText = read('apps/which-licence/table.json');
const gapText = read('skeleton/examples/gap.table.json');
const conflictText = read('skeleton/examples/conflict.table.json');
const licence = readTable('apps/which-licence/table.json');

/** Which licence? with one rule pointing at an outcome that does not exist. */
function badOutcomeText(): string {
  const table = JSON.parse(licenceText) as { rules: { then: string }[] };
  const first = table.rules[0];
  if (first === undefined) throw new Error('no rule');
  first.then = 'no-such-outcome';
  return JSON.stringify(table, null, 2);
}

describe('summary line', () => {
  const rows: { name: string; text: string; line: string }[] = [
    { name: 'a passing table', text: licenceText, line: 'Passes: 7 rules, 32 combinations, all covered' },
    { name: 'a table with a gap', text: gapText, line: 'Fails: 1 gap, 0 conflicts' },
    { name: 'a table with a conflict', text: conflictText, line: 'Fails: 0 gaps, 1 conflict' },
    { name: 'a structurally invalid table', text: badOutcomeText(), line: 'Fails: 1 structural error' },
  ];

  it.each(rows)('$name', ({ text, line }) => {
    const summary = summarise(analyse(text), copy);
    expect(summary.line).toBe(line);
    expect(summary.passes).toBe(line.startsWith('Passes'));
    expect(summary.reason === undefined).toBe(line.startsWith('Passes'));
  });

  it('reports coverage from the engine report for a passing table and for a gap', () => {
    const passing = summarise(analyse(licenceText), copy);
    const report = check(licence);
    expect(passing.coverage).toBe(fill(copy.results.coverage, { covered: report.counts.combinations, total: report.counts.combinations }));

    const gapAnalysis = analyse(gapText);
    if (gapAnalysis.kind !== 'checked') throw new Error('gap table should be checked');
    const { combinations } = gapAnalysis.report.counts;
    expect(summarise(gapAnalysis, copy).coverage).toBe(
      fill(copy.results.coverage, { covered: combinations - gapAnalysis.report.gaps.count, total: combinations }),
    );
    expect(summarise(analyse('{'), copy).coverage).toBeUndefined();
  });
});

describe('JSON error position', () => {
  const rows: { text: string; reason: string; line: number; column: number; character?: string }[] = [
    { text: '{"a":1,}', reason: 'character', line: 1, column: 8, character: '}' },
    { text: '{"a":', reason: 'end', line: 1, column: 6 },
    { text: '{\n  "a": 1\n  "b": 2\n}', reason: 'character', line: 3, column: 3, character: '"' },
    { text: '{} x', reason: 'trailing', line: 1, column: 4 },
    { text: '', reason: 'end', line: 1, column: 1 },
  ];

  it.each(rows)('places the error in $text', (row) => {
    const analysis = analyse(row.text);
    expect(analysis.kind).toBe('syntax');
    if (analysis.kind !== 'syntax') return;
    expect(analysis.error).toMatchObject({ reason: row.reason, line: row.line, column: row.column });
    if (row.character !== undefined) expect(analysis.error.character).toBe(row.character);
    expect(summarise(analysis, copy).line).toBe(`Fails: invalid JSON at line ${row.line}, column ${row.column}`);
  });

  it('agrees with JSON.parse on whether the text is valid', () => {
    const valid = ['{}', '[1, 2.5e-3, "a\\u00e9", true, null]', '  "x"  ', '{"a":{"b":[]}}'];
    const invalid = ['{"a":}', '[1,]', "{'a':1}", '"tab\there"'];
    for (const text of valid) {
      expect(() => JSON.parse(text)).not.toThrow();
      expect(locateJsonError(text)).toBeUndefined();
    }
    for (const text of invalid) {
      expect(() => JSON.parse(text)).toThrow();
      expect(locateJsonError(text)).toBeDefined();
    }
  });

  it('reports a position of at least 1,1 for text on which JSON.parse throws', () => {
    for (const text of ['x', 'nul', '{"a" 1}', '[', '1 2']) {
      const analysis = analyse(text);
      expect(analysis.kind).toBe('syntax');
      if (analysis.kind === 'syntax') {
        expect(analysis.error.line).toBeGreaterThanOrEqual(1);
        expect(analysis.error.column).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('does not overflow the stack on deeply nested brackets', () => {
    expect(locateJsonError('['.repeat(100000))).toMatchObject({ reason: 'end' });
  });
});

describe('rule removal', () => {
  const formatted = formatTable(licence);

  it('removes the rule at the position and leaves every other key and rule equal', () => {
    const result = JSON.parse(removeRule(formatted, 2)) as Table;
    expect(result.rules.map((r) => r.id)).toEqual(licence.rules.filter((_, i) => i !== 2).map((r) => r.id));
    expect({ ...result, rules: [] }).toEqual({ ...licence, rules: [] });
    expect(result.rules).toEqual(licence.rules.filter((_, i) => i !== 2));
  });

  it('writes two-space indented JSON', () => {
    const text = removeRule(formatted, 0);
    expect(text).toBe(JSON.stringify(JSON.parse(text), null, 2));
  });

  it('removes by position when two rules share an id', () => {
    const doubled = JSON.stringify({ rules: [{ id: 'same', n: 1 }, { id: 'same', n: 2 }] }, null, 2);
    expect(JSON.parse(removeRule(doubled, 1))).toEqual({ rules: [{ id: 'same', n: 1 }] });
  });

  it('returns the text unchanged for invalid JSON or an out-of-range position', () => {
    expect(removeRule('{"rules": [', 0)).toBe('{"rules": [');
    expect(removeRule(formatted, 99)).toBe(formatted);
    expect(removeRule(formatted, -1)).toBe(formatted);
  });
});

describe('rule list', () => {
  it('lists ids in order, and undefined for a rule without a string id', () => {
    const list = listRules(formatTable(licence));
    expect(list?.map((row) => row.id)).toEqual(licence.rules.map((r) => r.id));
    expect(list?.map((row) => row.index)).toEqual(licence.rules.map((_, i) => i));
    expect(listRules('{"rules":[{"id":"a"},{"id":3},"x"]}')).toEqual([
      { index: 0, id: 'a' },
      { index: 1, id: undefined },
      { index: 2, id: undefined },
    ]);
  });

  it('summarises when and then as plain strings', () => {
    const text = JSON.stringify({ rules: [{ id: 'a', when: { kind: 'x', size: ['s', 'm'] }, then: 'out' }, { id: 'b', when: {}, then: 3 }] });
    expect(listRules(text)).toEqual([
      { index: 0, id: 'a', when: 'kind=x, size=s/m', outcome: 'out' },
      { index: 1, id: 'b', when: undefined, outcome: undefined },
    ]);
  });

  it('is undefined for invalid JSON, a top-level array and an object without a rules array', () => {
    expect(listRules('{"rules": [')).toBeUndefined();
    expect(listRules('[{"id":"a"}]')).toBeUndefined();
    expect(listRules('{"rules": 3}')).toBeUndefined();
    expect(listRules('null')).toBeUndefined();
  });
});

describe('undo', () => {
  const formatted = formatTable(licence);

  it('puts a removed rule back where it was, so the text is the original again', () => {
    for (const index of [0, 3, licence.rules.length - 1]) {
      const taken = takeRule(formatted, index);
      expect(taken?.rule).toEqual(licence.rules[index]);
      expect(restoreRule(taken?.text ?? '', index, taken?.rule)).toBe(formatted);
    }
  });

  it('puts the rule at the end when the list got shorter, and leaves text without a rules array alone', () => {
    const taken = takeRule(formatted, 1);
    const shorter = JSON.stringify({ rules: [{ id: 'only' }] });
    expect(JSON.parse(restoreRule(shorter, 5, taken?.rule)).rules).toHaveLength(2);
    expect(restoreRule('{"rules": [', 0, {})).toBe('{"rules": [');
  });
});
