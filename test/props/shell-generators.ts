import fc from 'fast-check';
import type { Copy } from '../../skeleton/shell/copy-type.ts';
import type { Step } from '../../skeleton/shell/hash.ts';
import type { Table } from '../../skeleton/engine/index.ts';
import { arbTable } from './generators.ts';

const nasty = [
  '</script><script>alert(1)</script>',
  '<!--',
  '-->',
  '&amp;',
  '<img src=x onerror=alert(1)>',
  '\u2028',
  '\u2029',
  '"',
  '\\',
  "'",
];

/** Arbitrary strings mixed with strings that break out of HTML, scripts and JSON. */
export const arbHostileText: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.string({ unit: 'binary' }),
  fc.constantFrom(...nasty),
  fc.tuple(fc.string(), fc.constantFrom(...nasty), fc.string()).map(([a, b, c]) => a + b + c),
);

const POOL = 120;

/** `arbTable` with every free-text field replaced by hostile text. Ids are left alone. */
export const arbHostileTable: fc.Arbitrary<Table> = fc
  .tuple(arbTable, fc.array(arbHostileText, { minLength: POOL, maxLength: POOL }))
  .map(([table, pool]) => {
    let next = 0;
    const take = (): string => {
      const value = pool[next++];
      if (value === undefined) throw new Error('hostile text pool exhausted');
      return value;
    };
    return {
      id: table.id,
      title: take(),
      conditions: table.conditions.map((c) => ({
        id: c.id,
        question: take(),
        help: take(),
        values: c.values.map((v) => ({ id: v.id, label: take(), hint: take() })),
      })),
      outcomes: table.outcomes.map((o) => ({ id: o.id, label: take(), detail: take() })),
      rules: table.rules.map((r) => ({
        id: r.id,
        when: r.when,
        then: r.then,
        note: take(),
        source: { ref: r.source.ref, at: take() },
      })),
      sources: table.sources.map((s) => ({
        id: s.id,
        title: take(),
        url: take(),
        published: take(),
        read: take(),
      })),
    };
  });

export const LABEL_KEYS = [
  'startOver',
  'change',
  'why',
  'rule',
  'whatMattered',
  'source',
  'published',
  'readOn',
  'notAsked',
  'copyLink',
  'linkCopied',
  'showTable',
  'hideTable',
  'any',
  'outcome',
  'yourAnswers',
  'noscript',
  'questionOf',
  'badLink',
] as const;

/** A `Copy` with hostile text in every string field. */
export const arbHostileCopy: fc.Arbitrary<Copy> = fc
  .record({
    title: arbHostileText,
    tagline: arbHostileText,
    intro: arbHostileText,
    resultLead: arbHostileText,
    answerStyle: fc.constantFrom<'tiles' | 'list'>('tiles', 'list'),
    labels: fc.tuple(...LABEL_KEYS.map(() => arbHostileText)),
    footer: fc.array(fc.record({ text: arbHostileText, href: arbHostileText }), { maxLength: 3 }),
  })
  .map(({ labels, ...rest }) => ({
    ...rest,
    labels: Object.fromEntries(LABEL_KEYS.map((key, i) => [key, labels[i] ?? ''])) as unknown as Copy['labels'],
  }));

/** A random subset of the conditions in random order, each with a random value of its own. */
export function arbSteps(table: Table): fc.Arbitrary<Step[]> {
  return fc.shuffledSubarray(table.conditions).chain((conditions) =>
    fc
      .tuple(...conditions.map((c) => fc.constantFrom(...c.values.map((v) => v.id))))
      .map((values) => conditions.map((c, i) => ({ condition: c.id, value: values[i] ?? '' }))),
  );
}
