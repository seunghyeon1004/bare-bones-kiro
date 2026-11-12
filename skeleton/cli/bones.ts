import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, formatInvalidJson, formatProblems, formatReport, validate } from '../engine/index.ts';

export interface RunResult { code: 0 | 1 | 2; out: string; err: string }

const USAGE = 'usage: bones check <table.json> | bones new <name> [--apps <dir>]';
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TEMPLATE_DIR = fileURLToPath(new URL('../template/', import.meta.url));

function usageError(message: string): RunResult {
  return { code: 2, out: '', err: `${message}\n${USAGE}\n` };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runCheck(args: string[], cwd: string): RunResult {
  const option = args.find((a) => a.startsWith('-'));
  if (option !== undefined) return usageError(`unknown option: ${option}`);
  const [file, ...extra] = args;
  if (file === undefined) return usageError('check needs a table file');
  if (extra.length > 0) return usageError(`unexpected argument: ${extra[0] ?? ''}`);

  let text: string;
  try {
    text = readFileSync(path.resolve(cwd, file), 'utf8');
  } catch (error) {
    return usageError(`cannot read ${file}: ${errorMessage(error)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { code: 1, out: formatInvalidJson(errorMessage(error)), err: '' };
  }

  const result = validate(json);
  if (!result.ok) return { code: 1, out: formatProblems(result.problems), err: '' };
  const report = check(result.table);
  return { code: report.passed ? 0 : 1, out: formatReport(report), err: '' };
}

function titleOf(name: string): string {
  const spaced = name.replaceAll('-', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function runNew(args: string[], cwd: string): RunResult {
  let appsOption: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--apps') {
      appsOption = args[i + 1];
      if (appsOption === undefined) return usageError('--apps needs a directory');
      i++;
    } else if (arg.startsWith('-')) {
      return usageError(`unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  const [name, ...extra] = positional;
  if (name === undefined) return usageError('new needs a name');
  if (extra.length > 0) return usageError(`unexpected argument: ${extra[0] ?? ''}`);
  if (!NAME_PATTERN.test(name)) return usageError(`"${name}" is not a lower-case kebab-case name`);

  const shownApps = appsOption ?? 'apps';
  const target = path.join(path.resolve(cwd, shownApps), name);
  if (existsSync(target)) return usageError(`${path.join(shownApps, name)} already exists`);

  try {
    const table = JSON.parse(readFileSync(path.join(TEMPLATE_DIR, 'table.json'), 'utf8')) as Record<string, unknown>;
    const copy = JSON.parse(readFileSync(path.join(TEMPLATE_DIR, 'copy.json'), 'utf8')) as Record<string, unknown>;
    const title = titleOf(name);
    table['id'] = name;
    table['title'] = title;
    copy['title'] = title;
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'table.json'), JSON.stringify(table, null, 2) + '\n');
    writeFileSync(path.join(target, 'copy.json'), JSON.stringify(copy, null, 2) + '\n');
    cpSync(path.join(TEMPLATE_DIR, 'theme.css'), path.join(target, 'theme.css'));
  } catch (error) {
    return usageError(`cannot create ${path.join(shownApps, name)}: ${errorMessage(error)}`);
  }
  return { code: 0, out: `created ${shownApps}/${name}\n`, err: '' };
}

export function run(argv: string[], opts: { cwd: string }): RunResult {
  const [command, ...rest] = argv;
  if (command === undefined) return usageError('no command given');
  if (command === 'help' || command === '--help') return { code: 0, out: `${USAGE}\n`, err: '' };
  if (command === 'check') return runCheck(rest, opts.cwd);
  if (command === 'new') return runNew(rest, opts.cwd);
  return usageError(`unknown command: ${command}`);
}

export function main(): void {
  const result = run(process.argv.slice(2), { cwd: process.cwd() });
  process.stdout.write(result.out);
  process.stderr.write(result.err);
  process.exitCode = result.code;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
