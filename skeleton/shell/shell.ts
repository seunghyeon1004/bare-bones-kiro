import { decide } from '../engine/index.ts';
import type { DecidedResult, OpenResult, Table } from '../engine/index.ts';
import type { Copy } from './copy-type.ts';
import { el, fill, linkOrText, readJson, renderFooter, text } from './dom.ts';
import type { Child } from './dom.ts';
import { readHash, writeHash } from './hash.ts';
import type { Step } from './hash.ts';

interface Stage { node: HTMLElement; heading: HTMLElement; announce: string }

function start(): void {
  const table = readJson<Table>('data-table');
  const copy = readJson<Copy>('data-copy');
  const labels = copy.labels;

  document.getElementById('boot')?.remove();
  document.title = copy.title;

  const conditionById = new Map(table.conditions.map((c) => [c.id, c]));
  const outcomeById = new Map(table.outcomes.map((o) => [o.id, o]));
  const sourceById = new Map(table.sources.map((s) => [s.id, s]));

  const valueLabel = (conditionId: string, valueId: string): string =>
    conditionById.get(conditionId)?.values.find((v) => v.id === valueId)?.label ?? valueId;

  let steps: Step[] = [];
  let ignored = 0;

  // The fixed frame. Only `main` is rebuilt on each render.
  const main = el('main', { class: 'main' });
  const live = el('div', { class: 'vh', role: 'status', 'aria-live': 'polite' });
  const tableSection = buildTableSection();
  const page = el(
    'div',
    { class: 'page' },
    el(
      'header',
      {},
      el('p', { class: 'back' }, el('a', { href: '../' }, labels.allApps)),
      el('h1', {}, copy.title),
      el('p', { class: 'tagline' }, copy.tagline),
    ),
    main,
    tableSection,
    renderFooter(copy.footer),
    live,
  );
  document.body.insertBefore(page, document.body.firstChild);

  function button(label: Child[], onClick: () => void, className = ''): HTMLButtonElement {
    const node = el('button', className === '' ? { type: 'button' } : { type: 'button', class: className }, ...label);
    node.addEventListener('click', onClick);
    return node;
  }

  function writeAddress(): void {
    history.replaceState(null, '', location.pathname + location.search + writeHash(steps));
  }

  function stepsSection(): HTMLElement {
    const items = steps.map((step, i) => {
      const question = conditionById.get(step.condition)?.question ?? step.condition;
      return el(
        'li',
        { class: 'step' },
        el(
          'span',
          { class: 'step-text' },
          el('span', { class: 'step-question' }, question),
          text(' '),
          el('span', { class: 'step-answer' }, valueLabel(step.condition, step.value)),
        ),
        button(
          [labels.change, text(' '), el('span', { class: 'vh' }, question)],
          () => {
            steps = steps.slice(0, i);
            ignored = 0;
            update(true);
          },
          'quiet',
        ),
      );
    });
    return el(
      'section',
      { class: 'steps', 'aria-labelledby': 'steps-heading' },
      el('h2', { id: 'steps-heading', class: 'plain' }, labels.yourAnswers),
      el('ol', { class: 'step-list' }, ...items),
    );
  }

  function questionStage(result: OpenResult): Stage {
    const next = result.next;
    const progress = fill(labels.questionOf, { n: steps.length + 1, max: steps.length + result.relevant.length });
    const heading = el('h2', { tabindex: '-1' }, next.question);
    const choices = next.values.map((value) => {
      const content: Child[] = [el('span', { class: 'label' }, value.label)];
      if (value.hint !== undefined) content.push(el('span', { class: 'hint' }, value.hint));
      return el(
        'li',
        {},
        button(
          content,
          () => {
            steps.push({ condition: next.condition, value: value.id });
            ignored = 0;
            update(true);
          },
          'choice',
        ),
      );
    });
    const node = el(
      'section',
      { class: 'stage' },
      el('p', { class: 'progress' }, progress),
      el('progress', { class: 'bar', max: String(steps.length + result.relevant.length), value: String(steps.length + 1), 'aria-hidden': 'true' }),
      heading,
      ...(next.help === undefined ? [] : [el('p', { class: 'help' }, next.help)]),
      el('ul', { class: `choices ${copy.answerStyle}` }, ...choices),
    );
    return { node, heading, announce: `${progress} ${next.question}` };
  }

  function resultStage(result: DecidedResult): Stage {
    const headingText = `${copy.resultLead} ${result.outcome.label}`;
    const heading = el(
      'h2',
      { tabindex: '-1', class: 'result-heading' },
      el('span', { class: 'lead' }, copy.resultLead),
      text(' '),
      el('span', { class: 'outcome' }, result.outcome.label),
    );

    const notes: string[] = [];
    for (const rule of result.rules) {
      if (rule.note !== undefined && !notes.includes(rule.note)) notes.push(rule.note);
    }

    const card = el(
      'div',
      { class: 'card' },
      heading,
      el('p', { class: 'detail' }, result.outcome.detail),
      ...notes.map((note) => el('p', { class: 'note' }, note)),
    );

    const row = (term: string, ...details: Node[]): HTMLElement =>
      el('div', { class: 'row' }, el('dt', {}, term), ...details);

    const rows: HTMLElement[] = [row(labels.rule, el('dd', {}, result.rules.map((r) => r.id).join(', ')))];
    if (result.mattered.length > 0) {
      rows.push(
        row(
          labels.whatMattered,
          el(
            'dd',
            {},
            el(
              'ul',
              { class: 'matters' },
              ...result.mattered.map((m) =>
                el(
                  'li',
                  {},
                  el('span', { class: 'matter-question' }, m.question),
                  text(' '),
                  el('span', { class: 'matter-answer' }, m.label),
                ),
              ),
            ),
          ),
        ),
      );
    }
    rows.push(
      row(
        labels.source,
        ...result.sources.map((source) => {
          const places = result.rules.filter((r) => r.source.ref === source.id).map((r) => r.source.at);
          return el(
            'dd',
            { class: 'source' },
            el('p', { class: 'source-title' }, linkOrText(source.title, source.url)),
            ...places.map((at) => el('p', { class: 'source-at' }, at)),
            el('p', { class: 'meta' }, `${labels.published}: ${source.published} \u00b7 ${labels.readOn}: ${source.read}`),
          );
        }),
      ),
    );

    const children: Node[] = [card, el('section', { class: 'why' }, el('h3', {}, labels.why), el('dl', { class: 'why-list' }, ...rows))];
    if (result.skipped.length > 0) {
      children.push(
        el(
          'section',
          { class: 'skipped' },
          el('h3', {}, labels.notAsked),
          el('ul', {}, ...result.skipped.map((s) => el('li', {}, s.question))),
        ),
      );
    }
    return { node: el('section', { class: 'stage' }, ...children), heading, announce: headingText };
  }

  async function copyLink(copyButton: HTMLButtonElement): Promise<void> {
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('no clipboard');
      await navigator.clipboard.writeText(location.href);
      live.textContent = labels.linkCopied;
    } catch {
      let input = copyButton.parentElement?.querySelector('input');
      if (input === null || input === undefined) {
        input = el('input', { type: 'text', readonly: '', 'aria-label': labels.copyLink, class: 'link-input' });
        copyButton.insertAdjacentElement('afterend', input);
      }
      input.value = location.href;
      input.focus();
      input.select();
    }
  }

  function actions(): HTMLElement {
    const copyButton = button([labels.copyLink], () => void copyLink(copyButton), 'primary');
    return el(
      'div',
      { class: 'actions' },
      copyButton,
      button([labels.startOver], () => {
        steps = [];
        ignored = 0;
        update(true);
      }),
    );
  }

  function render(moveFocus: boolean): void {
    const answers = Object.fromEntries(steps.map((s) => [s.condition, s.value]));
    const result = decide(table, answers);
    const children: Node[] = [];
    const announce: string[] = [];

    if (steps.length === 0) children.push(el('p', { class: 'intro' }, copy.intro));
    if (ignored > 0) {
      const notice = fill(labels.badLink, { count: ignored });
      children.push(el('p', { class: 'notice' }, notice));
      announce.push(notice);
    }
    if (steps.length > 0) children.push(stepsSection());

    let heading: HTMLElement | undefined;
    if (result.status === 'open') {
      const stage = questionStage(result);
      children.push(stage.node);
      heading = stage.heading;
      announce.push(stage.announce);
    } else if (result.status === 'decided') {
      const stage = resultStage(result);
      children.push(stage.node);
      heading = stage.heading;
      announce.push(stage.announce);
    }
    if (steps.length > 0) children.push(actions());

    main.replaceChildren(...children);
    live.textContent = announce.join(' ');
    if (moveFocus) heading?.focus();
  }

  function update(moveFocus: boolean): void {
    render(moveFocus);
    writeAddress();
  }

  function buildTableSection(): HTMLElement {
    const region = el('div', { id: 'table-region', class: 'table-region', role: 'region', tabindex: '0', 'aria-label': table.title });
    region.hidden = true;
    const toggle = el('button', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'table-region' }, labels.showTable);
    let built = false;
    toggle.addEventListener('click', () => {
      const open = region.hidden;
      if (open && !built) {
        region.appendChild(buildTable());
        built = true;
      }
      region.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? labels.hideTable : labels.showTable;
    });
    return el('section', { class: 'table-section' }, toggle, region);
  }

  function buildTable(): HTMLTableElement {
    const head = el(
      'tr',
      {},
      ...[labels.rule, ...table.conditions.map((c) => c.question), labels.outcome, labels.source].map((label) =>
        el('th', { scope: 'col' }, label),
      ),
    );
    const rows = table.rules.map((rule) => {
      const cells = table.conditions.map((c) => {
        if (!Object.hasOwn(rule.when, c.id)) return el('td', {}, labels.any);
        const entry = rule.when[c.id];
        const ids = Array.isArray(entry) ? entry : entry === undefined ? [] : [entry];
        return el('td', {}, ids.map((id) => valueLabel(c.id, id)).join(', '));
      });
      const source = sourceById.get(rule.source.ref);
      return el(
        'tr',
        {},
        el('th', { scope: 'row' }, rule.id),
        ...cells,
        el('td', {}, outcomeById.get(rule.then)?.label ?? rule.then),
        el('td', {}, `${source?.title ?? rule.source.ref}, ${rule.source.at}`),
      );
    });
    return el('table', {}, el('caption', {}, table.title), el('thead', {}, head), el('tbody', {}, ...rows));
  }

  function readAddress(): void {
    const read = readHash(table, location.hash);
    steps = read.steps;
    ignored = read.ignored;
  }

  window.addEventListener('hashchange', () => {
    readAddress();
    update(true);
  });

  readAddress();
  update(steps.length > 0);
}

start();
