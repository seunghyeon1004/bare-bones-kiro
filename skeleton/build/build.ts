import { build as bundle } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, formatInvalidJson, formatProblems, formatReport, validate } from '../engine/index.ts';
import type { Table } from '../engine/index.ts';
import type { AppSummary, Copy, Landing } from '../shell/copy-type.ts';
import { validateCopy, validateLanding } from './copy-check.ts';
import { bootApp, bootLanding, renderPage } from './page.ts';
import { validateTheme } from './theme-check.ts';

export interface BuildOptions { appsDir: string; outDir: string; repoRoot: string }
export type BuildResult = { ok: true; apps: string[] } | { ok: false; errors: string[] };

const SHELL_DIR = fileURLToPath(new URL('../shell/', import.meta.url));
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const APP_FILES = ['copy.json', 'table.json', 'theme.css'];

interface ParsedApp { name: string; table: Table; copy: Copy; themeCss: string }

/** `realpath` of the deepest existing ancestor, joined with the rest, so a path that does not exist yet still compares. */
function realish(p: string): string {
  const absolute = path.resolve(p);
  const rest: string[] = [];
  let probe = absolute;
  while (!existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) return absolute;
    rest.unshift(path.basename(probe));
    probe = parent;
  }
  return path.join(realpathSync(probe), ...rest);
}

function contains(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function parseJson(file: string, label: string, errors: string[]): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export async function build(opts: BuildOptions): Promise<BuildResult> {
  const errors: string[] = [];
  const show = (p: string): string => {
    const relative = path.relative(opts.repoRoot, p);
    return relative.startsWith('..') || path.isAbsolute(relative) ? p : relative.split(path.sep).join('/');
  };

  // The output directory is deleted later, so refuse the dangerous ones before anything else.
  const outReal = realish(opts.outDir);
  for (const protectedDir of [opts.repoRoot, opts.appsDir, SHELL_DIR]) {
    if (contains(outReal, realish(protectedDir))) {
      errors.push(`refusing to use ${show(opts.outDir)} as the output directory: it contains ${show(protectedDir)}`);
    }
  }

  // 1. The app folders.
  const names = existsSync(opts.appsDir)
    ? readdirSync(opts.appsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    : [];
  if (names.length === 0) errors.push(`no apps found in ${show(opts.appsDir)}`);

  // 2 and 3. Each app: files, JSON, table, copy, theme.
  const apps: ParsedApp[] = [];
  for (const name of names) {
    const dir = path.join(opts.appsDir, name);
    const shown = show(dir);
    const before = errors.length;
    if (!ID_PATTERN.test(name)) errors.push(`${shown}: folder name is not a lower-case kebab-case id`);
    const files = readdirSync(dir);
    for (const file of files) if (!APP_FILES.includes(file)) errors.push(`${shown}: unexpected file ${file}`);
    for (const file of APP_FILES) if (!files.includes(file)) errors.push(`${shown}: missing ${file}`);
    if (errors.length > before) continue;

    const tableJson = parseJson(path.join(dir, 'table.json'), `${shown}/table.json`, errors);
    const copyJson = parseJson(path.join(dir, 'copy.json'), `${shown}/copy.json`, errors);
    const themeCss = readFileSync(path.join(dir, 'theme.css'), 'utf8');

    let table: Table | undefined;
    if (tableJson !== undefined) {
      const heading = `== ${shown}/table.json ==`;
      const result = validate(tableJson);
      if (!result.ok) {
        errors.push(`${heading}\n${formatProblems(result.problems).trimEnd()}`);
      } else {
        table = result.table;
        const report = check(table);
        if (!report.passed) errors.push(`${heading}\n${formatReport(report).trimEnd()}`);
        if (table.id !== name) errors.push(`${shown}/table.json: id "${table.id}" must equal the folder name "${name}"`);
        table.sources.forEach((s, i) => {
          if (!/^https?:\/\//.test(s.url)) errors.push(`${shown}/table.json: sources[${i}].url: must start with https:// or http://`);
        });
      }
    }
    if (copyJson !== undefined) {
      for (const problem of validateCopy(copyJson)) errors.push(`${shown}/copy.json: ${problem}`);
    }
    for (const problem of validateTheme(themeCss)) errors.push(`${shown}/theme.css: ${problem}`);

    if (errors.length === before && table !== undefined) apps.push({ name, table, copy: copyJson as Copy, themeCss });
  }

  // 4. The landing page's own files.
  const landingJson = parseJson(path.join(SHELL_DIR, 'landing.json'), 'skeleton/shell/landing.json', errors);
  if (landingJson !== undefined) {
    for (const problem of validateLanding(landingJson)) errors.push(`skeleton/shell/landing.json: ${problem}`);
  }
  const neutralTheme = readFileSync(path.join(SHELL_DIR, 'neutral-theme.css'), 'utf8');
  for (const problem of validateTheme(neutralTheme)) errors.push(`skeleton/shell/neutral-theme.css: ${problem}`);

  if (errors.length > 0) return { ok: false, errors };

  // 5. Everything is valid. Bundle first, so a bundling failure leaves the output untouched.
  const bundleEntry = async (entry: string): Promise<string> => {
    const result = await bundle({
      entryPoints: [path.join(SHELL_DIR, entry)],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2022',
      minify: true,
      write: false,
      legalComments: 'none',
      outfile: 'app.js',
      logLevel: 'silent',
    });
    const file = result.outputFiles[0];
    if (file === undefined) throw new Error(`esbuild produced no output for ${entry}`);
    return file.text;
  };
  let shellJs: string;
  let landingJs: string;
  try {
    shellJs = await bundleEntry('shell.ts');
    landingJs = await bundleEntry('landing.ts');
  } catch (error) {
    return { ok: false, errors: [`esbuild: ${error instanceof Error ? error.message : String(error)}`] };
  }

  const template = readFileSync(path.join(SHELL_DIR, 'page.html'), 'utf8');
  const shellCss = readFileSync(path.join(SHELL_DIR, 'shell.css'), 'utf8');
  const landing = landingJson as Landing;
  const summaries: AppSummary[] = apps.map((a) => ({ id: a.name, title: a.copy.title, tagline: a.copy.tagline }));

  rmSync(opts.outDir, { recursive: true, force: true });
  mkdirSync(opts.outDir, { recursive: true });
  const put = (relative: string, content: string): void => {
    const target = path.join(opts.outDir, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  };

  put('index.html', renderPage(template, { landing, apps: summaries }, bootLanding(landing, summaries), landing.title));
  put('app.js', landingJs);
  put('shell.css', shellCss);
  put('theme.css', neutralTheme);
  for (const app of apps) {
    put(`${app.name}/index.html`, renderPage(template, { table: app.table, copy: app.copy }, bootApp(app.copy), app.copy.title));
    put(`${app.name}/app.js`, shellJs);
    put(`${app.name}/shell.css`, shellCss);
    put(`${app.name}/theme.css`, app.themeCss);
  }
  return { ok: true, apps: apps.map((a) => a.name) };
}

export async function main(): Promise<void> {
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
  const result = await build({
    appsDir: path.join(repoRoot, 'apps'),
    outDir: path.join(repoRoot, 'dist'),
    repoRoot,
  });
  if (result.ok) {
    process.stdout.write(`built ${result.apps.length} apps into dist/\n`);
  } else {
    process.stderr.write(result.errors.join('\n') + '\n');
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
