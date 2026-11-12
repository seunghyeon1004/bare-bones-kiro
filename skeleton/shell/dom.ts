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
    ...entries.map((entry) => el('p', {}, entry.href === undefined ? entry.text : linkOrText(entry.text, entry.href))),
  );
}
