import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { APPS, loadApp, loadLanding, scanAxe } from './helpers.ts';

const root = path.resolve(import.meta.dirname, '..');
const FILES = ['table.json', 'copy.json', 'theme.css'];

test('landing page: hero picture, two app cards, playground card, the three files', async ({ page }) => {
  const landing = loadLanding();
  await page.goto('./');
  await expect(page).toHaveTitle(landing.title);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(landing.title);
  await expect(page.getByText(landing.tagline, { exact: true })).toBeVisible();

  // The picture: an image with a name, its words from landing.json.
  const picture = page.getByRole('img', { name: landing.diagram.title });
  await expect(picture).toBeVisible();
  await expect(picture.locator('title')).toHaveText(landing.diagram.title);
  for (const words of [landing.diagram.checkerLabel, landing.diagram.gaps, landing.diagram.conflicts, landing.diagram.question]) {
    await expect(picture.getByText(words, { exact: true })).toBeAttached();
  }

  // One link per app card, in the apps region; each card shows its own first question and wears the app's colours.
  const cards = page.getByRole('region', { name: landing.appsHeading }).getByRole('link');
  await expect(cards).toHaveCount(APPS.length);
  for (const [index, name] of APPS.entries()) {
    const { table, copy } = loadApp(name);
    const card = cards.nth(index);
    await expect(card).toHaveAttribute('href', `./${name}/`);
    await expect(card).toHaveAccessibleName(`${copy.title} ${copy.tagline}`);
    const first = table.conditions[0];
    await expect(card.getByText(first?.question ?? '', { exact: true })).toBeVisible();
    await expect(card.locator('.chip').first()).toHaveText(first?.values[0]?.label ?? '');
    const accent = /--accent:\s*([^;]+);/.exec(readFileSync(path.join(root, 'apps', name, 'theme.css'), 'utf8'))?.[1]?.trim();
    expect(await card.evaluate((node) => getComputedStyle(node).getPropertyValue('--accent').trim())).toBe(accent);
  }

  // The playground card comes after the app cards.
  const playground = page.getByRole('link', { name: landing.playground.title });
  await expect(playground).toHaveAttribute('href', './playground/');
  const [playgroundBox, lastCardBox] = [await playground.boundingBox(), await cards.last().boundingBox()];
  expect(playgroundBox?.y ?? 0).toBeGreaterThan((lastCardBox?.y ?? Infinity) + (lastCardBox?.height ?? 0) - 1);

  // Three real files per app, linked into the repository, and the command for a new one.
  for (const name of APPS) {
    const { copy } = loadApp(name);
    for (const file of FILES) {
      await expect(page.getByRole('link', { name: `${file} (${copy.title})` })).toHaveAttribute('href', `${landing.repo}/blob/main/apps/${name}/${file}`);
    }
  }
  await expect(page.getByText(landing.newAppCommand, { exact: true })).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/which-bin\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(loadApp('which-bin').copy.title);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`landing page: axe and no horizontal scroll, ${scheme}`, async ({ page }) => {
    // Reduced motion: the hover transitions must not make axe read a colour mid-transition.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    for (const [width, height] of [
      [1280, 800],
      [360, 740],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('about:blank');
      await page.goto('./');
      await expect(page.getByRole('img', { name: loadLanding().diagram.title })).toBeVisible();
      expect(await scanAxe(page), `${width}px`).toEqual([]);
      const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(size.scroll, `${width}px`).toBeLessThanOrEqual(size.client);
    }
  });
}
