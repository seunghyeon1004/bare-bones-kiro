import { expect, test } from '@playwright/test';
import { loadApp, pressChoice, progress, resultHeading, skipped, steps, valueLabel } from './helpers.ts';

test('which-bin: keyboard walk, greasy pizza box', async ({ page }) => {
  const { table, copy } = loadApp('which-bin');
  await page.goto('which-bin/');
  await expect(page.getByText(progress(copy, 1))).toBeVisible();

  await pressChoice(page, valueLabel(table, 'kind', 'paper-box'));
  await expect(page.getByText(progress(copy, 2))).toBeVisible();
  await pressChoice(page, valueLabel(table, 'soiled', 'yes'));

  const heading = page.getByRole('heading', { name: resultHeading(copy, table, 'general-waste') });
  await expect(heading).toBeFocused();
  await expect(steps(page, copy)).toHaveCount(2);
  await expect(skipped(page, copy)).toHaveCount(5);
});

test('which-licence: keyboard walk, MIT', async ({ page }) => {
  const { table, copy } = loadApp('which-licence');
  await page.goto('which-licence/');
  await expect(page.getByText(progress(copy, 1))).toBeVisible();

  await pressChoice(page, valueLabel(table, 'copyleft', 'none'));
  await pressChoice(page, valueLabel(table, 'patent', 'no'));
  await pressChoice(page, valueLabel(table, 'credit', 'yes'));

  const heading = page.getByRole('heading', { name: resultHeading(copy, table, 'mit') });
  await expect(heading).toBeFocused();
  await expect(steps(page, copy)).toHaveCount(3);
  await expect(skipped(page, copy)).toHaveCount(1);
  await expect(skipped(page, copy).first()).toHaveText(table.conditions.find((c) => c.id === 'network')?.question ?? '');
});
