import { expect, test } from '@playwright/test';
import { loadApp, openTable, scanAxe } from './helpers.ts';
import type { AppName } from './helpers.ts';

const RESULT_HASH: Record<AppName, string> = { 'which-bin': '#kind=battery', 'which-licence': '#copyleft=file' };

for (const [name, scheme] of [
  ['which-bin', 'light'],
  ['which-bin', 'dark'],
  ['which-licence', 'light'],
  ['which-licence', 'dark'],
] as const) {
  test(`axe, ${name}, ${scheme}`, async ({ page }) => {
    const { table, copy } = loadApp(name);
    // Reduced motion: the colour transitions of shell.css must not make axe read a colour mid-transition.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });

    await page.goto(`${name}/`);
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    expect(await scanAxe(page), 'question screen').toEqual([]);

    await page.goto('about:blank');
    await page.goto(`${name}/${RESULT_HASH[name]}`);
    await expect(page.getByRole('heading', { name: new RegExp(`^${copy.resultLead}`) })).toBeFocused();
    expect(await scanAxe(page), 'result screen').toEqual([]);

    await openTable(page, copy, table);
    expect(await scanAxe(page), 'result screen with the whole table').toEqual([]);
  });
}
