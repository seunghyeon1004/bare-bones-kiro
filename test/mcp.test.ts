import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { expect, it } from 'vitest';

const repo = path.resolve(import.meta.dirname, '..');

interface ToolReply { isError?: boolean; content: { type: string; text: string }[] }

interface Payload {
  valid?: boolean;
  report?: { passed: boolean; gaps: { count: number } };
  problems?: { path: string }[];
  status?: string;
  outcome?: { id: string };
  skipped?: { condition: string }[];
}

async function call(client: Client, name: string, args: Record<string, unknown>): Promise<{ isError: boolean; json: Payload }> {
  const reply = (await client.callTool({ name, arguments: args })) as ToolReply;
  return { isError: reply.isError === true, json: JSON.parse(reply.content[0]?.text ?? 'null') };
}

it('serves check_table and evaluate over stdio', { timeout: 30000 }, async () => {
  const client = new Client({ name: 'test', version: '0.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'skeleton/mcp/server.ts'],
    cwd: repo,
  });
  try {
    await client.connect(transport);

    const gap = await call(client, 'check_table', { path: 'skeleton/examples/gap.table.json' });
    expect(gap.isError).toBe(false);
    expect(gap.json.valid).toBe(true);
    expect(gap.json.report?.gaps.count).toBe(1);
    expect(gap.json.report?.passed).toBe(false);

    const bad = await call(client, 'check_table', {
      table: { id: 'x', title: 'X', conditions: [], outcomes: [], rules: [{ id: 'r' }], sources: [] },
    });
    expect(bad.json.valid).toBe(false);
    expect(bad.json.problems?.[0]?.path).toMatch(/^rules\[0\]/);

    const decided = await call(client, 'evaluate', { path: 'skeleton/template/table.json', answers: { wet: 'yes' } });
    expect(decided.json.status).toBe('decided');
    expect(decided.json.outcome?.id).toBe('tray-b');
    expect(decided.json.skipped?.map((s) => s.condition)).toEqual(['size']);

    const outside = await call(client, 'check_table', { path: '../outside.json' });
    expect(outside.isError).toBe(true);
  } finally {
    await client.close();
  }
});
