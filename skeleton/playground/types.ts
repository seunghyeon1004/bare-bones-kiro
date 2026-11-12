/** Types shared by the playground page and, as `import type` only, by the build. No values live here. */
import type { Copy, FooterEntry } from '../shell/copy-type.ts';

export interface Plural { one: string; other: string } // both contain {n}

export interface ThemeVars { light: Record<string, string>; dark: Record<string, string> }

export interface PlaygroundExample {
  id: string;
  label: string;
  table: unknown;
  copy: Copy;
  theme: ThemeVars;
}

export interface PlaygroundData { defaultExample: string; examples: PlaygroundExample[] }

export interface PlaygroundCopy {
  title: string;
  tagline: string;
  intro: string;
  noscript: string;
  allApps: string;
  editor: {
    heading: string;
    startFrom: string;
    brokenExample: string;
    loaded: string; // {name}
    textareaLabel: string;
    textareaHint: string;
    reset: string;
  };
  rules: {
    heading: string;
    intro: string;
    remove: string;
    removeNamed: string; // {id}
    unnamed: string; // {n}
    unavailable: string;
    empty: string;
  };
  results: {
    heading: string;
    passes: string; // {rules} {combinations}
    fails: string; // {reason}
    reasonCheck: string; // {gaps} {conflicts}
    reasonStructure: string; // {problems}
    reasonSyntax: string; // {line} {column}
    coverage: string; // {covered} {total}
    syntaxHeading: string;
    syntaxDetail: string; // {line} {column} {reason}
    jsonReasons: { end: string; character: string; string: string; trailing: string }; // character: {character}
    structureHeading: string;
    gapsHeading: string;
    gapsNone: string;
    conflictsHeading: string;
    conflictsNone: string;
    conflictLine: string; // {a} {b} {outcomeA} {outcomeB} {example}
    more: string; // {count}
    warningsHeading: string;
  };
  plural: { rule: Plural; combination: Plural; gap: Plural; conflict: Plural; problem: Plural };
  app: {
    heading: string;
    noBuildHeading: string;
    noBuildText: string;
    noBuildReason: string; // {reason}
  };
  footer: FooterEntry[];
}
