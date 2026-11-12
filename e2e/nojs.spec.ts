import { expect, test } from '@playwright/test';
import { APPS, loadApp } from './helpers.ts';

test.use({ javaScriptEnabled: false });

test('pages are not blank without JavaScript', async ({ page }) => {
  for (const name of APPS) {
    const { copy } = loadApp(name);
    await page.goto(`${name}/`);
    await expect(page).toHaveTitle(copy.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.title);
    await expect(page.getByText(copy.intro)).toBeVisible();
    // Playwright's text selectors skip <noscript>; innerText only holds what is rendered.
    expect(await page.locator('body').innerText()).toContain(copy.labels.noscript);
  }
});
