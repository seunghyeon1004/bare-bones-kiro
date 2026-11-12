import type { CheckReport, Combination, Problem } from './types.ts';

function pairs(combination: Combination): string {
  return Object.entries(combination)
    .map(([condition, value]) => `${condition}=${value}`)
    .join(', ');
}

/** Structural problems as `path: message` lines, then `failed`. */
export function formatProblems(problems: readonly Problem[]): string {
  return problems.map((p) => `${p.path}: ${p.message}\n`).join('') + 'failed\n';
}

/** The text for input that is not JSON at all. */
export function formatInvalidJson(message: string): string {
  return `$: invalid JSON: ${message}\nfailed\n`;
}

/** The text `bones check` prints for a structurally valid table. */
export function formatReport(report: CheckReport): string {
  const lines: string[] = [`gaps: ${report.gaps.count}`];
  for (const example of report.gaps.examples) lines.push(`  ${pairs(example)}`);
  if (report.gaps.count > report.gaps.examples.length) {
    lines.push(`  (first ${report.gaps.examples.length} shown)`);
  }
  for (const c of report.conflicts) {
    lines.push(`conflict: ${c.rules[0]} -> ${c.outcomes[0]} vs ${c.rules[1]} -> ${c.outcomes[1]}, e.g. ${pairs(c.example)}`);
  }
  for (const w of report.warnings) lines.push(`warning: ${w.path}: ${w.message}`);
  if (report.passed) {
    const { conditions, combinations, rules } = report.counts;
    lines.push(`ok: ${conditions} conditions, ${combinations} combinations, ${rules} rules`);
  } else {
    lines.push('failed');
  }
  return lines.join('\n') + '\n';
}
