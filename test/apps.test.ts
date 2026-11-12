import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { check, decide, validate } from '../skeleton/engine/index.ts';
import type { Answers, Table } from '../skeleton/engine/index.ts';

const repo = path.resolve(import.meta.dirname, '..');
const read = (relative: string): string => readFileSync(path.join(repo, relative), 'utf8');

function loadTable(relative: string): Table {
  const result = validate(JSON.parse(read(relative)));
  if (!result.ok) throw new Error(`${relative} is not valid: ${JSON.stringify(result.problems)}`);
  return result.table;
}

/** Answers the question `decide` asks from one complete combination (the given answers, the first value elsewhere). */
function walk(table: Table, answers: Answers): { questions: number; outcome: string } {
  const complete: Record<string, string> = {};
  for (const condition of table.conditions) complete[condition.id] = answers[condition.id] ?? condition.values[0]?.id ?? '';
  const given: Record<string, string> = {};
  for (let questions = 0; questions <= table.conditions.length; questions++) {
    const result = decide(table, given);
    if (result.status === 'decided') return { questions, outcome: result.outcome.id };
    if (result.status === 'error') throw new Error('decide returned an error');
    given[result.next.condition] = complete[result.next.condition] ?? '';
  }
  throw new Error('walk did not stop');
}

interface Golden {
  item: string;
  answers: Answers;
  outcome: string;
  rule: string;
  at: string;
  questions: number;
}

/** Refs (first cells) of the README quote table: rows whose first cell starts with a source id. */
function readmeRefs(): string[] {
  return read('docs/sources/README.md')
    .split('\n')
    .filter((line) => /^\| (seoul-2025|moe-2018) /.test(line))
    .map((line) => line.slice(2, line.indexOf(' | ', 2)));
}

const SILENT = 'docs/sources/README.md, note below the quote table';

describe('which-bin table', () => {
  const table = loadTable('apps/which-bin/table.json');

  it('has the pinned counts, the two sources and no warning', () => {
    const report = check(table);
    expect(report.counts).toEqual({ conditions: 6, combinations: 480, rules: 27 });
    expect(report.gaps.count).toBe(0);
    expect(report.conflicts).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.passed).toBe(true);
    expect(table.conditions.map((c) => c.id)).toEqual(['kind', 'soiled', 'broken', 'glass-type', 'coated', 'clear-drink']);
    expect(table.outcomes).toHaveLength(13);
    expect(table.sources.map((s) => s.id)).toEqual(['seoul-2025', 'moe-2018']);
    const general = table.outcomes.find((o) => o.id === 'general-waste');
    const sack = table.outcomes.find((o) => o.id === 'special-sack');
    expect(general?.detail).toContain('종량제봉투');
    expect(sack?.detail).toContain('특수규격마대');
  });

  const golden: Golden[] = [
    { item: 'greasy pizza box', answers: { kind: 'paper-box', soiled: 'yes' }, outcome: 'general-waste', rule: 'paper-box-soiled', at: 'moe-2018 dictionary p.33, 피자박스', questions: 2 },
    { item: 'clean paper cup', answers: { kind: 'paper-cup', soiled: 'no', coated: 'no' }, outcome: 'paper', rule: 'paper-cup-clean', at: 'seoul-2025 A2 나 (종이컵)', questions: 3 },
    { item: 'paper cup coated on both sides', answers: { kind: 'paper-cup', coated: 'yes' }, outcome: 'general-waste', rule: 'paper-cup-coated', at: 'seoul-2025 A1 2', questions: 3 },
    { item: 'broken drinking glass', answers: { kind: 'glass', 'glass-type': 'ordinary', broken: 'yes' }, outcome: 'general-waste', rule: 'glass-broken', at: 'seoul-2025 A2 다 (비해당)', questions: 3 },
    { item: 'insulated delivery box', answers: { kind: 'insulated-box' }, outcome: 'general-waste', rule: 'insulated-box', at: 'seoul-2025 A1 1', questions: 1 },
    { item: 'dirty clear water bottle', answers: { kind: 'plastic-bottle', 'clear-drink': 'yes', soiled: 'yes' }, outcome: 'clear-pet', rule: 'pet-clear', at: 'seoul-2025 A2 마', questions: 2 },
    { item: 'plastic tub with food that will not rinse off', answers: { kind: 'plastic-container', soiled: 'yes' }, outcome: 'ask-district', rule: 'plastic-container-soiled', at: SILENT, questions: 2 },
    { item: 'battery', answers: { kind: 'battery' }, outcome: 'battery-box', rule: 'battery', at: 'seoul-2025 A2 차', questions: 1 },
  ];

  it.each(golden)('golden item: $item', ({ answers, outcome, rule, at, questions }) => {
    const result = decide(table, answers);
    expect(result.status).toBe('decided');
    if (result.status !== 'decided') return;
    expect(result.outcome.id).toBe(outcome);
    expect(result.rules.map((r) => r.id)).toEqual([rule]);
    expect(result.rules[0]?.source.at).toBe(at);
    expect(walk(table, answers)).toEqual({ questions, outcome });
  });

  it('does not ask whether a bottle, glass or can is dirty (owner answer 1)', () => {
    for (const answers of [{ kind: 'can' } as Answers, { kind: 'glass', 'glass-type': 'ordinary', broken: 'no' }, { kind: 'plastic-bottle', 'clear-drink': 'no' }]) {
      const result = decide(table, answers);
      expect(result.status).toBe('decided');
      if (result.status === 'decided') expect(result.skipped.map((s) => s.condition)).toContain('soiled');
    }
  });

  it('ties every rule to a README row, and every README row to a rule', () => {
    const refs = readmeRefs();
    expect(refs).toHaveLength(26);
    expect(new Set(refs).size).toBe(refs.length);

    for (const rule of table.rules) {
      expect(rule.note, `${rule.id} has a note`).toBeTruthy();
      if (rule.then === 'ask-district') continue;
      expect(refs, `${rule.id}: at "${rule.source.at}" is a README Ref`).toContain(rule.source.at);
      expect(rule.source.at.startsWith(rule.source.ref), `${rule.id}: at begins with ref`).toBe(true);
    }
    const notes = table.rules.map((r) => r.note ?? '').join('\n');
    const used = new Set(table.rules.map((r) => r.source.at));
    const unused = refs.filter((ref) => !used.has(ref));
    expect(unused.sort()).toEqual([
      'moe-2018 FAQ p.22 (유리잔)',
      'moe-2018 FAQ p.23 (유리병 이물질)',
      'moe-2018 FAQ p.23 (캔 이물질)',
      'moe-2018 FAQ p.23 (페트병 이물질)',
    ]);
    for (const ref of unused) expect(notes, `${ref} is quoted in a note`).toContain(ref);
    for (const id of ['glass-clean', 'can', 'pet-clear']) {
      expect(table.rules.find((r) => r.id === id)?.note).toContain('wash it as clean as you can');
    }

    const asks = table.rules.filter((r) => r.then === 'ask-district');
    expect(asks.map((r) => r.id)).toEqual(['plastic-container-soiled']);
    expect(asks[0]?.source).toEqual({ ref: 'seoul-2025', at: SILENT });
    expect(table.rules.filter((r) => r.source.at.startsWith('none:'))).toEqual([]);
  });
});

describe('which-bin broken example', () => {
  const good = JSON.parse(read('apps/which-bin/table.json')) as Table;
  const broken = JSON.parse(read('skeleton/examples/which-bin-broken.table.json')) as Table;

  it('is the which-bin table minus paper-cup-soiled plus receipt-as-paper, and the checker finds both defects', () => {
    const added = broken.rules[broken.rules.length - 1];
    expect(added?.id).toBe('receipt-as-paper');
    expect(added).toMatchObject({ when: { kind: 'receipt' }, then: 'paper' });
    expect(broken.id).toBe('which-bin-broken');
    expect(broken.title).toContain('paper-cup-soiled');
    expect(broken.title).toContain('receipt-as-paper');
    expect({ ...broken, id: good.id, title: good.title, rules: broken.rules.slice(0, -1) }).toEqual({
      ...good,
      rules: good.rules.filter((r) => r.id !== 'paper-cup-soiled'),
    });

    const result = validate(broken);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const report = check(result.table);
    expect(report.gaps.count).toBe(8);
    for (const example of report.gaps.examples) {
      expect(example).toMatchObject({ kind: 'paper-cup', coated: 'no', soiled: 'yes' });
    }
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0]?.rules).toEqual(['receipt', 'receipt-as-paper']);
    expect(report.conflicts[0]?.outcomes).toEqual(['general-waste', 'paper']);
    expect(report.warnings).toEqual([]);
    expect(report.passed).toBe(false);
  });
});

interface Yml { title: string; spdx: string; description: string; keys: Set<string>; conditions: string[] }

/** The front matter of a choosealicense yml: scalars `title`, `spdx-id`, `description`, and the lists `permissions` and `conditions`. */
function parseYml(file: string): Yml {
  const lines = read(`docs/sources/choosealicense/${file}`).split('\n');
  const scalar = (name: string): string => {
    const line = lines.find((l) => l.startsWith(`${name}: `));
    if (line === undefined) throw new Error(`${file}: no ${name}`);
    return line.slice(name.length + 2).trim();
  };
  const list = (name: string): string[] => {
    const at = lines.findIndex((l) => l.startsWith(`${name}:`));
    if (at < 0) throw new Error(`${file}: no ${name}`);
    const items: string[] = [];
    for (const line of lines.slice(at + 1)) {
      const match = /^ {2}- (.+)$/.exec(line);
      if (match?.[1] === undefined) break;
      items.push(match[1].trim());
    }
    return items;
  };
  const permissions = list('permissions');
  const conditions = list('conditions');
  return {
    title: scalar('title'),
    spdx: scalar('spdx-id'),
    description: scalar('description'),
    keys: new Set([...permissions, ...conditions]),
    conditions,
  };
}

function factHolds(yml: Yml, fact: string): boolean {
  if (fact === 'no conditions') return yml.conditions.length === 0;
  if (fact.startsWith('no ')) return !yml.keys.has(fact.slice(3));
  return yml.keys.has(fact);
}

describe('which-licence table', () => {
  const table = loadTable('apps/which-licence/table.json');

  it('has the pinned counts, the single source and no warning', () => {
    const report = check(table);
    expect(report.counts).toEqual({ conditions: 4, combinations: 32, rules: 7 });
    expect(report.gaps.count).toBe(0);
    expect(report.conflicts).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.passed).toBe(true);
    expect(table.conditions.map((c) => c.id)).toEqual(['copyleft', 'network', 'patent', 'credit']);
    expect(table.conditions[0]?.values.map((v) => v.id)).toEqual(['none', 'file', 'library', 'whole']);
    expect(table.sources).toEqual([
      {
        id: 'choosealicense',
        title: 'choosealicense.com licence data (github/choosealicense.com, gh-pages commit 687dabb)',
        url: 'https://github.com/github/choosealicense.com/tree/687dabb300c3d58891285d9567cc6f73a495470c/_licenses',
        published: 'unknown',
        read: '2026-11-12',
      },
    ]);
  });

  const golden: (Golden & { noteHas?: string })[] = [
    { item: 'whole program, no network', answers: { copyleft: 'whole', network: 'no' }, outcome: 'gpl-3-0', rule: 'copyleft-whole', at: 'gpl-3.0.yml: same-license; no network-use-disclose', questions: 2 },
    { item: 'whole program, network counts', answers: { copyleft: 'whole', network: 'yes' }, outcome: 'agpl-3-0', rule: 'copyleft-network', at: 'agpl-3.0.yml: network-use-disclose; same-license', questions: 2 },
    { item: 'changed files only', answers: { copyleft: 'file' }, outcome: 'mpl-2-0', rule: 'copyleft-file', at: 'mpl-2.0.yml: same-license--file; patent-use', questions: 1 },
    { item: 'the library only', answers: { copyleft: 'library' }, outcome: 'lgpl-3-0', rule: 'copyleft-library', at: 'lgpl-3.0.yml: same-license--library; patent-use', questions: 1 },
    { item: 'no copyleft, keep notice', answers: { copyleft: 'none', patent: 'no', credit: 'yes' }, outcome: 'mit', rule: 'permissive-notice', at: 'mit.yml: include-copyright; no patent-use', questions: 3 },
    { item: 'patent grant, no notice wanted (nearest)', answers: { copyleft: 'none', patent: 'yes', credit: 'no' }, outcome: 'apache-2-0', rule: 'permissive-patent', at: 'apache-2.0.yml: patent-use; include-copyright', questions: 2, noteHas: 'include-copyright' },
    { item: 'no copyleft, nothing required', answers: { copyleft: 'none', patent: 'no', credit: 'no' }, outcome: 'unlicense', rule: 'permissive-nothing', at: 'unlicense.yml: no conditions; no patent-use', questions: 3 },
    { item: 'changed files only, network counts (nearest)', answers: { copyleft: 'file', network: 'yes' }, outcome: 'mpl-2-0', rule: 'copyleft-file', at: 'mpl-2.0.yml: same-license--file; patent-use', questions: 1, noteHas: 'agpl-3.0.yml' },
  ];

  it.each(golden)('golden item: $item', ({ answers, outcome, rule, at, questions, noteHas }) => {
    const result = decide(table, answers);
    expect(result.status).toBe('decided');
    if (result.status !== 'decided') return;
    expect(result.outcome.id).toBe(outcome);
    expect(result.rules.map((r) => r.id)).toEqual([rule]);
    expect(result.rules[0]?.source.at).toBe(at);
    if (noteHas !== undefined) expect(result.rules[0]?.note).toContain(noteHas);
    expect(walk(table, answers)).toEqual({ questions, outcome });
  });

  it('copies each licence description and title from its yml, and every fact in a rule is true there', () => {
    const files: Record<string, string> = {
      mit: 'mit.yml',
      'apache-2-0': 'apache-2.0.yml',
      unlicense: 'unlicense.yml',
      'mpl-2-0': 'mpl-2.0.yml',
      'lgpl-3-0': 'lgpl-3.0.yml',
      'gpl-3-0': 'gpl-3.0.yml',
      'agpl-3-0': 'agpl-3.0.yml',
    };
    expect(table.outcomes.map((o) => o.id)).toEqual(Object.keys(files));
    for (const outcome of table.outcomes) {
      const yml = parseYml(files[outcome.id] ?? '');
      expect(outcome.detail, `${outcome.id} detail`).toBe(yml.description);
      expect(outcome.label, `${outcome.id} label`).toBe(`${yml.title} (${yml.spdx})`);
    }
    for (const rule of table.rules) {
      expect(rule.note, `${rule.id} has a note`).toBeTruthy();
      expect(rule.source.ref).toBe('choosealicense');
      const match = /^([a-z0-9.-]+\.yml): (.+)$/.exec(rule.source.at);
      expect(match, `${rule.id}: at "${rule.source.at}" has the form <file>.yml: <facts>`).not.toBeNull();
      const file = match?.[1] ?? '';
      expect(Object.values(files), `${rule.id}: ${file} exists`).toContain(file);
      const yml = parseYml(file);
      for (const fact of (match?.[2] ?? '').split('; ')) expect(factHolds(yml, fact), `${rule.id}: "${fact}" is true in ${file}`).toBe(true);
    }
  });
});

interface AppCopy {
  title: string;
  intro: string;
  answerStyle: string;
  labels: Record<string, string>;
  footer: { text: string; href?: string }[];
}

const copyOf = (app: string): AppCopy => JSON.parse(read(`apps/${app}/copy.json`)) as AppCopy;

describe('copy', () => {
  const bin = copyOf('which-bin');
  const licence = copyOf('which-licence');

  it('both files use 20 labels and their answer style', () => {
    expect(Object.keys(bin.labels)).toHaveLength(20);
    expect(Object.keys(licence.labels)).toHaveLength(20);
    expect(bin.answerStyle).toBe('tiles');
    expect(licence.answerStyle).toBe('list');
  });

  it('which-bin names Seoul and the districts, and links both sources as in the table', () => {
    expect(bin.intro).toContain('South Korea, as published by Seoul in 2025');
    expect(bin.intro).toContain('vary by district');
    const table = loadTable('apps/which-bin/table.json');
    const hrefs = bin.footer.map((f) => f.href).filter((h): h is string => h !== undefined);
    expect(hrefs.sort()).toEqual(table.sources.map((s) => s.url).sort());
    for (const source of table.sources) {
      const entry = bin.footer.find((f) => f.href === source.url);
      expect(entry?.text, source.id).toContain(source.published);
    }
    expect(bin.footer.some((f) => f.href === undefined && f.text.includes('vary by district'))).toBe(true);
  });

  it('which-licence credits choosealicense.com and says it is not legal advice', () => {
    expect(licence.footer).toContainEqual({ text: 'Licence data from choosealicense.com, CC BY 3.0', href: 'https://choosealicense.com/' });
    const hrefs = licence.footer.map((f) => f.href);
    expect(hrefs).toContain('https://github.com/github/choosealicense.com');
    expect(hrefs).toContain('https://creativecommons.org/licenses/by/3.0/');
    expect(licence.intro.toLowerCase()).toContain('not legal advice');
    expect(licence.footer.some((f) => f.text.toLowerCase().includes('not legal advice'))).toBe(true);
  });
});

type Colours = Record<string, string>;

/** The light `:root` rule and the dark `:root` rule (inside the prefers-color-scheme block) of a theme.css. */
function parseTheme(css: string): { light: Colours; dark: Colours } {
  const declarations = (body: string): Colours =>
    Object.fromEntries(
      body
        .split(';')
        .map((d) => d.trim())
        .filter((d) => d !== '')
        .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]),
    );
  const dark = /@media[^{]*\{\s*:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const light = css.slice(0, css.indexOf('@media'));
  return { light: declarations(/:root\s*\{([^}]*)\}/.exec(light)?.[1] ?? ''), dark: declarations(dark) };
}

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('themes', () => {
  const css = { bin: read('apps/which-bin/theme.css'), licence: read('apps/which-licence/theme.css') };
  const themes = { bin: parseTheme(css.bin), licence: parseTheme(css.licence) };

  it('the two themes differ in the properties that make an app look like itself', () => {
    for (const name of ['--bg', '--accent', '--font-body', '--font-heading', '--radius', '--space']) {
      expect(themes.bin.light[name], name).toBeDefined();
      expect(themes.bin.light[name], name).not.toBe(themes.licence.light[name]);
    }
    expect(Number.parseFloat(themes.bin.light['--radius'] ?? '0')).toBeGreaterThanOrEqual(1);
    expect(themes.bin.light['--radius']).toMatch(/rem$/);
    expect(themes.licence.light['--radius']).toBe('0');
    expect(themes.licence.light['--font-heading']).toMatch(/serif$/);
    expect(themes.bin.light['--font-size']).toBe('1.25rem');
    expect(themes.licence.light['--font-size']).toBe('1rem');
  });

  const pairs: [string, string, number][] = [
    ['--text', '--bg', 4.5], ['--text', '--surface', 4.5], ['--muted', '--bg', 4.5], ['--muted', '--surface', 4.5],
    ['--accent', '--bg', 4.5], ['--accent', '--surface', 4.5], ['--accent-text', '--accent', 4.5],
    ['--border', '--bg', 3], ['--border', '--surface', 3], ['--focus', '--bg', 3], ['--focus', '--surface', 3],
  ];
  it.each(['bin', 'licence'] as const)('%s: contrast pairs hold in the light and the dark rule', (app) => {
    for (const mode of ['light', 'dark'] as const) {
      const colours = { ...themes[app].light, ...(mode === 'dark' ? themes[app].dark : {}) };
      for (const [fg, bg, min] of pairs) {
        const ratio = contrast(colours[fg] ?? '', colours[bg] ?? '');
        expect(ratio, `${app} ${mode}: ${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
      }
    }
  });

  it('uses system fonts only, with Hangul fonts in which-bin', () => {
    for (const text of Object.values(css)) {
      expect(text).not.toMatch(/@font-face|url\(|@import/i);
    }
    for (const name of ['--font-body', '--font-heading']) {
      expect(themes.bin.light[name]).toContain('"Apple SD Gothic Neo"');
      expect(themes.bin.light[name]).toContain('"Malgun Gothic"');
    }
  });
});

describe('pages workflow', () => {
  const yml = read('.github/workflows/pages.yml');
  const at = (needle: string, from = 0): number => {
    const index = yml.indexOf(needle, from);
    expect(index, `"${needle}" is in the workflow`).toBeGreaterThanOrEqual(0);
    return index;
  };

  it('runs on push to main only, in the order of the spec, and builds once', () => {
    expect(yml).toMatch(/on:\s*\n\s+push:\s*\n\s+branches: \[main\]/);
    expect(yml).not.toContain('pull_request');
    const order = ['npm ci', 'npm run typecheck', 'npm test', 'npm run build', 'playwright install', 'npx playwright test', 'path: dist', 'actions/deploy-pages'];
    let from = 0;
    for (const step of order) from = at(step, from) + 1;
    expect(yml.split('npm run build').length - 1).toBe(1);
    expect(yml).not.toContain('test:e2e');
  });

  it('uses only actions/ actions, Node 22 with the npm cache, and least permissions', () => {
    const uses = [...yml.matchAll(/uses: (\S+)/g)].map((m) => m[1] ?? '');
    expect(uses).toHaveLength(4);
    for (const action of uses) expect(action.startsWith('actions/'), action).toBe(true);
    expect(yml).toContain('node-version: 22');
    expect(yml).toContain('cache: npm');
    expect(at('contents: read')).toBeLessThan(at('jobs:'));
    expect(yml.split('contents: read').length - 1).toBe(1);
    expect(at('pages: write')).toBeGreaterThan(at('deploy:'));
    expect(at('id-token: write')).toBeGreaterThan(at('deploy:'));
    expect(yml.split('pages: write').length - 1).toBe(1);
    expect(yml.split('id-token: write').length - 1).toBe(1);
    expect(yml).toContain('needs: build');
    expect(yml).toContain('name: github-pages');
  });
});
