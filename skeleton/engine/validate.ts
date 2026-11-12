import { MAX_COMBINATIONS } from './types.ts';
import type { Problem, ProblemKind, Table, ValidationResult } from './types.ts';

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Per-list lookup of well-formed items, built from the items' own ids. */
interface Registry {
  ids: Set<string>;
}

export function validate(input: unknown): ValidationResult {
  const problems: Problem[] = [];
  const add = (kind: ProblemKind, path: string, message: string): void => {
    problems.push({ kind, path, message });
  };

  // Field helpers. Each returns the value when it has the right shape, otherwise reports bad-shape.
  const reqString = (o: Obj, key: string, path: string): string | undefined => {
    const v = o[key];
    if (typeof v === 'string') return v;
    add('bad-shape', path, `${path} must be a string.`);
    return undefined;
  };
  const optString = (o: Obj, key: string, path: string): void => {
    if (Object.hasOwn(o, key) && typeof o[key] !== 'string') {
      add('bad-shape', path, `${path} must be a string when present.`);
    }
  };
  const reqArray = (o: Obj, key: string, path: string): unknown[] | undefined => {
    const v = o[key];
    if (Array.isArray(v)) return v;
    add('bad-shape', path, `${path} must be an array.`);
    return undefined;
  };
  /** Checks id format and duplicates within one list. */
  const checkId = (id: string, path: string, seen: Set<string>): void => {
    if (!ID_PATTERN.test(id)) {
      add('bad-id', path, `"${id}" is not a lower-case kebab-case id.`);
    }
    if (seen.has(id)) {
      add('duplicate-id', path, `"${id}" is already used in this list.`);
    }
    seen.add(id);
  };

  /** Validates a list of items with an id and required string fields (outcomes, sources). */
  const collect = (key: string, stringFields: string[]): Registry | undefined => {
    const raw = (input as Obj)[key];
    if (!Array.isArray(raw)) {
      add('bad-shape', key, `${key} must be an array.`);
      return undefined;
    }
    const seen = new Set<string>();
    raw.forEach((item: unknown, i) => {
      const path = `${key}[${i}]`;
      if (!isObj(item)) {
        add('bad-shape', path, `${path} must be an object.`);
        return;
      }
      const id = reqString(item, 'id', `${path}.id`);
      for (const f of stringFields) reqString(item, f, `${path}.${f}`);
      if (id !== undefined) checkId(id, `${path}.id`, seen);
    });
    return { ids: seen };
  };

  if (!isObj(input)) {
    add('bad-shape', '$', 'The table must be an object.');
    return { ok: false, problems };
  }

  // 1. Table id and title.
  const tableId = reqString(input, 'id', 'id');
  if (tableId !== undefined && !ID_PATTERN.test(tableId)) {
    add('bad-id', 'id', `"${tableId}" is not a lower-case kebab-case id.`);
  }
  reqString(input, 'title', 'title');

  // 2. Conditions.
  // conditionValues: condition id -> value ids, only for conditions whose values are all well-formed.
  const conditionIds = new Set<string>();
  const conditionValues = new Map<string, Set<string>>();
  const conditionsRaw = reqArray(input, 'conditions', 'conditions');
  let combos = 1;
  let overLimit = false;
  if (conditionsRaw !== undefined) {
    const seenConditions = new Set<string>();
    conditionsRaw.forEach((c, i) => {
      const path = `conditions[${i}]`;
      if (!isObj(c)) {
        add('bad-shape', path, `${path} must be an object.`);
        return;
      }
      const id = reqString(c, 'id', `${path}.id`);
      reqString(c, 'question', `${path}.question`);
      optString(c, 'help', `${path}.help`);
      const valuesRaw = reqArray(c, 'values', `${path}.values`);
      if (id !== undefined) {
        const firstUse = !seenConditions.has(id);
        checkId(id, `${path}.id`, seenConditions);
        if (firstUse) conditionIds.add(id);
      }
      if (valuesRaw === undefined) return;

      let wellFormed = true;
      const seenValues = new Set<string>();
      valuesRaw.forEach((v, k) => {
        const vPath = `${path}.values[${k}]`;
        if (!isObj(v)) {
          add('bad-shape', vPath, `${vPath} must be an object.`);
          wellFormed = false;
          return;
        }
        const vid = reqString(v, 'id', `${vPath}.id`);
        reqString(v, 'label', `${vPath}.label`);
        optString(v, 'hint', `${vPath}.hint`);
        if (vid === undefined) {
          wellFormed = false;
          return;
        }
        checkId(vid, `${vPath}.id`, seenValues);
      });
      if (valuesRaw.length < 2) {
        add('too-few-values', `${path}.values`, `${path} needs at least two values.`);
      }
      if (id !== undefined && wellFormed && !conditionValues.has(id)) {
        conditionValues.set(id, seenValues);
      }
      if (!overLimit) {
        combos *= valuesRaw.length;
        if (combos > MAX_COMBINATIONS) overLimit = true;
      }
    });
  }

  // 3. Outcomes and sources.
  const outcomes = collect('outcomes', ['label', 'detail']);
  const sources = collect('sources', ['title', 'url', 'published', 'read']);

  // 4. Rules.
  const rulesRaw = reqArray(input, 'rules', 'rules');
  if (rulesRaw !== undefined) {
    const seenRules = new Set<string>();
    rulesRaw.forEach((r, i) => {
      const path = `rules[${i}]`;
      if (!isObj(r)) {
        add('bad-shape', path, `${path} must be an object.`);
        return;
      }
      const id = reqString(r, 'id', `${path}.id`);
      if (id !== undefined) checkId(id, `${path}.id`, seenRules);
      const then = reqString(r, 'then', `${path}.then`);
      optString(r, 'note', `${path}.note`);
      const source = r['source'];
      let ref: string | undefined;
      if (!isObj(source)) {
        add('bad-shape', `${path}.source`, `${path}.source must be an object.`);
      } else {
        ref = reqString(source, 'ref', `${path}.source.ref`);
        reqString(source, 'at', `${path}.source.at`);
      }
      if (then !== undefined && outcomes !== undefined && !outcomes.ids.has(then)) {
        add('unknown-outcome', `${path}.then`, `"${then}" is not an outcome id.`);
      }
      if (ref !== undefined && sources !== undefined && !sources.ids.has(ref)) {
        add('unknown-source', `${path}.source.ref`, `"${ref}" is not a source id.`);
      }

      const when = r['when'];
      if (!isObj(when)) {
        add('bad-shape', `${path}.when`, `${path}.when must be an object.`);
        return;
      }
      for (const key of Object.keys(when)) {
        const wPath = `${path}.when.${key}`;
        const entry = when[key];
        const known = conditionsRaw === undefined || conditionIds.has(key);
        if (!known) {
          add('unknown-condition', wPath, `"${key}" is not a condition id.`);
          continue;
        }
        const allowed = conditionValues.get(key); // undefined when the condition's values are malformed
        const checkValue = (value: string, vPath: string): void => {
          if (allowed !== undefined && !allowed.has(value)) {
            add('unknown-value', vPath, `"${value}" is not a value of condition "${key}".`);
          }
        };
        if (typeof entry === 'string') {
          checkValue(entry, wPath);
        } else if (Array.isArray(entry)) {
          if (entry.length === 0) {
            add('empty-when-list', wPath, `${wPath} must not be an empty list.`);
          }
          entry.forEach((value: unknown, k) => {
            if (typeof value === 'string') {
              checkValue(value, `${wPath}[${k}]`);
            } else {
              add('bad-shape', `${wPath}[${k}]`, `${wPath}[${k}] must be a string.`);
            }
          });
        } else {
          add('bad-shape', wPath, `${wPath} must be a string or a list of strings.`);
        }
      }
    });
  }

  // 5. Combination count, last.
  if (overLimit) {
    add('too-many-combinations', 'conditions', `The table has more than ${MAX_COMBINATIONS} combinations.`);
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, table: input as unknown as Table };
}
