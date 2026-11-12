/** Ids of the values whose label or keywords contain every word of `query` (case-insensitive), in the order given. A blank query matches all. Pure. */
export function matchValues(
  values: readonly { id: string; label: string }[],
  keywords: Readonly<Record<string, readonly string[]>>,
  query: string,
): string[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w !== '');
  return values
    .filter((value) => {
      const haystack = [value.label, ...(Object.hasOwn(keywords, value.id) ? (keywords[value.id] ?? []) : [])].join('\n').toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .map((value) => value.id);
}
