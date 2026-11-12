import { expect, test } from '@playwright/test';
import { APPS, loadApp, openTable } from './helpers.ts';
import type { AppName } from './helpers.ts';

const RESULT_HASH: Record<AppName, string> = { 'which-bin': '#kind=battery', 'which-licence': '#copyleft=file' };

test('no horizontal scroll at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const overflow = (): Promise<{ scroll: number; client: number }> =>
    page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));

  for (const name of APPS) {
    const { table, copy } = loadApp(name);

    await page.goto(`${name}/`);
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    let size = await overflow();
    expect(size.scroll, `${name}, question screen`).toBeLessThanOrEqual(size.client);

    await page.goto('about:blank');
    await page.goto(`${name}/${RESULT_HASH[name]}`);
    await expect(page.getByRole('heading', { name: new RegExp(`^${copy.resultLead}`) })).toBeVisible();
    size = await overflow();
    expect(size.scroll, `${name}, result screen`).toBeLessThanOrEqual(size.client);

    await openTable(page, copy, table);
    size = await overflow();
    expect(size.scroll, `${name}, whole table`).toBeLessThanOrEqual(size.client);
  }
});
