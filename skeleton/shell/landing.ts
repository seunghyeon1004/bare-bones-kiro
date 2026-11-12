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
    el(
      'header',
      {},
      el('h1', {}, landing.title),
      el('p', { class: 'tagline' }, landing.tagline),
      el('p', { class: 'lede' }, landing.intro),
    ),
    el(
      'main',
      {},
      el(
        'ul',
        { class: 'apps' },
        ...apps.map((app) =>
          el(
            'li',
            { class: 'app-card' },
            el('a', { href: `./${app.id}/`, class: 'app-link' }, app.title),
            el('p', { class: 'app-tagline' }, app.tagline),
            el('p', { class: 'app-style' }, landing.styles[app.answerStyle]),
          ),
        ),
      ),
      el(
        'div',
        { class: 'playground-card' },
        el('a', { href: './playground/', class: 'app-link' }, landing.playground.title),
        el('p', {}, landing.playground.text),
      ),
      el('section', { class: 'note-block' }, el('h2', { class: 'plain' }, landing.noteTitle), el('p', {}, landing.note)),
    ),
    renderFooter(landing.footer),
  );
  document.body.insertBefore(page, document.body.firstChild);
}

start();
