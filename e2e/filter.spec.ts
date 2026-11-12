import { expect, test } from '@playwright/test';
import { loadApp, progress, valueLabel } from './helpers.ts';

test('which-bin: filter narrows the tiles and Enter chooses the only match', async ({ page }) => {
  const { table, copy } = loadApp('which-bin');
  const filter = copy.filter;
  if (filter === undefined) throw new Error('which-bin copy.json has no filter');
  await page.goto('which-bin/');

  const box = page.getByLabel(filter.label);
  await expect(box).toHaveAttribute('type', 'search');
  const tiles = page.locator('ul.choices button.choice');
  expect(await tiles.count()).toBe(15);

  await box.fill('pizza');
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first()).toContainText(valueLabel(table, 'kind', 'paper-box'));

  await box.press('Enter');
  await expect(page.getByText(progress(copy, 2))).toBeVisible();
  await expect(page.getByRole('region', { name: copy.labels.yourAnswers }).getByRole('listitem')).toHaveCount(1);
});
