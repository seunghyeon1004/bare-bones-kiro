import { el, fill, readJson, renderFooter, svgIcon } from '../shell/dom.ts';
import type { Child } from '../shell/dom.ts';
import { mountApp } from '../shell/mount.ts';
import type { Mounted } from '../shell/mount.ts';
import { analyse, passes } from './analyse.ts';
import type { Analysis } from './analyse.ts';
import { formatTable, listRules, restoreRule, takeRule } from './rules.ts';
import { describeChar, plural, summarise } from './summary.ts';
import { applyTheme } from './theme.ts';
import type { PlaygroundCopy, PlaygroundData, PlaygroundExample } from './types.ts';

const DEBOUNCE_MS = 250;
const MAX_GAPS = 5;
const MAX_CONFLICTS = 5;
const MAX_PROBLEMS = 10;
/** Path data for the status mark, on the 24 by 24 grid of `svgIcon`. */
const CHECK_MARK = ['M5 12.5l4.5 4.5L19 7.5'];
const CROSS_MARK = ['M6 6l12 12', 'M18 6L6 18'];

/** The last rule taken out of the list, kept so Undo can put it back where it was. */
interface Removed { index: number; name: string; rule: unknown }

function start(): void {
  const copy = readJson<PlaygroundCopy>('data-playground');
  const data = readJson<PlaygroundData>('data-examples');
  const first = data.examples.find((e) => e.id === data.defaultExample) ?? data.examples[0];
  if (first === undefined) return;
  document.getElementById('boot')?.remove();

  let loaded: PlaygroundExample = first;
  let timer: number | undefined;
  let mounted: { key: string; handle: Mounted; preview: HTMLElement } | undefined;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // Fixed elements. The textarea is the source of truth; everything else is derived from its text.
  const textarea = el('textarea', {
    id: 'pg-text',
    class: 'pg-text',
    rows: '24',
    wrap: 'off',
    spellcheck: 'false',
    autocomplete: 'off',
    autocapitalize: 'off',
    'aria-describedby': 'pg-hint pg-syntax',
  });
  const loadedLine = el('p', { class: 'pg-loaded' });
  const ruleRegion = el('div', {
    class: 'pg-rule-list',
    role: 'region',
    tabindex: '0',
    'aria-labelledby': 'pg-rules-intro',
  });
  const statusMark = el('span', { class: 'pg-mark', 'aria-hidden': 'true' });
  const statusText = el('span', { class: 'pg-status-text' });
  const status = el(
    'p',
    { id: 'pg-status', class: 'pg-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
    statusMark,
    statusText,
  );
  const removedNotice = el('div', { class: 'pg-removed', role: 'status', 'aria-live': 'polite' });
  let removed: Removed | undefined;
  const coverage = el('p', { class: 'pg-coverage' });
  const details = el('div', { class: 'pg-details', role: 'region', tabindex: '0', 'aria-labelledby': 'pg-status' });
  const frame = el('div', { class: 'pg-frame' });

  function button(label: Child[], onClick: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
    const node = el('button', { type: 'button', ...attrs }, ...label);
    node.addEventListener('click', onClick);
    return node;
  }

  function load(example: PlaygroundExample): void {
    loaded = example;
    removed = undefined;
    renderRemoved();
    loadedLine.textContent = fill(copy.editor.loaded, { name: example.label });
    textarea.value = formatTable(example.table);
    analyseNow();
  }

  function analyseNow(): void {
    window.clearTimeout(timer);
    timer = undefined;
    const analysis = analyse(textarea.value);
    renderResults(analysis);
    renderRules();
    renderFrame(analysis);
  }

  function onInput(): void {
    if (removed !== undefined) {
      removed = undefined;
      renderRemoved();
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(analyseNow, DEBOUNCE_MS);
  }

  function more(count: number): HTMLElement {
    return el('p', { class: 'pg-more' }, fill(copy.results.more, { count }));
  }

  function list(lines: string[]): HTMLElement {
    return el('ul', { class: 'pg-lines' }, ...lines.map((line) => el('li', {}, line)));
  }

  function pairs(combination: Readonly<Record<string, string>>): string {
    return Object.entries(combination)
      .map(([condition, value]) => `${condition}=${value}`)
      .join(', ');
  }

  function renderResults(analysis: Analysis): void {
    const r = copy.results;
    const summary = summarise(analysis, copy);
    if (statusText.textContent !== summary.line) statusText.textContent = summary.line;
    const state = summary.passes ? 'pass' : 'fail';
    if (status.getAttribute('data-state') !== state) {
      status.setAttribute('data-state', state);
      statusMark.replaceChildren(svgIcon(summary.passes ? CHECK_MARK : CROSS_MARK));
    }
    coverage.textContent = summary.coverage ?? '';
    coverage.hidden = summary.coverage === undefined;
    if (analysis.kind === 'syntax') textarea.setAttribute('aria-invalid', 'true');
    else textarea.removeAttribute('aria-invalid');

    const syntax = el('p', { id: 'pg-syntax', class: 'pg-syntax' });
    syntax.hidden = analysis.kind !== 'syntax';
    const children: Node[] = [];

    if (analysis.kind === 'syntax') {
      const { error } = analysis;
      const reason = fill(r.jsonReasons[error.reason], { character: describeChar(error.character ?? '') });
      syntax.textContent = fill(r.syntaxDetail, { line: error.line, column: error.column, reason });
      children.push(el('h3', {}, r.syntaxHeading), syntax);
    } else if (analysis.kind === 'structure') {
      const shown = analysis.problems.slice(0, MAX_PROBLEMS);
      children.push(syntax, el('h3', {}, r.structureHeading), list(shown.map((p) => `${p.path}: ${p.message}`)));
      if (analysis.problems.length > shown.length) children.push(more(analysis.problems.length - shown.length));
    } else {
      const { report } = analysis;
      children.push(syntax, el('h3', {}, r.gapsHeading));
      if (report.gaps.count === 0) {
        children.push(el('p', {}, r.gapsNone));
      } else {
        const shown = report.gaps.examples.slice(0, MAX_GAPS);
        children.push(el('p', {}, plural(copy.plural.gap, report.gaps.count)), list(shown.map(pairs)));
        if (report.gaps.count > shown.length) children.push(more(report.gaps.count - shown.length));
      }
      children.push(el('h3', {}, r.conflictsHeading));
      if (report.conflicts.length === 0) {
        children.push(el('p', {}, r.conflictsNone));
      } else {
        const shown = report.conflicts.slice(0, MAX_CONFLICTS);
        children.push(
          list(
            shown.map((c) =>
              fill(r.conflictLine, {
                a: c.rules[0],
                b: c.rules[1],
                outcomeA: c.outcomes[0],
                outcomeB: c.outcomes[1],
                example: pairs(c.example),
              }),
            ),
          ),
        );
        if (report.conflicts.length > shown.length) children.push(more(report.conflicts.length - shown.length));
      }
      if (report.warnings.length > 0) {
        children.push(el('h3', {}, r.warningsHeading), list(report.warnings.map((w) => `${w.path}: ${w.message}`)));
      }
    }
    details.replaceChildren(...children);
  }

  function renderRules(): void {
    const rows = listRules(textarea.value);
    if (rows === undefined) {
      ruleRegion.replaceChildren(el('p', { class: 'pg-rules-note' }, copy.rules.unavailable));
      return;
    }
    if (rows.length === 0) {
      ruleRegion.replaceChildren(el('p', { class: 'pg-rules-note' }, copy.rules.empty));
      return;
    }
    const items = rows.map((row) => {
      const name = row.id ?? fill(copy.rules.unnamed, { n: row.index + 1 });
      const summary = fill(copy.rules.summary, { when: row.when ?? copy.rules.whenAny, outcome: row.outcome ?? copy.rules.noOutcome });
      return el(
        'li',
        { class: 'pg-rule' },
        el('span', { class: 'pg-rule-text' }, el('span', { class: 'pg-rule-id' }, name), el('span', { class: 'pg-rule-summary' }, summary)),
        button([copy.rules.remove], () => remove(row.index), { 'aria-label': fill(copy.rules.removeNamed, { id: name }) }),
      );
    });
    ruleRegion.replaceChildren(el('ul', { class: 'pg-rule-rows' }, ...items));
  }

  function renderRemoved(): void {
    removedNotice.hidden = removed === undefined;
    if (removed === undefined) {
      removedNotice.replaceChildren();
      return;
    }
    removedNotice.replaceChildren(
      el('span', { class: 'pg-removed-text' }, fill(copy.rules.removed, { id: removed.name })),
      button([copy.rules.undo], undo),
    );
  }

  function remove(index: number): void {
    const taken = takeRule(textarea.value, index);
    if (taken === undefined) return;
    const rule = taken.rule;
    const id = typeof rule === 'object' && rule !== null && !Array.isArray(rule) ? (rule as Record<string, unknown>)['id'] : undefined;
    removed = { index, name: typeof id === 'string' ? id : fill(copy.rules.unnamed, { n: index + 1 }), rule };
    const scrollTop = textarea.scrollTop;
    textarea.value = taken.text;
    textarea.scrollTop = scrollTop;
    analyseNow();
    renderRemoved();
    const buttons = ruleRegion.querySelectorAll('button');
    const target = buttons[Math.min(index, buttons.length - 1)];
    (target ?? textarea).focus();
  }

  function undo(): void {
    if (removed === undefined) return;
    const { index, rule } = removed;
    removed = undefined;
    const scrollTop = textarea.scrollTop;
    textarea.value = restoreRule(textarea.value, index, rule);
    textarea.scrollTop = scrollTop;
    analyseNow();
    renderRemoved();
    (ruleRegion.querySelectorAll('button')[index] ?? textarea).focus();
  }

  function renderFrame(analysis: Analysis): void {
    if (passes(analysis) && analysis.kind === 'checked') {
      const key = `${loaded.id}\n${JSON.stringify(analysis.table)}`;
      if (mounted?.key === key) return;
      mounted?.handle.unmount();
      const preview = el('div', { class: 'pg-preview' });
      applyTheme(preview, loaded.theme, darkQuery.matches);
      frame.replaceChildren(preview);
      const handle = mountApp(preview, analysis.table, loaded.copy, { hash: false, embedded: true, headingOffset: 2, copyLink: false });
      mounted = { key, handle, preview };
      return;
    }
    mounted?.handle.unmount();
    mounted = undefined;
    const reason = summarise(analysis, copy).reason ?? '';
    frame.replaceChildren(
      el(
        'div',
        { class: 'pg-notice', role: 'group', 'aria-labelledby': 'pg-notice-h' },
        el('h3', { id: 'pg-notice-h' }, copy.app.noBuildHeading),
        el('p', {}, copy.app.noBuildText),
        el('p', { class: 'pg-notice-reason' }, fill(copy.app.noBuildReason, { reason })),
      ),
    );
  }

  darkQuery.addEventListener('change', () => {
    if (mounted !== undefined) applyTheme(mounted.preview, loaded.theme, darkQuery.matches);
  });
  textarea.addEventListener('input', onInput);

  const exampleButtons = data.examples.map((example) => button([example.label], () => load(example)));
  const reset = button([copy.editor.reset], () => load(loaded), { class: 'pg-reset' });

  const page = el(
    'div',
    { class: 'pg-page' },
    el(
      'header',
      {},
      el('p', { class: 'back' }, el('a', { href: '../' }, copy.allApps)),
      el('h1', {}, copy.title),
      el('p', { class: 'tagline' }, copy.tagline),
      el('p', { class: 'pg-intro' }, copy.intro),
    ),
    el(
      'main',
      {},
      el(
        'div',
        { class: 'pg-grid' },
        el('section', { class: 'pg-status-block', 'aria-labelledby': 'pg-results-h' }, el('h2', { id: 'pg-results-h' }, copy.results.heading), status, coverage),
        el(
          'section',
          { class: 'pg-editor', 'aria-labelledby': 'pg-editor-h' },
          el('h2', { id: 'pg-editor-h' }, copy.editor.heading),
          el(
            'div',
            { class: 'pg-examples' },
            el('p', { id: 'pg-start', class: 'pg-start' }, copy.editor.startFrom),
            el('div', { class: 'pg-example-buttons', role: 'group', 'aria-labelledby': 'pg-start' }, ...exampleButtons),
          ),
          loadedLine,
          el('label', { for: 'pg-text' }, copy.editor.textareaLabel),
          el('p', { id: 'pg-hint', class: 'pg-hint' }, copy.editor.textareaHint),
          textarea,
          el('div', { class: 'pg-reset-row' }, reset),
          el(
            'section',
            { class: 'pg-rules', 'aria-labelledby': 'pg-rules-h' },
            el('h3', { id: 'pg-rules-h' }, copy.rules.heading),
            el('p', { id: 'pg-rules-intro' }, copy.rules.intro),
            removedNotice,
            ruleRegion,
          ),
        ),
        details,
        el('section', { class: 'pg-app', 'aria-labelledby': 'pg-app-h' }, el('h2', { id: 'pg-app-h' }, copy.app.heading), frame),
      ),
    ),
    renderFooter(copy.footer),
  );
  document.body.insertBefore(page, document.body.firstChild);

  load(first);
}

start();
