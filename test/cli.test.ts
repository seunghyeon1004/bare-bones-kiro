import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from '../skeleton/cli/bones.ts';

const root = path.resolve(import.meta.dirname, '..');
const temps: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'bones-cli-'));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('bones check', () => {
  it('prints the gap example and exits 1', () => {
    const r = run(['check', 'skeleton/examples/gap.table.json'], { cwd: root });
    expect(r.code).toBe(1);
    expect(r.out).toBe('gaps: 1\n  size=large, wet=yes\nfailed\n');
    expect(r.err).toBe('');
  });

  it('prints the conflict example and exits 1', () => {
    const r = run(['check', 'skeleton/examples/conflict.table.json'], { cwd: root });
    expect(r.code).toBe(1);
    expect(r.out).toBe('gaps: 0\nconflict: small -> tray-a vs wet -> tray-b, e.g. size=small, wet=yes\nfailed\n');
  });

  it('passes the template with exit 0', () => {
    const r = run(['check', 'skeleton/template/table.json'], { cwd: root });
    expect(r.code).toBe(0);
    expect(r.out).toBe('gaps: 0\nok: 2 conditions, 4 combinations, 4 rules\n');
  });

  it('reports structural problems before any check', () => {
    const dir = tempDir();
    const table = JSON.parse(readFileSync(path.join(root, 'skeleton/template/table.json'), 'utf8')) as {
      rules: { then: string }[];
    };
    const first = table.rules[0];
    if (first === undefined) throw new Error('template has no rules');
    first.then = 'no-such-outcome';
    writeFileSync(path.join(dir, 'bad.json'), JSON.stringify(table));
    const r = run(['check', 'bad.json'], { cwd: dir });
    expect(r.code).toBe(1);
    expect(r.out).toBe('rules[0].then: "no-such-outcome" is not an outcome id.\nfailed\n');
  });

  it('exits 1 with the invalid JSON line for a file that is not JSON', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, 'broken.json'), '{ not json');
    const r = run(['check', 'broken.json'], { cwd: dir });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^\$: invalid JSON: .+\nfailed\n$/);
  });

  it.each([
    ['no command', []],
    ['unknown command', ['frobnicate']],
    ['check without a file', ['check']],
    ['missing file', ['check', 'does-not-exist.json']],
    ['unknown option', ['check', '--verbose', 'skeleton/template/table.json']],
  ])('usage error: %s', (_name, argv) => {
    const r = run(argv, { cwd: root });
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(r.err).not.toBe('');
  });

  it('exits 1 when the real process checks the gap example', () => {
    const r = spawnSync(process.execPath, ['--import', 'tsx', 'skeleton/cli/bones.ts', 'check', 'skeleton/examples/gap.table.json'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('gaps: 1\n  size=large, wet=yes\nfailed\n');
  });
});

describe('bones new', () => {
  it('creates the three files with id and titles set', () => {
    const apps = tempDir();
    const r = run(['new', 'my-tool', '--apps', apps], { cwd: root });
    expect(r.code).toBe(0);
    expect(r.out).toBe(`created ${apps}/my-tool\n`);
    const folder = path.join(apps, 'my-tool');
    expect(readdirSync(folder).sort()).toEqual(['copy.json', 'table.json', 'theme.css']);
    const table = JSON.parse(readFileSync(path.join(folder, 'table.json'), 'utf8')) as { id: string; title: string };
    const copy = JSON.parse(readFileSync(path.join(folder, 'copy.json'), 'utf8')) as { title: string };
    expect(table.id).toBe('my-tool');
    expect(table.title).toBe('My tool');
    expect(copy.title).toBe('My tool');
    expect(readFileSync(path.join(folder, 'theme.css'), 'utf8')).toBe(
      readFileSync(path.join(root, 'skeleton/template/theme.css'), 'utf8'),
    );
  });

  it('refuses an existing folder and leaves it unchanged', () => {
    const apps = tempDir();
    run(['new', 'demo', '--apps', apps], { cwd: root });
    const before = readFileSync(path.join(apps, 'demo', 'table.json'), 'utf8');
    const r = run(['new', 'demo', '--apps', apps], { cwd: root });
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(readFileSync(path.join(apps, 'demo', 'table.json'), 'utf8')).toBe(before);
  });

  it('refuses a bad name and creates nothing', () => {
    const apps = tempDir();
    const r = run(['new', 'Bad_Name', '--apps', apps], { cwd: root });
    expect(r.code).toBe(2);
    expect(readdirSync(apps)).toEqual([]);
  });
});
