import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { build } from '../skeleton/build/build.ts';
import { validateLanding, validatePlayground } from '../skeleton/build/copy-check.ts';
import { summariseApp } from '../skeleton/build/page.ts';
import { THEME_PROPS, parseTheme, validateTheme } from '../skeleton/build/theme-check.ts';
import { run } from '../skeleton/cli/bones.ts';
import type { Table } from '../skeleton/engine/index.ts';
import type { Copy } from '../skeleton/shell/copy-type.ts';

const repo = path.resolve(import.meta.dirname, '..');
const temps: string[] = [];

interface Workspace { root: string; apps: string; dist: string; app: string }

/** A temp repo root with `apps/demo` made by `bones new`. */
function workspace(withApp = true): Workspace {
  const root = mkdtempSync(path.join(tmpdir(), 'bones-build-'));
  temps.push(root);
  const apps = path.join(root, 'apps');
  mkdirSync(apps);
  if (withApp) expect(run(['new', 'demo', '--apps', apps], { cwd: repo }).code).toBe(0);
  return { root, apps, dist: path.join(root, 'dist'), app: path.join(apps, 'demo') };
}

function runBuild(w: Workspace, outDir = w.dist): ReturnType<typeof build> {
  return build({ appsDir: w.apps, outDir, repoRoot: w.root });
}

interface CopyDoc { labels: Record<string, string>; answerStyle: string; footer: { text: string; href?: string }[] }
interface TableDoc { id: string; rules: { id: string }[]; sources: { url: string }[] }

function editJson<T>(file: string, edit: (json: T) => void): void {
  const json: T = JSON.parse(readFileSync(file, 'utf8'));
  edit(json);
  writeFileSync(file, JSON.stringify(json, null, 2));
}

function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? listFiles(path.join(dir, d.name), `${prefix}${d.name}/`) : [`${prefix}${d.name}`]))
    .sort();
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('build', () => {
  it('builds an app made by `bones new` into exactly the thirteen files', { timeout: 30000 }, async () => {
    const w = workspace();
    const result = await runBuild(w);
    expect(result).toEqual({ ok: true, apps: ['demo'] });

    expect(listFiles(w.dist)).toEqual([
      'app.js',
      'demo/app.js',
      'demo/index.html',
      'demo/shell.css',
      'demo/theme.css',
      'index.html',
      'playground/app.js',
      'playground/index.html',
      'playground/playground.css',
      'playground/shell.css',
      'playground/theme.css',
      'shell.css',
      'theme.css',
    ]);

    for (const page of ['index.html', 'demo/index.html', 'playground/index.html']) {
      const html = readFileSync(path.join(w.dist, page), 'utf8');
      const links = [...html.matchAll(/\b(?:href|src)="([^"]*)"/g)].map((m) => m[1] ?? '');
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) expect(link).not.toMatch(/^(\/|[a-z][a-z0-9+.-]*:)/i);
    }

    const html = readFileSync(path.join(w.dist, 'demo/index.html'), 'utf8');
    const block = html.match(/<script type="application\/json" id="data-table">([^]*?)<\/script>/)?.[1] ?? '';
    expect(JSON.parse(block)).toEqual(JSON.parse(readFileSync(path.join(w.app, 'table.json'), 'utf8')));
    expect(html).toContain('<h1>Demo</h1>');

    expect(readdirSync(w.dist)).not.toContain('template');
    expect(readdirSync(w.dist)).not.toContain('examples');
  });

  it('writes the playground page with its two data blocks', { timeout: 30000 }, async () => {
    const w = workspace();
    expect(await runBuild(w)).toEqual({ ok: true, apps: ['demo'] });
    const copy = JSON.parse(readFileSync(path.join(repo, 'skeleton/playground/playground.json'), 'utf8')) as {
      title: string;
      intro: string;
      noscript: string;
      editor: { brokenExample: string };
    };
    const html = readFileSync(path.join(w.dist, 'playground/index.html'), 'utf8');
    const block = (id: string): unknown => JSON.parse(html.match(new RegExp(`<script type="application/json" id="${id}">([^]*?)</script>`))?.[1] ?? 'null');

    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain('<link rel="stylesheet" href="playground.css">');
    expect(html.indexOf('href="shell.css"')).toBeLessThan(html.indexOf('href="playground.css"'));
    expect(html).toContain(`<title>${copy.title}</title>`);
    const boot = html.match(/<div id="boot"[^]*?<\/div>/)?.[0] ?? '';
    expect(boot.match(/<h1>/g)).toHaveLength(1);
    expect(boot).toContain(copy.title);
    expect(boot).toContain(copy.intro);
    expect(boot).toContain(copy.noscript);

    expect(block('data-playground')).toEqual(copy);
    const demoTable: unknown = JSON.parse(readFileSync(path.join(w.app, 'table.json'), 'utf8'));
    const demoCopy: unknown = JSON.parse(readFileSync(path.join(w.app, 'copy.json'), 'utf8'));
    const examples = block('data-examples') as {
      defaultExample: string;
      examples: { id: string; label: string; table: unknown; copy: unknown; theme: { light: object; dark: object } }[];
    };
    // No which-licence or which-bin here: the first app stands in for both.
    expect(examples.defaultExample).toBe('demo');
    expect(examples.examples.map((e) => e.id)).toEqual(['demo', 'broken']);
    const [demo, broken] = examples.examples;
    expect(demo?.table).toEqual(demoTable);
    expect(broken?.label).toBe(copy.editor.brokenExample);
    expect(broken?.table).toEqual(JSON.parse(readFileSync(path.join(repo, 'skeleton/examples/which-bin-broken.table.json'), 'utf8')));
    expect(broken?.copy).toEqual(demoCopy);
    expect(Object.keys(demo?.theme.light ?? {})).toHaveLength(13);
    expect(Object.keys(demo?.theme.dark ?? {})).toHaveLength(8);
  });

  it('rejects a table with a gap and leaves the output directory alone', { timeout: 30000 }, async () => {
    const w = workspace();
    mkdirSync(w.dist);
    writeFileSync(path.join(w.dist, 'sentinel.txt'), 'keep');
    editJson<TableDoc>(path.join(w.app, 'table.json'), (t) => {
      t.rules = t.rules.filter((r) => r.id !== 'large-wet');
    });
    const result = await runBuild(w);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain('gaps: 1');
    expect(readFileSync(path.join(w.dist, 'sentinel.txt'), 'utf8')).toBe('keep');
  });

  it('rejects a theme.css with a selector', { timeout: 30000 }, async () => {
    const w = workspace();
    writeFileSync(path.join(w.app, 'theme.css'), readFileSync(path.join(w.app, 'theme.css'), 'utf8') + '\nbody { color: red }\n');
    const result = await runBuild(w);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain('selector \\"body\\" is not allowed');
  });

  const rows: { name: string; setup: (w: Workspace) => void; expected: string; outDir?: (w: Workspace) => string }[] = [
    {
      name: 'a missing label',
      setup: (w) => editJson<CopyDoc>(path.join(w.app, 'copy.json'), (c) => delete c.labels['change']),
      expected: 'labels.change: missing',
    },
    {
      name: 'a bad answerStyle',
      setup: (w) => editJson<CopyDoc>(path.join(w.app, 'copy.json'), (c) => (c.answerStyle = 'grid')),
      expected: 'answerStyle: must be "tiles" or "list"',
    },
    {
      name: 'a javascript: footer href',
      setup: (w) => editJson<CopyDoc>(path.join(w.app, 'copy.json'), (c) => (c.footer = [{ text: 'x', href: 'javascript:alert(1)' }])),
      expected: 'footer[0].href: must start with https:// or http://',
    },
    {
      name: 'a javascript: source url',
      setup: (w) => editJson<TableDoc>(path.join(w.app, 'table.json'), (t) => (t.sources[0]!.url = 'javascript:alert(1)')),
      expected: 'sources[0].url: must start with https:// or http://',
    },
    {
      name: 'an icon key that is not a value id',
      setup: (w) => editJson<Record<string, unknown>>(path.join(w.app, 'copy.json'), (c) => (c['icons'] = { nope: ['M0 0L24 24'] })),
      expected: 'icons.nope: not a value id of the table',
    },
    {
      name: 'an icon path with characters that are not path characters',
      setup: (w) => editJson<Record<string, unknown>>(path.join(w.app, 'copy.json'), (c) => (c['icons'] = { small: ['M0 0 <script>'] })),
      expected: 'icons.small[0]: contains characters that are not SVG path characters',
    },
    {
      name: 'a filter on a condition that is not in the table',
      setup: (w) =>
        editJson<Record<string, unknown>>(path.join(w.app, 'copy.json'), (c) => {
          c['filter'] = { condition: 'nope', label: 'a', placeholder: 'b', noMatch: 'c', showAll: 'd', count: '{n}', countOne: 'e', keywords: {} };
        }),
      expected: 'filter.condition: "nope" is not a condition id of the table',
    },
    {
      name: 'an extra file in the app folder',
      setup: (w) => writeFileSync(path.join(w.app, 'extra.txt'), 'x'),
      expected: 'unexpected file extra.txt',
    },
    {
      name: 'a folder name different from the table id',
      setup: (w) => editJson<TableDoc>(path.join(w.app, 'table.json'), (t) => (t.id = 'other')),
      expected: 'must equal the folder name "demo"',
    },
    {
      name: 'an empty apps folder',
      setup: (w) => rmSync(w.app, { recursive: true }),
      expected: 'no apps found',
    },
    {
      name: 'an output directory equal to the repo root',
      setup: (w) => writeFileSync(path.join(w.root, 'keep.txt'), 'keep'),
      expected: 'refusing to use',
      outDir: (w) => w.root,
    },
  ];

  it.each(rows)('rejects $name', { timeout: 30000 }, async (row) => {
    const w = workspace();
    row.setup(w);
    const result = await runBuild(w, row.outDir?.(w));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain(row.expected);
    expect(existsSync(path.join(w.root, 'apps'))).toBe(true);
    expect(existsSync(w.dist)).toBe(false);
  });

  it('keeps the shell files within the contract', () => {
    const css = readFileSync(path.join(repo, 'skeleton/shell/shell.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const used = [...css.matchAll(/var\(\s*(--[a-z-]*)/g)].map((m) => m[1] ?? '');
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(THEME_PROPS as readonly string[]).toContain(name);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|url\(|@import/);

    expect(validateTheme(readFileSync(path.join(repo, 'skeleton/shell/neutral-theme.css'), 'utf8'))).toEqual([]);
    expect(validateLanding(JSON.parse(readFileSync(path.join(repo, 'skeleton/shell/landing.json'), 'utf8')))).toEqual([]);
  });

  it('keeps playground.css within the contract', () => {
    const css = readFileSync(path.join(repo, 'skeleton/playground/playground.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // The one exception (playground spec, owner answer 7e): the status tokens, `--pg-name: value;`, may hold colour literals,
    // and `var(--pg-name)` may use a token the file defines. Everything else stays under the original rules.
    const tokens = new Set([...css.matchAll(/(--pg-[a-z-]+)\s*:/g)].map((m) => m[1] ?? ''));
    expect(tokens.size).toBeGreaterThan(0);
    const rest = css.replace(/--pg-[a-z-]+\s*:[^;]*;/g, '');
    const used = [...rest.matchAll(/var\(\s*(--[a-z-]*)/g)].map((m) => m[1] ?? '');
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) {
      if (name.startsWith('--pg-')) expect([...tokens]).toContain(name);
      else expect(THEME_PROPS as readonly string[]).toContain(name);
    }
    expect(rest).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|url\(|@import/);
  });

  it('reads the light and dark values of a theme', () => {
    const theme = parseTheme(readFileSync(path.join(repo, 'apps/which-bin/theme.css'), 'utf8'));
    expect(theme.light['--radius']).toBe('1.25rem');
    expect(Object.keys(theme.light)).toHaveLength(13);
    expect(Object.keys(theme.dark)).toHaveLength(8);
    expect(theme.dark['--bg']).toBe('#2a1a10');
  });
});

interface PlaygroundDoc { [key: string]: unknown; title: string; editor: Record<string, string>; results: Record<string, string> }

describe('playground copy', () => {
  const real = (): PlaygroundDoc => JSON.parse(readFileSync(path.join(repo, 'skeleton/playground/playground.json'), 'utf8')) as PlaygroundDoc;

  it('accepts the real file', () => {
    expect(validatePlayground(real())).toEqual([]);
  });

  it.each([
    { name: 'a missing label', edit: (c: PlaygroundDoc) => delete c.editor['reset'], expected: 'editor.reset: missing' },
    { name: 'a missing placeholder', edit: (c: PlaygroundDoc) => (c.results['passes'] = 'Passes: {combinations}'), expected: 'results.passes: must contain {rules}' },
    { name: 'an unknown key', edit: (c: PlaygroundDoc) => (c['extra'] = 'x'), expected: 'extra: unknown key' },
    { name: 'an empty string', edit: (c: PlaygroundDoc) => (c.title = '  '), expected: 'title: must not be empty' },
  ])('rejects $name', ({ edit, expected }) => {
    const copy = real();
    edit(copy);
    expect(validatePlayground(copy)).toContain(expected);
  });
});

describe('landing copy', () => {
  const real = (): Record<string, unknown> =>
    JSON.parse(readFileSync(path.join(repo, 'skeleton/shell/landing.json'), 'utf8')) as Record<string, unknown>;

  it('accepts the real file', () => {
    expect(validateLanding(real())).toEqual([]);
  });

  it.each([
    { name: 'a missing playground link', edit: (l: Record<string, unknown>) => delete l['playground'], expected: 'playground: missing' },
    { name: 'a missing diagram word', edit: (l: Record<string, unknown>) => delete (l['diagram'] as Record<string, unknown>)['gaps'], expected: 'diagram.gaps: missing' },
    { name: 'a repository URL with a trailing slash', edit: (l: Record<string, unknown>) => (l['repo'] = 'https://github.com/o/r/'), expected: 'repo: must be an https:// URL without a trailing slash' },
    { name: 'the removed intro paragraph', edit: (l: Record<string, unknown>) => (l['intro'] = 'x'), expected: 'intro: unknown key' },
  ])('rejects $name', ({ edit, expected }) => {
    const landing = real();
    edit(landing);
    expect(validateLanding(landing)).toContain(expected);
  });
});

describe('app summary for the landing page', () => {
  it('carries the theme and the first question with three answers', () => {
    const read = (file: string): string => readFileSync(path.join(repo, 'apps/which-bin', file), 'utf8');
    const table = JSON.parse(read('table.json')) as Table;
    const summary = summariseApp('which-bin', table, JSON.parse(read('copy.json')) as Copy, read('theme.css'));
    const first = table.conditions[0];
    expect(summary.preview.question).toBe(first?.question);
    expect(summary.preview.answers).toEqual((first?.values ?? []).slice(0, 3).map((v) => v.label));
    expect(summary.theme.light['--accent']).toBe('#a63d00');
    expect(summary.theme.dark['--bg']).toBe('#2a1a10');
  });
});
