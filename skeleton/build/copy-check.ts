import type { Table } from '../engine/index.ts';
import type { Plural, PlaygroundCopy } from '../playground/types.ts';
import type { Copy, FilterCopy, FooterEntry, Labels, Landing } from '../shell/copy-type.ts';

// `satisfies` makes the compiler fail if this list and `Labels` ever differ.
const LABEL_KEYS = {
  startOver: true,
  change: true,
  why: true,
  rule: true,
  whatMattered: true,
  source: true,
  published: true,
  readOn: true,
  notAsked: true,
  copyLink: true,
  linkCopied: true,
  showTable: true,
  hideTable: true,
  any: true,
  outcome: true,
  yourAnswers: true,
  noscript: true,
  questionOf: true,
  badLink: true,
  allApps: true,
} satisfies Record<keyof Labels, true>;

const COPY_KEYS = ['title', 'tagline', 'intro', 'answerStyle', 'labels', 'resultLead', 'footer'] as const satisfies readonly (keyof Copy)[];
const OPTIONAL_COPY_KEYS = ['icons', 'filter'] as const satisfies readonly (keyof Copy)[];
const FILTER_KEYS = {
  condition: true,
  label: true,
  placeholder: true,
  noMatch: true,
  showAll: true,
  count: true,
  countOne: true,
  keywords: true,
} satisfies Record<keyof FilterCopy, true>;
/** Digits, path command letters, exponent, space, comma, dot, plus, minus. */
const PATH_CHARACTERS = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]+$/;
const LANDING_KEYS = ['title', 'tagline', 'intro', 'styles', 'noteTitle', 'note', 'playground', 'footer'] as const satisfies readonly (keyof Landing)[];
const PLACEHOLDERS: Partial<Record<keyof Labels, string[]>> = { questionOf: ['{n}', '{max}'], badLink: ['{count}'] };

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function nonEmptyString(value: unknown, path: string, problems: string[]): value is string {
  if (typeof value !== 'string') {
    problems.push(`${path}: must be a string`);
    return false;
  }
  if (value.trim() === '') {
    problems.push(`${path}: must not be empty`);
    return false;
  }
  return true;
}

function unknownKeys(o: Obj, known: readonly string[], prefix: string, problems: string[]): void {
  for (const key of Object.keys(o)) {
    if (!known.includes(key)) problems.push(`${prefix}${key}: unknown key`);
  }
}

function checkFooter(value: unknown, problems: string[]): void {
  if (!Array.isArray(value)) {
    problems.push('footer: must be an array');
    return;
  }
  value.forEach((entry: unknown, i) => {
    const path = `footer[${i}]`;
    if (!isObj(entry)) {
      problems.push(`${path}: must be an object`);
      return;
    }
    nonEmptyString(entry['text'], `${path}.text`, problems);
    if (Object.hasOwn(entry, 'href')) {
      const href = entry['href'];
      if (typeof href !== 'string') problems.push(`${path}.href: must be a string`);
      else if (!/^https?:\/\//.test(href)) problems.push(`${path}.href: must start with https:// or http://`);
    }
    unknownKeys(entry, ['text', 'href'] satisfies (keyof FooterEntry)[], `${path}.`, problems);
  });
}

/** Problems with a copy.json value as `<path>: <message>`; an empty list means valid. */
export function validateCopy(input: unknown): string[] {
  const problems: string[] = [];
  if (!isObj(input)) return ['$: must be an object'];

  for (const key of COPY_KEYS) {
    if (!Object.hasOwn(input, key)) {
      problems.push(`${key}: missing`);
      continue;
    }
    const value = input[key];
    if (key === 'answerStyle') {
      if (value !== 'tiles' && value !== 'list') problems.push('answerStyle: must be "tiles" or "list"');
    } else if (key === 'labels') {
      if (!isObj(value)) {
        problems.push('labels: must be an object');
        continue;
      }
      for (const name of Object.keys(LABEL_KEYS) as (keyof Labels)[]) {
        if (!Object.hasOwn(value, name)) {
          problems.push(`labels.${name}: missing`);
        } else if (nonEmptyString(value[name], `labels.${name}`, problems)) {
          for (const placeholder of PLACEHOLDERS[name] ?? []) {
            if (!(value[name] as string).includes(placeholder)) {
              problems.push(`labels.${name}: must contain ${placeholder}`);
            }
          }
        }
      }
      unknownKeys(value, Object.keys(LABEL_KEYS), 'labels.', problems);
    } else if (key === 'footer') {
      checkFooter(value, problems);
    } else {
      nonEmptyString(value, key, problems);
    }
  }
  if (Object.hasOwn(input, 'icons')) checkIcons(input['icons'], problems);
  if (Object.hasOwn(input, 'filter')) checkFilter(input['filter'], problems);
  unknownKeys(input, [...COPY_KEYS, ...OPTIONAL_COPY_KEYS], '', problems);
  return problems;
}

function checkIcons(value: unknown, problems: string[]): void {
  if (!isObj(value)) {
    problems.push('icons: must be an object');
    return;
  }
  for (const [id, paths] of Object.entries(value)) {
    const path = `icons.${id}`;
    if (!Array.isArray(paths) || paths.length === 0) {
      problems.push(`${path}: must be a non-empty array of path strings`);
      continue;
    }
    paths.forEach((d: unknown, i) => {
      if (typeof d !== 'string' || d.trim() === '') problems.push(`${path}[${i}]: must be a non-empty string`);
      else if (!PATH_CHARACTERS.test(d)) problems.push(`${path}[${i}]: contains characters that are not SVG path characters`);
    });
  }
}

function checkFilter(value: unknown, problems: string[]): void {
  if (!isObj(value)) {
    problems.push('filter: must be an object');
    return;
  }
  for (const key of Object.keys(FILTER_KEYS) as (keyof FilterCopy)[]) {
    const path = `filter.${key}`;
    if (!Object.hasOwn(value, key)) {
      problems.push(`${path}: missing`);
    } else if (key === 'keywords') {
      const keywords = value[key];
      if (!isObj(keywords)) problems.push(`${path}: must be an object`);
      else {
        for (const [id, words] of Object.entries(keywords)) {
          if (!Array.isArray(words) || words.some((w: unknown) => typeof w !== 'string' || w.trim() === '')) {
            problems.push(`${path}.${id}: must be an array of non-empty strings`);
          }
        }
      }
    } else if (nonEmptyString(value[key], path, problems) && key === 'count' && !(value[key] as string).includes('{n}')) {
      problems.push(`${path}: must contain {n}`);
    }
  }
  unknownKeys(value, Object.keys(FILTER_KEYS), 'filter.', problems);
}

/** Problems that need the app's table: icon keys and filter ids must exist in it. Run after `validateCopy` passes. */
export function validateCopyAgainstTable(copy: Copy, table: Table): string[] {
  const problems: string[] = [];
  const valueIds = new Set(table.conditions.flatMap((c) => c.values.map((v) => v.id)));
  for (const id of Object.keys(copy.icons ?? {})) {
    if (!valueIds.has(id)) problems.push(`icons.${id}: not a value id of the table`);
  }
  if (copy.filter !== undefined) {
    const condition = table.conditions.find((c) => c.id === copy.filter?.condition);
    if (condition === undefined) {
      problems.push(`filter.condition: "${copy.filter.condition}" is not a condition id of the table`);
    } else {
      for (const id of Object.keys(copy.filter.keywords)) {
        if (!condition.values.some((v) => v.id === id)) problems.push(`filter.keywords.${id}: not a value id of "${condition.id}"`);
      }
    }
  }
  return problems;
}

/** Problems with landing.json: `title`, `tagline`, `intro`, `styles`, `noteTitle`, `note`, `playground` and `footer`. */
export function validateLanding(input: unknown): string[] {
  const problems: string[] = [];
  if (!isObj(input)) return ['$: must be an object'];
  for (const key of LANDING_KEYS) {
    if (!Object.hasOwn(input, key)) problems.push(`${key}: missing`);
    else if (key === 'footer') checkFooter(input[key], problems);
    else if (key === 'playground') {
      const playground = input[key];
      if (!isObj(playground)) problems.push('playground: must be an object');
      else {
        for (const name of ['title', 'text']) {
          if (!Object.hasOwn(playground, name)) problems.push(`playground.${name}: missing`);
          else nonEmptyString(playground[name], `playground.${name}`, problems);
        }
        unknownKeys(playground, ['title', 'text'], 'playground.', problems);
      }
    } else if (key === 'styles') {
      const styles = input[key];
      if (!isObj(styles)) problems.push('styles: must be an object');
      else {
        for (const name of ['tiles', 'list']) {
          if (!Object.hasOwn(styles, name)) problems.push(`styles.${name}: missing`);
          else nonEmptyString(styles[name], `styles.${name}`, problems);
        }
        unknownKeys(styles, ['tiles', 'list'], 'styles.', problems);
      }
    } else nonEmptyString(input[key], key, problems);
  }
  unknownKeys(input, LANDING_KEYS, '', problems);
  return problems;
}


/** The expected shape of playground.json: a string leaf lists its required placeholders. */
type Shape = string[] | { [key: string]: Shape } | 'footer';

const PLURAL: Shape = { one: ['{n}'], other: ['{n}'] } satisfies Record<keyof Plural, string[]>;

const SHAPE: Shape = {
  title: [],
  tagline: [],
  intro: [],
  noscript: [],
  allApps: [],
  editor: {
    heading: [],
    startFrom: [],
    brokenExample: [],
    loaded: ['{name}'],
    textareaLabel: [],
    textareaHint: [],
    reset: [],
  },
  rules: {
    heading: [],
    intro: [],
    remove: [],
    removeNamed: ['{id}'],
    unnamed: ['{n}'],
    unavailable: [],
    empty: [],
  },
  results: {
    heading: [],
    passes: ['{rules}', '{combinations}'],
    fails: ['{reason}'],
    reasonCheck: ['{gaps}', '{conflicts}'],
    reasonStructure: ['{problems}'],
    reasonSyntax: ['{line}', '{column}'],
    coverage: ['{covered}', '{total}'],
    syntaxHeading: [],
    syntaxDetail: ['{line}', '{column}', '{reason}'],
    jsonReasons: { end: [], character: ['{character}'], string: [], trailing: [] },
    structureHeading: [],
    gapsHeading: [],
    gapsNone: [],
    conflictsHeading: [],
    conflictsNone: [],
    conflictLine: ['{a}', '{b}', '{outcomeA}', '{outcomeB}', '{example}'],
    more: ['{count}'],
    warningsHeading: [],
  },
  plural: { rule: PLURAL, combination: PLURAL, gap: PLURAL, conflict: PLURAL, problem: PLURAL },
  app: { heading: [], noBuildHeading: [], noBuildText: [], noBuildReason: ['{reason}'] },
  footer: 'footer',
} satisfies Record<keyof PlaygroundCopy, Shape>;

function walk(shape: Shape, value: unknown, path: string, problems: string[]): void {
  if (shape === 'footer') {
    checkFooter(value, problems);
  } else if (Array.isArray(shape)) {
    if (typeof value !== 'string') {
      problems.push(`${path}: must be a string`);
    } else if (value.trim() === '') {
      problems.push(`${path}: must not be empty`);
    } else {
      for (const placeholder of shape) if (!value.includes(placeholder)) problems.push(`${path}: must contain ${placeholder}`);
    }
  } else if (!isObj(value)) {
    problems.push(`${path}: must be an object`);
  } else {
    for (const [key, child] of Object.entries(shape)) {
      const childPath = path === '' ? key : `${path}.${key}`;
      if (!Object.hasOwn(value, key)) problems.push(`${childPath}: missing`);
      else walk(child, value[key], childPath, problems);
    }
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(shape, key)) problems.push(`${path === '' ? key : `${path}.${key}`}: unknown key`);
    }
  }
}

/** Problems with a playground.json value as `<path>: <message>`; an empty list means valid. */
export function validatePlayground(input: unknown): string[] {
  const problems: string[] = [];
  walk(SHAPE, input, '', problems);
  return problems.map((p) => (p.startsWith(': ') ? `$${p}` : p));
}
