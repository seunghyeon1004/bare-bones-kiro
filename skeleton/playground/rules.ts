export interface RuleRow { index: number; id: string | undefined }

export function formatTable(table: unknown): string {
  return JSON.stringify(table, null, 2);
}

function parseRules(text: string): { parsed: Record<string, unknown>; rules: unknown[] } | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  const object = parsed as Record<string, unknown>;
  const rules = object['rules'];
  return Array.isArray(rules) ? { parsed: object, rules } : undefined;
}

/** One row per element of `rules`; undefined unless the text is a JSON object with a `rules` array. */
export function listRules(text: string): RuleRow[] | undefined {
  const found = parseRules(text);
  if (found === undefined) return undefined;
  return found.rules.map((rule, index) => {
    const id = typeof rule === 'object' && rule !== null && !Array.isArray(rule) ? (rule as Record<string, unknown>)['id'] : undefined;
    return { index, id: typeof id === 'string' ? id : undefined };
  });
}

/** The text without the rule at `index` (by position), re-serialised with two-space indentation. */
export function removeRule(text: string, index: number): string {
  const found = parseRules(text);
  if (found === undefined || !Number.isInteger(index) || index < 0 || index >= found.rules.length) return text;
  found.rules.splice(index, 1);
  return formatTable(found.parsed);
}
