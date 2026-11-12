import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loadApp, openTable } from './helpers.ts';
import type { AppName } from './helpers.ts';

async function checkTable(page: Page, name: AppName, rows: number, ruleId: string): Promise<void> {
  const { table, copy } = loadApp(name);
  await page.goto(`${name}/`);
  const view = await openTable(page, copy, table);
  await expect(view.locator('tbody tr')).toHaveCount(rows);
  await expect(view.locator('thead th')).toHaveCount(table.conditions.length + 3);

  const rule = table.rules.find((r) => r.id === ruleId);
  if (rule === undefined) throw new Error(`no rule ${ruleId}`);
  const row = view.locator('tbody tr').filter({ has: page.locator('th[scope="row"]', { hasText: new RegExp(`^${ruleId}$`) }) });
  await expect(row).toHaveCount(1);
  const unnamed = table.conditions.length - Object.keys(rule.when).length;
  await expect(row.locator('td').filter({ hasText: new RegExp(`^${copy.labels.any}$`) })).toHaveCount(unnamed);
  await expect(row.locator('td').last()).toContainText(rule.source.at);
}

test('which-bin: whole table', async ({ page }) => {
  await checkTable(page, 'which-bin', 27, 'receipt');
});

test('which-licence: whole table', async ({ page }) => {
  await checkTable(page, 'which-licence', 7, 'copyleft-file');
});
