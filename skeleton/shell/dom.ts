import type { FooterEntry } from './copy-type.ts';

export type Child = Node | string;

/** Creates an element. Text goes in as text nodes and attributes through setAttribute, never as markup. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A decorative outline pictogram: each string is one path `d` on a 24 by 24 grid. Built with createElementNS, never markup. */
export function svgIcon(paths: readonly string[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs: Record<string, string> = {
    class: 'icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };
  for (const [name, value] of Object.entries(attrs)) svg.setAttribute(name, value);
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

export function text(value: string): Text {
  return document.createTextNode(value);
}

/** Replaces each `{name}` that has a value. Unknown names are left as they are. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : whole,
  );
}

/** The URL if it is http(s), otherwise undefined. */
export function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

/** A link when the URL is safe, otherwise plain text. */
export function linkOrText(label: string, url: string): Node {
  const href = safeHref(url);
  return href === undefined ? text(label) : el('a', { href, rel: 'noopener noreferrer' }, label);
}

export function readJson<T>(id: string): T {
  const block = document.getElementById(id);
  return JSON.parse(block?.textContent ?? 'null') as T;
}

export function renderFooter(entries: readonly FooterEntry[]): HTMLElement {
  return el(
    'footer',
    { class: 'footer' },
    ...entries.map((entry) =>
      entry.href === undefined
        ? el('p', { class: 'footer-note' }, entry.text)
        : el('p', { class: 'footer-link' }, linkOrText(entry.text, entry.href)),
    ),
  );
}
