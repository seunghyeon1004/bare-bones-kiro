import type { DiagramCopy } from './copy-type.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string)[]): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  for (const child of children) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}

const rect = (x: number, y: number, width: number, height: number, cls: string, rx = 0): SVGRectElement =>
  svg('rect', { x, y, width, height, rx, class: cls });

const label = (x: number, y: number, cls: string, words: string, anchor: 'start' | 'middle' = 'middle'): SVGTextElement =>
  svg('text', { x, y, class: cls, 'text-anchor': anchor }, words);

/** An arrow along one axis from (x1, y1) to (x2, y2): a line and a head. Decorative. */
function arrow(x1: number, y1: number, x2: number, y2: number): SVGGElement {
  const horizontal = y1 === y2;
  const direction = horizontal ? Math.sign(x2 - x1) : Math.sign(y2 - y1);
  const head = horizontal
    ? `M${x2 - 9 * direction} ${y2 - 7}L${x2} ${y2}L${x2 - 9 * direction} ${y2 + 7}`
    : `M${x2 - 7} ${y2 - 9 * direction}L${x2} ${y2}L${x2 + 7} ${y2 - 9 * direction}`;
  return svg('g', { class: 'dg-arrow' }, svg('path', { d: `M${x1} ${y1}L${x2} ${y2}` }), svg('path', { d: head }));
}

/** A small round mark with a tick, for "gaps: 0" and "conflicts: 0". */
function tick(cx: number, cy: number): SVGGElement {
  return svg(
    'g',
    { class: 'dg-tick' },
    svg('circle', { cx, cy, r: 9 }),
    svg('path', { d: `M${cx - 4} ${cy}L${cx - 1} ${cy + 3.5}L${cx + 5} ${cy - 3.5}` }),
  );
}

/** A table of 3 columns and 4 rows; the first row is the header. */
function tableDrawing(x: number, y: number, cell: { w: number; h: number }): SVGGElement {
  const group = svg('g', { class: 'dg-table' });
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      group.appendChild(rect(x + col * cell.w, y + row * cell.h, cell.w, cell.h, row === 0 ? 'dg-cell dg-head' : 'dg-cell'));
      if (row > 0) {
        // A short stroke in each body cell stands for text.
        const pad = 8;
        group.appendChild(svg('path', { d: `M${x + col * cell.w + pad} ${y + row * cell.h + cell.h / 2}h${cell.w - pad * 2 - (col + row) % 2 * 8}`, class: 'dg-line' }));
      }
    }
  }
  return group;
}

function checkerDrawing(copy: DiagramCopy, x: number, y: number, w: number, h: number): SVGGElement {
  const centre = x + w / 2;
  const left = x + 24;
  const rowY = (n: number): number => y + 62 + n * 36;
  return svg(
    'g',
    {},
    rect(x, y, w, h, 'dg-box', 14),
    label(centre, y + 30, 'dg-title', copy.checkerLabel),
    tick(left, rowY(0) - 5),
    label(left + 18, rowY(0), 'dg-text', copy.gaps, 'start'),
    tick(left, rowY(1) - 5),
    label(left + 18, rowY(1), 'dg-text', copy.conflicts, 'start'),
  );
}

function phoneDrawing(copy: DiagramCopy, x: number, y: number, w: number, h: number): SVGGElement {
  const centre = x + w / 2;
  const button = (n: number, words: string): SVGGElement => {
    const by = y + 92 + n * 44;
    return svg('g', {}, rect(x + 16, by, w - 32, 34, n === 0 ? 'dg-button dg-primary' : 'dg-button', 8), label(centre, by + 22, n === 0 ? 'dg-button-text dg-primary-text' : 'dg-button-text', words));
  };
  return svg(
    'g',
    {},
    rect(x, y, w, h, 'dg-phone', 22),
    rect(centre - 16, y + 10, 32, 5, 'dg-speaker', 2.5),
    label(centre, y + 62, 'dg-question', copy.question),
    button(0, copy.yes),
    button(1, copy.no),
  );
}

/**
 * The hero picture: table, arrow, checker, arrow, phone. `stacked` puts the parts in a column for narrow screens.
 * Built with createElementNS; colours come from classes in shell.css, which use the theme's custom properties.
 */
export function buildDiagram(copy: DiagramCopy, stacked: boolean): SVGSVGElement {
  const wide = !stacked;
  const width = wide ? 760 : 300;
  const height = wide ? 300 : 724;
  const root = svg('svg', {
    class: wide ? 'diagram' : 'diagram stacked',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-labelledby': 'diagram-title diagram-desc',
    focusable: 'false',
  });
  root.append(svg('title', { id: 'diagram-title' }, copy.title), svg('desc', { id: 'diagram-desc' }, copy.description));

  if (wide) {
    root.append(
      tableDrawing(16, 56, { w: 58, h: 38 }),
      label(103, 284, 'dg-caption', copy.tableLabel),
      arrow(200, 132, 268, 132),
      checkerDrawing(copy, 276, 56, 200, 152),
      arrow(484, 132, 552, 132),
      phoneDrawing(copy, 560, 24, 184, 232),
      label(652, 284, 'dg-caption', copy.appLabel),
    );
  } else {
    root.append(
      tableDrawing(60, 12, { w: 60, h: 34 }),
      label(150, 172, 'dg-caption', copy.tableLabel),
      arrow(150, 184, 150, 230),
      checkerDrawing(copy, 50, 238, 200, 152),
      arrow(150, 398, 150, 444),
      phoneDrawing(copy, 58, 452, 184, 232),
      label(150, 710, 'dg-caption', copy.appLabel),
    );
  }
  return root;
}
