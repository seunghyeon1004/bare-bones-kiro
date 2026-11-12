import type { Table } from '../engine/index.ts';
import type { PlaygroundCopy } from '../playground/types.ts';
import type { AppSummary, Copy, Landing } from '../shell/copy-type.ts';
import { parseTheme } from './theme-check.ts';

const PREVIEW_ANSWERS = 3;

/** What the landing page needs to draw an app's card: its words, its theme and the first question with up to three answers. */
export function summariseApp(id: string, table: Table, copy: Copy, themeCss: string): AppSummary {
  const first = table.conditions[0];
  return {
    id,
    title: copy.title,
    tagline: copy.tagline,
    answerStyle: copy.answerStyle,
    theme: parseTheme(themeCss),
    preview: {
      question: first?.question ?? '',
      answers: (first?.values ?? []).slice(0, PREVIEW_ANSWERS).map((v) => v.label),
    },
  };
}

const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** JSON text that is safe inside a `<script type="application/json">` element. */
export function escapeJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** The static block for an app page: shown without JavaScript, removed by the script at start. */
export function bootApp(copy: Copy): string {
  return (
    '<div id="boot" class="page">' +
    `<h1>${escapeHtml(copy.title)}</h1>` +
    `<p>${escapeHtml(copy.tagline)}</p>` +
    `<p>${escapeHtml(copy.intro)}</p>` +
    `<noscript><p>${escapeHtml(copy.labels.noscript)}</p></noscript>` +
    '</div>'
  );
}

/** The static block for the playground page: the title, the intro and the no-script notice. */
export function bootPlayground(copy: PlaygroundCopy): string {
  return (
    '<div id="boot" class="page">' +
    `<h1>${escapeHtml(copy.title)}</h1>` +
    `<p>${escapeHtml(copy.intro)}</p>` +
    `<noscript><p>${escapeHtml(copy.noscript)}</p></noscript>` +
    '</div>'
  );
}

/** The static block for the landing page: the title, the tagline and a link per app. */
export function bootLanding(landing: Landing, apps: readonly AppSummary[]): string {
  const items = apps
    .map((a) => `<li><a href="./${escapeHtml(a.id)}/">${escapeHtml(a.title)}</a><p>${escapeHtml(a.tagline)}</p></li>`)
    .join('');
  return (
    '<div id="boot" class="page">' +
    `<h1>${escapeHtml(landing.title)}</h1>` +
    `<p>${escapeHtml(landing.tagline)}</p>` +
    `<ul class="apps">${items}</ul>` +
    '</div>'
  );
}

/** Puts `boot`, one JSON data block per entry of `blocks` and the HTML-escaped `title` into the template. */
export function renderPage(template: string, blocks: Record<string, unknown>, boot: string, title: string): string {
  const data = Object.entries(blocks)
    .map(([key, value]) => {
      if (!KEY_PATTERN.test(key)) throw new Error(`bad data block key: ${key}`);
      return `<script type="application/json" id="data-${key}">${escapeJson(value)}</script>`;
    })
    .join('\n');
  return template
    .replace('<title></title>', () => `<title>${escapeHtml(title)}</title>`)
    .replace('<!--bones:boot-->', () => boot)
    .replace('<!--bones:data-->', () => data);
}
