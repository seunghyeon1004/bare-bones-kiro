export interface RuleRow { index: number; id: string | undefined; when: string | undefined; outcome: string | undefined }

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

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** `condition=value` pairs joined by commas; several values of one condition are joined by `/`. Undefined when there are none. */
function describeWhen(when: unknown): string | undefined {
  if (!isObject(when)) return undefined;
  const parts: string[] = [];
  for (const [condition, entry] of Object.entries(when)) {
    const values = (Array.isArray(entry) ? entry : [entry]).filter((v): v is string => typeof v === 'string');
    if (values.length > 0) parts.push(`${condition}=${values.join('/')}`);
  }
  return parts.length === 0 ? undefined : parts.join(', ');
}

/** One row per element of `rules`; undefined unless the text is a JSON object with a `rules` array. */
export function listRules(text: string): RuleRow[] | undefined {
  const found = parseRules(text);
  if (found === undefined) return undefined;
  return found.rules.map((rule, index) => {
    const fields = isObject(rule) ? rule : {};
    const { id, then } = fields;
    return {
      index,
      id: typeof id === 'string' ? id : undefined,
      when: describeWhen(fields['when']),
      outcome: typeof then === 'string' ? then : undefined,
    };
  });
}

/** The text without the rule at `index` (by position), re-serialised with two-space indentation. */
export function removeRule(text: string, index: number): string {
  return takeRule(text, index)?.text ?? text;
}

/** The text without the rule at `index`, and the rule itself; undefined when there is no such rule. */
export function takeRule(text: string, index: number): { text: string; rule: unknown } | undefined {
  const found = parseRules(text);
  if (found === undefined || !Number.isInteger(index) || index < 0 || index >= found.rules.length) return undefined;
  const [rule] = found.rules.splice(index, 1);
  return { text: formatTable(found.parsed), rule };
}

/** The text with `rule` put back at `index` (clamped to the end); the text unchanged when it holds no `rules` array. */
export function restoreRule(text: string, index: number, rule: unknown): string {
  const found = parseRules(text);
  if (found === undefined) return text;
  found.rules.splice(Math.max(0, Math.min(index, found.rules.length)), 0, rule);
  return formatTable(found.parsed);
}
