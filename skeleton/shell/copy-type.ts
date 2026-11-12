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

export interface Copy {
  title: string;
  tagline: string;
  intro: string;
  answerStyle: 'tiles' | 'list';
  labels: Labels;
  resultLead: string;
  footer: FooterEntry[];
}

export interface Landing {
  title: string;
  tagline: string;
  intro: string;
  styles: { tiles: string; list: string };
  noteTitle: string;
  note: string;
  playground: { title: string; text: string };
  footer: FooterEntry[];
}

export interface AppSummary { id: string; title: string; tagline: string; answerStyle: 'tiles' | 'list' }
