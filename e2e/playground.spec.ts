import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { check, decide } from '../skeleton/engine/index.ts';
import type { CheckReport, Table } from '../skeleton/engine/index.ts';
import type { PlaygroundCopy } from '../skeleton/playground/types.ts';
import { formatTable } from '../skeleton/playground/rules.ts';
import { fill } from '../skeleton/shell/dom.ts';
import { loadApp, loadLanding, scanAxe } from './helpers.ts';

const root = path.resolve(import.meta.dirname, '..');
const copy = JSON.parse(readFileSync(path.join(root, 'skeleton/playground/playground.json'), 'utf8')) as PlaygroundCopy;
const licence = loadApp('which-licence');
const REMOVED = 'permissive-nothing';

const plural = (forms: { one: string; other: string }, n: number): string => fill(n === 1 ? forms.one : forms.other, { n });
const failsPrefix = copy.results.fails.split('{reason}')[0] ?? '';

function passingLine(report: CheckReport): string {
  return fill(copy.results.passes, {
    rules: plural(copy.plural.rule, report.counts.rules),
    combinations: plural(copy.plural.combination, report.counts.combinations),
  });
}

function withoutRule(table: Table, id: string): Table {
  return { ...table, rules: table.rules.filter((r) => r.id !== id) };
}

function firstQuestion(table: Table): { question: string; firstLabel: string } {
  const result = decide(table, {});
  if (result.status !== 'open') throw new Error('expected an open question');
  const value = result.next.values[0];
  if (value === undefined) throw new Error('no value');
  return { question: result.next.question, firstLabel: value.label };
}

/** Wide: the editor is left of the status and the app, and the app sits under the status. Narrow: status, editor, app, in that order. */
async function expectLayout(page: Page, width: number): Promise<void> {
  const box = async (selector: string): Promise<{ x: number; y: number; width: number }> => {
    const found = await page.locator(selector).first().boundingBox();
    if (found === null) throw new Error(`${selector} is not visible`);
    return found;
  };
  const [editor, statusBox, app] = [await box('.pg-editor'), await box('#pg-status'), await box('.pg-app')];
  if (width >= 960) {
    expect(statusBox.x).toBeGreaterThan(editor.x + editor.width - 1);
    expect(app.x).toBeGreaterThan(editor.x + editor.width - 1);
    expect(app.y).toBeGreaterThan(statusBox.y);
  } else {
    expect(statusBox.y).toBeLessThan(editor.y);
    expect(app.y).toBeGreaterThan(editor.y);
  }
}

const status = (page: Page) => page.locator('#pg-status');
const textarea = (page: Page) => page.getByLabel(copy.editor.textareaLabel);

test('playground: from the landing page, remove a rule, see the checker refuse it, reset', async ({ page }) => {
  const landing = loadLanding();
  const { table } = licence;
  const passing = passingLine(check(table));
  const broken = withoutRule(table, REMOVED);
  const brokenReport = check(broken);
  expect(brokenReport.gaps.count, 'the test needs a table with a gap').toBeGreaterThan(0);
  const { question, firstLabel } = firstQuestion(table);
  const gapExample = Object.entries(brokenReport.gaps.examples[0] ?? {})
    .map(([c, v]) => `${c}=${v}`)
    .join(', ');

  // The landing page links to the playground, after the app links.
  await page.goto('./');
  const link = page.getByRole('link', { name: landing.playground.title });
  await expect(link).toBeVisible();
  const lastApp = page.getByRole('region', { name: landing.appsHeading }).getByRole('link').last();
  const [linkBox, appBox] = [await link.boundingBox(), await lastApp.boundingBox()];
  expect(linkBox?.y ?? 0).toBeGreaterThan(appBox?.y ?? Infinity);
  await link.click();
  await expect(page).toHaveURL(/\/playground\/$/);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.title);
  await expect(textarea(page)).toHaveValue(formatTable(table));
  await expect(status(page)).toHaveText(passing);
  const preview = page.locator('.pg-preview');
  await expect(preview.getByRole('heading', { name: question })).toBeVisible();

  // The preview wears the app's own theme (set through the CSS object model, under the CSP).
  const themeBg = /--bg:\s*([^;]+);/.exec(readFileSync(path.join(root, 'apps/which-licence/theme.css'), 'utf8'))?.[1]?.trim();
  const previewBg = await preview.evaluate((node) => getComputedStyle(node).getPropertyValue('--bg').trim());
  const pageBg = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--bg').trim());
  expect(previewBg).toBe(themeBg);
  expect(previewBg).not.toBe(pageBg);

  // Remove a rule: the checker finds the hole and the app is replaced by the notice.
  const url = page.url();
  await page.getByRole('button', { name: fill(copy.rules.removeNamed, { id: REMOVED }) }).click();
  await expect(status(page)).toHaveText(
    fill(copy.results.fails, {
      reason: fill(copy.results.reasonCheck, {
        gaps: plural(copy.plural.gap, brokenReport.gaps.count),
        conflicts: plural(copy.plural.conflict, brokenReport.conflicts.length),
      }),
    }),
  );
  await expect(status(page)).toContainText(failsPrefix);
  await expect(page.getByText(gapExample, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: copy.app.noBuildHeading })).toBeVisible();
  await expect(page.getByRole('heading', { name: question })).toHaveCount(0);
  expect(await textarea(page).inputValue()).not.toContain(`"id": "${REMOVED}"`);

  // Reset brings the table, the passing line and the app back.
  await page.getByRole('button', { name: copy.editor.reset }).click();
  await expect(status(page)).toHaveText(passing);
  await expect(page.getByRole('heading', { name: copy.app.noBuildHeading })).toHaveCount(0);
  await expect(preview.getByRole('heading', { name: question })).toBeVisible();

  // Answering in the preview leaves the address alone, and the preview has no "Copy link" (it would point at this page).
  await preview.getByRole('button', { name: new RegExp(`^${firstLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click();
  await expect(preview.getByRole('heading', { name: question })).toHaveCount(0);
  await expect(preview.getByRole('button', { name: licence.copy.labels.startOver })).toBeVisible();
  await expect(preview.getByRole('button', { name: licence.copy.labels.copyLink })).toHaveCount(0);
  expect(page.url()).toBe(url);

  // One measurement for the report: the time from the click on the which-bin example to the new summary line,
  // which is JSON.parse + validate + check on that table in this browser.
  const bin = loadApp('which-bin');
  const binReport = check(bin.table);
  const elapsed = await page.evaluate(
    (title) =>
      new Promise<number>((resolve) => {
        const node = document.getElementById('pg-status');
        if (node === null) throw new Error('no summary line');
        const t0 = performance.now();
        new MutationObserver((_records, observer) => {
          observer.disconnect();
          resolve(performance.now() - t0);
        }).observe(node, { childList: true, characterData: true, subtree: true });
        const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === title);
        button?.click();
      }),
    bin.copy.title,
  );
  console.log(`playground: check on which-bin (${binReport.counts.combinations} combinations, ${binReport.counts.rules} rules), click to summary line: ${elapsed.toFixed(1)} ms`);
  await expect(status(page)).toHaveText(passingLine(binReport));
});

test('playground: Undo puts a removed rule back where it was', async ({ page }) => {
  const passing = passingLine(check(licence.table));
  await page.goto('playground/');
  await expect(status(page)).toHaveText(passing);
  const original = await textarea(page).inputValue();

  await page.getByRole('button', { name: fill(copy.rules.removeNamed, { id: REMOVED }) }).click();
  await expect(status(page)).toContainText(failsPrefix);
  await expect(page.getByText(fill(copy.rules.removed, { id: REMOVED }), { exact: true })).toBeVisible();

  await page.getByRole('button', { name: copy.rules.undo }).click();
  await expect(status(page)).toHaveText(passing);
  expect(await textarea(page).inputValue()).toBe(original);
  await expect(page.getByRole('button', { name: copy.rules.undo })).toHaveCount(0);
});

test('playground: markup in the table is shown as text; invalid JSON gets a position', async ({ page }) => {
  const markup = '</textarea><img src=x onerror=window.__pwned=1>';
  const doc = JSON.parse(formatTable(licence.table)) as { rules: { id: string }[] };
  const first = doc.rules[0];
  if (first === undefined) throw new Error('no rule');
  first.id = markup;

  await page.goto('playground/');
  await expect(status(page)).toHaveText(passingLine(check(licence.table)));
  await textarea(page).fill(JSON.stringify(doc, null, 2));
  await expect(status(page)).toContainText(failsPrefix);
  await expect(page.getByRole('listitem').filter({ hasText: `"${markup}" is not a lower-case kebab-case id.` })).toBeVisible();
  await expect(page.getByRole('region', { name: copy.rules.intro }).getByText(markup, { exact: true })).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, '__pwned'))).toBeUndefined();

  const broken = '{\n  "id": }\n}';
  const line = 2;
  const column = (broken.split('\n')[line - 1] ?? '').indexOf('}') + 1;
  await textarea(page).fill(broken);
  await expect(status(page)).toHaveText(
    fill(copy.results.fails, { reason: fill(copy.results.reasonSyntax, { line, column }) }),
  );
  await expect(
    page.getByText(
      fill(copy.results.syntaxDetail, { line, column, reason: fill(copy.results.jsonReasons.character, { character: '}' }) }),
      { exact: true },
    ),
  ).toBeVisible();
  await expect(textarea(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('heading', { name: copy.app.noBuildHeading })).toBeVisible();
  await expect(page.getByText(copy.rules.unavailable)).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`playground: axe and layout, ${scheme}`, async ({ page }) => {
    const passing = passingLine(check(licence.table));
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });

    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('about:blank');
      await page.goto('playground/');
      await expect(status(page)).toHaveText(passing);
      await expect(page.locator('.pg-preview').getByRole('heading', { name: firstQuestion(licence.table).question })).toBeVisible();
      expect(await scanAxe(page), `passing, ${width}px`).toEqual([]);
      if (width === 390) expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expectLayout(page, width);

      await page.getByRole('button', { name: fill(copy.rules.removeNamed, { id: REMOVED }) }).click();
      await expect(status(page)).toContainText(failsPrefix);
      await expect(page.getByRole('heading', { name: copy.app.noBuildHeading })).toBeVisible();
      expect(await scanAxe(page), `failing, ${width}px`).toEqual([]);
      if (width === 390) expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
}
