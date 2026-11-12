export const MAX_COMBINATIONS = 100000;
export const MAX_GAP_EXAMPLES = 20;

export interface Value { id: string; label: string; hint?: string }
export interface Condition { id: string; question: string; help?: string; values: Value[] }
export interface Outcome { id: string; label: string; detail: string }
export interface Rule {
  id: string;
  when: Record<string, string | string[]>;
  then: string;
  note?: string;
  source: { ref: string; at: string };
}
export interface Source { id: string; title: string; url: string; published: string; read: string }
export interface Table {
  id: string;
  title: string;
  conditions: Condition[];
  outcomes: Outcome[];
  rules: Rule[];
  sources: Source[];
}

export type Combination = Readonly<Record<string, string>>; // one entry per condition, table order
export type Answers = Readonly<Record<string, string>>; // any subset of the conditions

export type ProblemKind =
  | 'bad-shape'
  | 'bad-id'
  | 'duplicate-id'
  | 'too-few-values'
  | 'empty-when-list'
  | 'unknown-condition'
  | 'unknown-value'
  | 'unknown-outcome'
  | 'unknown-source'
  | 'too-many-combinations';
export interface Problem { kind: ProblemKind; path: string; message: string }
export type ValidationResult = { ok: true; table: Table } | { ok: false; problems: Problem[] };

export interface Warning { kind: 'unused-outcome'; path: string; message: string }
export interface Conflict {
  rules: [string, string]; // rule ids, earlier rule first
  outcomes: [string, string]; // outcome ids, same order
  example: Combination;
}
export interface CheckReport {
  passed: boolean;
  counts: { conditions: number; combinations: number; rules: number };
  gaps: { count: number; examples: Combination[] };
  conflicts: Conflict[];
  warnings: Warning[];
}

export interface Question {
  condition: string;
  question: string;
  help?: string;
  values: { id: string; label: string; hint?: string }[];
}
export interface DecidedResult {
  status: 'decided';
  outcome: Outcome;
  rules: { id: string; note?: string; source: { ref: string; at: string } }[];
  mattered: { condition: string; question: string; value: string; label: string }[];
  sources: Source[];
  skipped: { condition: string; question: string }[];
}
export interface OpenResult {
  status: 'open';
  next: Question;
  relevant: { condition: string; worstCase: number }[];
}
export interface ErrorResult { status: 'error'; errors: Problem[] }
export type DecideResult = DecidedResult | OpenResult | ErrorResult;
