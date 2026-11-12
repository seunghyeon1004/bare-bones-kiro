import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { build } from '../skeleton/build/build.ts';
import { validateLanding } from '../skeleton/build/copy-check.ts';
import { THEME_PROPS, validateTheme } from '../skeleton/build/theme-check.ts';
import { run } from '../skeleton/cli/bones.ts';

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
  it('builds an app made by `bones new` into exactly the eight files', { timeout: 30000 }, async () => {
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
      'shell.css',
      'theme.css',
    ]);

    for (const page of ['index.html', 'demo/index.html']) {
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
});
