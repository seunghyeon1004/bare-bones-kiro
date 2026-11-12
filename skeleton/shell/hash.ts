import type { Table } from '../engine/index.ts';

export interface Step { condition: string; value: string }

/** `#condition=value&…` in step order; empty for no steps. Ids are kebab-case, so nothing is encoded. */
export function writeHash(steps: readonly Step[]): string {
  if (steps.length === 0) return '';
  return '#' + steps.map((s) => `${s.condition}=${s.value}`).join('&');
}

/** Keeps the entries that name a known condition and one of its values, once each. Never throws. */
export function readHash(table: Table, hash: string): { steps: Step[]; ignored: number } {
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (body === '') return { steps: [], ignored: 0 };

  const values = new Map<string, Set<string>>();
  for (const condition of table.conditions) values.set(condition.id, new Set(condition.values.map((v) => v.id)));

  const steps: Step[] = [];
  const taken = new Set<string>();
  let ignored = 0;
  for (const part of body.split('&')) {
    const pieces = part.split('=');
    const [condition, value] = pieces;
    const allowed = condition === undefined ? undefined : values.get(condition);
    if (
      pieces.length !== 2 ||
      condition === undefined ||
      value === undefined ||
      condition === '' ||
      value === '' ||
      allowed === undefined ||
      !allowed.has(value) ||
      taken.has(condition)
    ) {
      ignored += 1;
      continue;
    }
    taken.add(condition);
    steps.push({ condition, value });
  }
  return { steps, ignored };
}
