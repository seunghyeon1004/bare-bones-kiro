import type { Copy, FooterEntry, Labels, Landing } from '../shell/copy-type.ts';

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
const LANDING_KEYS = ['title', 'tagline', 'intro', 'styles', 'noteTitle', 'note', 'footer'] as const satisfies readonly (keyof Landing)[];
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
  unknownKeys(input, COPY_KEYS, '', problems);
  return problems;
}

/** Problems with landing.json: `title`, `tagline`, `intro`, `styles`, `noteTitle`, `note` and `footer`. */
export function validateLanding(input: unknown): string[] {
  const problems: string[] = [];
  if (!isObj(input)) return ['$: must be an object'];
  for (const key of LANDING_KEYS) {
    if (!Object.hasOwn(input, key)) problems.push(`${key}: missing`);
    else if (key === 'footer') checkFooter(input[key], problems);
    else if (key === 'styles') {
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
