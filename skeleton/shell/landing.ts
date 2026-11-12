import type { AppSummary, Landing } from './copy-type.ts';
import { el, readJson, renderFooter } from './dom.ts';

function start(): void {
  const landing = readJson<Landing>('data-landing');
  const apps = readJson<AppSummary[]>('data-apps');
  document.getElementById('boot')?.remove();
  document.title = landing.title;

  const page = el(
    'div',
    { class: 'page' },
    el('header', {}, el('h1', {}, landing.title), el('p', { class: 'tagline' }, landing.tagline)),
    el(
      'main',
      {},
      el(
        'ul',
        { class: 'apps' },
        ...apps.map((app) =>
          el('li', {}, el('a', { href: `./${app.id}/` }, app.title), el('p', { class: 'tagline' }, app.tagline)),
        ),
      ),
    ),
    renderFooter(landing.footer),
  );
  document.body.insertBefore(page, document.body.firstChild);
}

start();
