import { check, validate } from '../engine/index.ts';
import type { CheckReport, Problem, Table } from '../engine/index.ts';
import { locateJsonError } from './json-error.ts';
import type { JsonError } from './json-error.ts';

export type Analysis =
  | { kind: 'syntax'; error: JsonError }
  | { kind: 'structure'; problems: Problem[] }
  | { kind: 'checked'; table: Table; report: CheckReport };

/** Reads table text: not JSON, JSON with structural problems, or checked. The order `npm run build` uses for a table. */
export function analyse(text: string): Analysis {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // JSON.parse decides that the text is invalid; the scanner only places the error.
    // If the two ever disagree, still report an error rather than none.
    return { kind: 'syntax', error: locateJsonError(text) ?? { reason: 'character', offset: 0, line: 1, column: 1 } };
  }
  const result = validate(parsed);
  if (!result.ok) return { kind: 'structure', problems: result.problems };
  return { kind: 'checked', table: result.table, report: check(result.table) };
}

export function passes(analysis: Analysis): boolean {
  return analysis.kind === 'checked' && analysis.report.passed;
}
