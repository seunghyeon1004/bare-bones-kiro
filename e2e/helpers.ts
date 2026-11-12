import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Table } from '../skeleton/engine/index.ts';
import type { Copy, Landing } from '../skeleton/shell/copy-type.ts';

const root = path.resolve(import.meta.dirname, '..');

export const APPS = ['which-bin', 'which-licence'] as const;
export type AppName = (typeof APPS)[number];

export function loadApp(name: AppName): { table: Table; copy: Copy } {
  const read = (file: string): unknown => JSON.parse(readFileSync(path.join(root, 'apps', name, file), 'utf8'));
  return { table: read('table.json') as Table, copy: read('copy.json') as Copy };
}

export function loadLanding(): Landing {
  return JSON.parse(readFileSync(path.join(root, 'skeleton/shell/landing.json'), 'utf8')) as Landing;
}

/** The label of a value, from the table. */
export function valueLabel(table: Table, condition: string, value: string): string {
  const label = table.conditions.find((c) => c.id === condition)?.values.find((v) => v.id === value)?.label;
  if (label === undefined) throw new Error(`no value ${condition}=${value}`);
  return label;
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The choice button whose accessible name starts with `label` and is not followed by a letter. */
export function choice(page: Page, label: string): Locator {
  return page.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}(?![\\p{L}])`, 'u') });
}

/** Keyboard only: Tab until the choice has focus, then Enter. */
export async function pressChoice(page: Page, label: string): Promise<void> {
  const button = choice(page, label);
  for (let i = 0; i < 40; i++) {
    if ((await button.count()) === 1 && (await button.evaluate((node) => node === document.activeElement))) {
      await page.keyboard.press('Enter');
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`could not reach the choice "${label}" with Tab`);
}

/** The progress sentence for question `n`, as a pattern (`{max}` is any number). */
export function progress(copy: Copy, n: number): RegExp {
  const parts = copy.labels.questionOf.split(/\{n\}|\{max\}/).map(escapeRegExp);
  const [before = '', between = '', after = ''] = parts;
  return new RegExp(`^${before}${n}${between}\\d+${after}$`);
}

/** The result heading text: the lead phrase, a space, the outcome label. */
export function resultHeading(copy: Copy, table: Table, outcome: string): string {
  const label = table.outcomes.find((o) => o.id === outcome)?.label;
  if (label === undefined) throw new Error(`no outcome ${outcome}`);
  return `${copy.resultLead} ${label}`;
}

export function steps(page: Page, copy: Copy): Locator {
  return page.getByRole('region', { name: copy.labels.yourAnswers }).getByRole('listitem');
}

export function skipped(page: Page, copy: Copy): Locator {
  return page.getByRole('heading', { name: copy.labels.notAsked }).locator('xpath=following-sibling::ul[1]/li');
}

export async function scanAxe(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

/** Opens the whole-table view with the toggle button. */
export async function openTable(page: Page, copy: Copy, table: Table): Promise<Locator> {
  const toggle = page.getByRole('button', { name: copy.labels.showTable });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.getByRole('button', { name: copy.labels.hideTable })).toHaveAttribute('aria-expanded', 'true');
  const view = page.getByRole('table', { name: table.title });
  await expect(view).toBeVisible();
  return view;
}
