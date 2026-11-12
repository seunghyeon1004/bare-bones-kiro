import { expect, test } from '@playwright/test';
import { APPS, loadApp, loadLanding, scanAxe } from './helpers.ts';

test('landing page lists both apps', async ({ page }) => {
  const landing = loadLanding();
  await page.goto('./');
  await expect(page).toHaveTitle(landing.title);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(landing.title);

  const links = page.getByRole('list').getByRole('link');
  await expect(links).toHaveCount(APPS.length);
  for (const [index, name] of APPS.entries()) {
    const { copy } = loadApp(name);
    await expect(links.nth(index)).toHaveText(copy.title);
    await expect(page.getByText(copy.tagline)).toBeVisible();
  }
  expect(await scanAxe(page)).toEqual([]);

  await page.keyboard.press('Tab');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/which-bin\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(loadApp('which-bin').copy.title);
});
