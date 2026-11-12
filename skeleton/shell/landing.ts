import type { AppSummary, AppTheme, Landing } from './copy-type.ts';
import { buildDiagram } from './diagram.ts';
import { el, readJson, renderFooter } from './dom.ts';

/** The three files that make an app (the build rejects any other file in an app folder). */
const APP_FILES = ['table.json', 'copy.json', 'theme.css'] as const;
/** At or below this width the hero picture stacks its parts in a column. */
const STACK_QUERY = '(max-width: 40rem)';

/** Sets the app's custom properties on the card through the CSS object model (a `style` attribute would break the CSP). */
function applyTheme(card: HTMLElement, theme: AppTheme, dark: boolean): void {
  for (const [name, value] of Object.entries(theme.light)) card.style.setProperty(name, value);
  if (dark) for (const [name, value] of Object.entries(theme.dark)) card.style.setProperty(name, value);
}

function appCard(app: AppSummary): HTMLElement {
  return el(
    'a',
    { href: `./${app.id}/`, class: `app-card ${app.answerStyle}-card` },
    el('h3', { class: 'card-title' }, app.title),
    el('p', { class: 'card-tagline' }, app.tagline),
    // A picture of the first screen; the link's name is the title and the tagline.
    el(
      'div',
      { class: 'card-preview', 'aria-hidden': 'true' },
      el('p', { class: 'preview-question' }, app.preview.question),
      el('div', { class: 'chips' }, ...app.preview.answers.map((answer) => el('span', { class: 'chip' }, answer))),
    ),
  );
}

function start(): void {
  const landing = readJson<Landing>('data-landing');
  const apps = readJson<AppSummary[]>('data-apps');
  document.getElementById('boot')?.remove();
  document.title = landing.title;

  const figure = el('figure', { class: 'hero-figure' });
  const stackQuery = window.matchMedia(STACK_QUERY);
  const drawDiagram = (): void => figure.replaceChildren(buildDiagram(landing.diagram, stackQuery.matches));
  stackQuery.addEventListener('change', drawDiagram);
  drawDiagram();

  const cards = apps.map((app) => ({ app, node: appCard(app) }));
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const dress = (): void => {
    for (const { app, node } of cards) applyTheme(node, app.theme, darkQuery.matches);
  };
  darkQuery.addEventListener('change', dress);
  dress();

  const fileUrl = (app: AppSummary, file: string): string => `${landing.repo}/blob/main/apps/${app.id}/${file}`;

  const page = el(
    'div',
    { class: 'page landing' },
    el('header', { class: 'hero' }, el('h1', {}, landing.title), el('p', { class: 'lede' }, landing.tagline), figure),
    el(
      'main',
      {},
      el(
        'section',
        { class: 'apps-section', 'aria-labelledby': 'apps-heading' },
        el('h2', { id: 'apps-heading', class: 'section-heading' }, landing.appsHeading),
        el('ul', { class: 'apps' }, ...cards.map(({ node }) => el('li', {}, node))),
      ),
      el(
        'a',
        { href: './playground/', class: 'playground-card' },
        el('h2', { class: 'card-title' }, landing.playground.title),
        el('p', {}, landing.playground.text),
      ),
      el(
        'section',
        { class: 'files-section', 'aria-labelledby': 'files-heading' },
        el('h2', { id: 'files-heading', class: 'section-heading' }, landing.noteTitle),
        el('p', { class: 'files-note' }, landing.note),
        el(
          'ul',
          { class: 'files' },
          ...apps.map((app) =>
            el(
              'li',
              { class: 'files-app' },
              el('span', { class: 'files-name' }, app.title),
              el(
                'ul',
                { class: 'file-links' },
                ...APP_FILES.map((file) =>
                  el(
                    'li',
                    {},
                    el('a', { href: fileUrl(app, file), rel: 'noopener noreferrer' }, file, el('span', { class: 'vh' }, ` (${app.title})`)),
                  ),
                ),
              ),
            ),
          ),
        ),
        el('p', { class: 'new-app' }, `${landing.newApp} `, el('code', {}, landing.newAppCommand)),
      ),
    ),
    renderFooter(landing.footer),
  );
  document.body.insertBefore(page, document.body.firstChild);
}

start();
