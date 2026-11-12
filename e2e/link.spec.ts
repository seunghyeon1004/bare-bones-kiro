import { expect, test } from '@playwright/test';
import { loadApp, progress, resultHeading, steps } from './helpers.ts';

test('shared link and bad link', async ({ page }) => {
  const { table, copy } = loadApp('which-bin');

  // A complete link shows the result with no interaction.
  await page.goto('which-bin/#kind=glass&glass-type=ordinary&broken=yes&amount=small');
  await expect(page.getByRole('heading', { name: resultHeading(copy, table, 'general-waste') })).toBeFocused();
  await expect(steps(page, copy)).toHaveCount(4);

  // A link with unknown, repeated and bad entries keeps the valid ones and says so.
  await page.goto('about:blank');
  await page.goto('which-bin/#kind=glass&broken=maybe&nope=1&kind=can');
  await expect(page.getByText(copy.labels.badLink.replace('{count}', '3'), { exact: true })).toBeVisible();
  await expect(steps(page, copy)).toHaveCount(1);
  await expect(page.getByText(progress(copy, 2))).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp(`^${copy.resultLead}`) })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#kind=glass');
});
