import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { check, decide, validate } from '../engine/index.ts';

const MAX_BYTES = 1_000_000;
const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

function reply(payload: unknown, isError = false): ToolResult {
  const result: ToolResult = { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
  if (isError) result.isError = true;
  return result;
}

function outside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative.startsWith('..') || path.isAbsolute(relative);
}

/** Reads a JSON file inside the repository. Throws an Error whose message never contains file content. */
export async function readRepoJson(repoRoot: string, p: string): Promise<unknown> {
  // Lexical check first, so a probe cannot learn whether a file outside the repository exists.
  const absolute = path.resolve(repoRoot, p);
  if (outside(repoRoot, absolute)) throw new Error('path is outside the repository');

  let real: string;
  try {
    real = await realpath(absolute);
  } catch {
    throw new Error('file does not exist');
  }
  if (outside(await realpath(repoRoot), real)) throw new Error('path is outside the repository');
  if (path.extname(real).toLowerCase() !== '.json') throw new Error('file must end in .json');

  const info = await stat(real);
  if (!info.isFile()) throw new Error('path is not a regular file');
  if (info.size > MAX_BYTES) throw new Error(`file is larger than ${MAX_BYTES} bytes`);

  const text = await readFile(real, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    // V8's message quotes part of the input; keep only the position.
    const position = error instanceof Error ? /at position \d+(?: \(line \d+ column \d+\))?/.exec(error.message)?.[0] : undefined;
    throw new Error(position === undefined ? 'invalid JSON' : `invalid JSON ${position}`);
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

export function createServer(repoRoot: string): McpServer {
  const server = new McpServer({ name: 'bare-bones', version: '0.1.0' });

  server.registerTool(
    'check_table',
    {
      description:
        'Check a decision table for structural problems, gaps and conflicts. Give exactly one of `path` (a .json file inside the repository) or `table` (the table itself).',
      inputSchema: { path: z.string().optional(), table: z.unknown().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ path: file, table }) => {
      if ((file === undefined) === (table === undefined)) {
        return reply({ error: 'give exactly one of path and table' }, true);
      }
      let input: unknown = table;
      if (file !== undefined) {
        try {
          input = await readRepoJson(repoRoot, file);
        } catch (error) {
          return reply({ error: errorText(error) }, true);
        }
      }
      const result = validate(input);
      if (!result.ok) return reply({ valid: false, problems: result.problems });
      return reply({ valid: true, report: check(result.table) });
    },
  );

  server.registerTool(
    'evaluate',
    {
      description:
        'Give answers (condition id to value id) to a table that passes the check, and get the decision: decided with the outcome and why, or open with the next question.',
      inputSchema: { path: z.string(), answers: z.record(z.string(), z.string()) },
      annotations: { readOnlyHint: true },
    },
    async ({ path: file, answers }) => {
      let input: unknown;
      try {
        input = await readRepoJson(repoRoot, file);
      } catch (error) {
        return reply({ error: errorText(error) }, true);
      }
      const result = validate(input);
      if (!result.ok) return reply({ valid: false, passed: false, problems: result.problems }, true);
      const report = check(result.table);
      if (!report.passed) {
        return reply({ valid: true, passed: false, gaps: report.gaps.count, conflicts: report.conflicts.length }, true);
      }
      return reply(decide(result.table, answers));
    },
  );

  return server;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await createServer(REPO_ROOT).connect(new StdioServerTransport());
  process.stderr.write('bare-bones MCP server ready\n');
}
