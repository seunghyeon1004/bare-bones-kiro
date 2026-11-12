/** Types shared by the browser code and, as `import type` only, by the build. No values live here. */

export interface Labels {
  startOver: string;
  change: string;
  why: string;
  rule: string;
  whatMattered: string;
  source: string;
  published: string;
  readOn: string;
  notAsked: string;
  copyLink: string;
  linkCopied: string;
  showTable: string;
  hideTable: string;
  any: string;
  outcome: string;
  yourAnswers: string;
  noscript: string;
  questionOf: string; // must contain {n} and {max}
  badLink: string; // must contain {count}
  allApps: string; // link back to the landing page
}

export interface FooterEntry { text: string; href?: string }

/** A search box above the choices of one question. */
export interface FilterCopy {
  condition: string; // the condition whose choices are filtered
  label: string;
  placeholder: string;
  noMatch: string; // shown when nothing matches; should suggest what to try
  showAll: string; // button label that restores every choice
  count: string; // must contain {n}
  countOne: string; // used when exactly one choice matches
  keywords: Record<string, string[]>; // value id -> extra words to match
}

export interface Copy {
  title: string;
  tagline: string;
  intro: string;
  answerStyle: 'tiles' | 'list';
  labels: Labels;
  resultLead: string;
  footer: FooterEntry[];
  /** Value id -> SVG path `d` strings drawn on a 24 by 24 grid. */
  icons?: Record<string, string[]>;
  filter?: FilterCopy;
}

/** The words in the hero picture. Every string is drawn as SVG text. */
export interface DiagramCopy {
  title: string; // the SVG's <title> and accessible name
  description: string; // the SVG's <desc>
  tableLabel: string;
  checkerLabel: string;
  gaps: string;
  conflicts: string;
  appLabel: string;
  question: string; // the phone's question
  yes: string;
  no: string;
}

export interface Landing {
  title: string;
  tagline: string;
  diagram: DiagramCopy;
  appsHeading: string;
  playground: { title: string; text: string };
  noteTitle: string;
  note: string;
  newApp: string; // the line before the command
  newAppCommand: string;
  repo: string; // https URL of the repository, no trailing slash
  footer: FooterEntry[];
}

/** An app's custom properties from its theme.css: the light values, and the dark values that replace them. */
export interface AppTheme { light: Record<string, string>; dark: Record<string, string> }

/** The first question of an app's table with up to three answers, for the card on the landing page. */
export interface AppPreview { question: string; answers: string[] }

export interface AppSummary {
  id: string;
  title: string;
  tagline: string;
  answerStyle: 'tiles' | 'list';
  theme: AppTheme;
  preview: AppPreview;
}
