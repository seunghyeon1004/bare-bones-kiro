import { fill } from '../shell/dom.ts';
import type { Analysis } from './analyse.ts';
import type { Plural, PlaygroundCopy } from './types.ts';

export interface Summary {
  passes: boolean;
  line: string;
  reason: string | undefined; // what follows "Fails: "; undefined when the table passes
  coverage: string | undefined; // only for a checked table
}

export function plural(forms: Plural, n: number): string {
  return fill(n === 1 ? forms.one : forms.other, { n });
}

/** A printable character as itself; a control or white-space character as U+XXXX. */
export function describeChar(c: string): string {
  const code = c.codePointAt(0) ?? 0;
  if (/[\p{Cc}\p{Cf}\p{Z}]/u.test(c) || code === 0xfeff) return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
  return c;
}

export function summarise(analysis: Analysis, copy: PlaygroundCopy): Summary {
  const r = copy.results;
  const p = copy.plural;
  const fails = (reason: string): Pick<Summary, 'passes' | 'line' | 'reason'> => ({
    passes: false,
    line: fill(r.fails, { reason }),
    reason,
  });

  if (analysis.kind === 'syntax') {
    return {
      ...fails(fill(r.reasonSyntax, { line: analysis.error.line, column: analysis.error.column })),
      coverage: undefined,
    };
  }
  if (analysis.kind === 'structure') {
    return { ...fails(fill(r.reasonStructure, { problems: plural(p.problem, analysis.problems.length) })), coverage: undefined };
  }
  const { report } = analysis;
  const coverage = fill(r.coverage, {
    covered: report.counts.combinations - report.gaps.count,
    total: report.counts.combinations,
  });
  if (report.passed) {
    return {
      passes: true,
      line: fill(r.passes, {
        rules: plural(p.rule, report.counts.rules),
        combinations: plural(p.combination, report.counts.combinations),
      }),
      reason: undefined,
      coverage,
    };
  }
  return {
    ...fails(
      fill(r.reasonCheck, {
        gaps: plural(p.gap, report.gaps.count),
        conflicts: plural(p.conflict, report.conflicts.length),
      }),
    ),
    coverage,
  };
}
