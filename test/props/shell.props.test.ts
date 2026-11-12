import { readFileSync } from 'node:fs';
import path from 'node:path';
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { bootApp, renderPage } from '../../skeleton/build/page.ts';
import type { Copy } from '../../skeleton/shell/copy-type.ts';
import { readHash, writeHash } from '../../skeleton/shell/hash.ts';
import { arbTable } from './generators.ts';
import { arbHostileCopy, arbHostileTable, arbSteps, LABEL_KEYS } from './shell-generators.ts';

const template = readFileSync(path.resolve(import.meta.dirname, '../../skeleton/shell/page.html'), 'utf8');
const runs = { numRuns: 200 };

describe('shell properties', () => {
  it('Property 11 hash round trip', () => {
    fc.assert(
      fc.property(
        arbTable.chain((table) => arbSteps(table).map((steps) => ({ table, steps }))),
        ({ table, steps }) => {
          const hash = writeHash(steps);
          expect(hash).toMatch(/^(#[a-z0-9-]+=[a-z0-9-]+(&[a-z0-9-]+=[a-z0-9-]+)*)?$/);
          expect(readHash(table, hash)).toEqual({ steps, ignored: 0 });
        },
      ),
      runs,
    );
  });

  it('Property 12 page holds table text only as escaped JSON', () => {
    const emptyCopy: Copy = {
      title: '',
      tagline: '',
      intro: '',
      answerStyle: 'tiles',
      labels: Object.fromEntries(LABEL_KEYS.map((key) => [key, ''])) as unknown as Copy['labels'],
      resultLead: '',
      footer: [],
    };
    const blockPattern = /<script type="application\/json" id="data-([a-z]+)">([^]*?)<\/script>/g;
    const bootPattern = /<div id="boot" class="page">[^]*?<\/div>/;
    const titlePattern = /<title>([^]*?)<\/title>/g;
    const strip = (html: string): string =>
      html.replace(blockPattern, '<script data>').replace(bootPattern, '<boot>').replace(titlePattern, '<title></title>');
    const baseline = strip(renderPage(template, { table: null, copy: null }, bootApp(emptyCopy), ''));
    const unescape = (s: string): string =>
      s.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');

    fc.assert(
      fc.property(arbHostileTable, arbHostileCopy, (table, copy) => {
        const html = renderPage(template, { table, copy }, bootApp(copy), copy.title);

        // (a) three script elements: two data blocks and the app script
        expect(html.split('<script').length - 1).toBe(3);
        expect(html.split('</script>').length - 1).toBe(3);

        // (b) and (c) the data blocks hold no markup characters and parse back to the input
        const blocks = [...html.matchAll(blockPattern)];
        expect(blocks.map((b) => b[1])).toEqual(['table', 'copy']);
        for (const block of blocks) expect(block[2]).not.toMatch(/[<>&\u2028\u2029]/);
        expect(JSON.parse(blocks[0]?.[2] ?? '')).toEqual(table);
        expect(JSON.parse(blocks[1]?.[2] ?? '')).toEqual(copy);

        // (d) the rest of the page does not depend on the input
        expect(strip(html)).toBe(baseline);

        // (e) the static block has a fixed shape and holds the four texts, escaped
        const boot = html.match(bootPattern)?.[0] ?? '';
        const parts = boot.match(
          /^<div id="boot" class="page"><h1>([^<]*)<\/h1><p>([^<]*)<\/p><p>([^<]*)<\/p><noscript><p>([^<]*)<\/p><\/noscript><\/div>$/,
        );
        expect(parts).not.toBeNull();
        expect((parts ?? []).slice(1).map(unescape)).toEqual([
          copy.title,
          copy.tagline,
          copy.intro,
          copy.labels.noscript,
        ]);

        // (f) the <title> holds copy.title, escaped
        const titles = [...html.matchAll(titlePattern)];
        expect(titles).toHaveLength(1);
        const titleText = titles[0]?.[1] ?? '';
        expect(titleText).not.toMatch(/[<>]/);
        expect(unescape(titleText)).toBe(copy.title);
      }),
      runs,
    );
  });
});
