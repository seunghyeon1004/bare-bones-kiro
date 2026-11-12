---
inclusion: fileMatch
fileMatchPattern: "{apps/**,skeleton/template/**,skeleton/examples/**}"
---

# Table format

A table is JSON with these keys:

- `id`, `title`.
- `conditions`: ordered list. Each: `id`, `question`, optional `help`, `values` (at least 2). Each value: `id`, `label`, optional `hint`.
- `outcomes`: each `id`, `label`, `detail`.
- `rules`: each `id`, `when`, `then`, optional `note`, `source`.
  - `when` maps a condition id to one value id, or to a non-empty array of value ids (any of them).
  - A condition not named in `when` matches every value ("any").
  - `then` is an outcome id.
  - `source` is `{ "ref": <source id>, "at": <where in the source> }`.
- `sources`: each `id`, `title`, `url`, `published` (date or `"unknown"`), `read` (date).

## Rules

1. All ids are lower-case kebab-case and unique within their list.
2. A combination is one value for every condition. A table with more than 100,000 combinations is rejected.
3. Every rule cites a row in `docs/sources/README.md`: `source.ref` is a source id (`seoul-2025`, `moe-2018`, `choosealicense`) and `source.at` is the Ref from that file's quote table (for example `seoul-2025 A2 가`) or the file name for licences (for example `mit.yml`).
4. A rule with no source line in `docs/sources/README.md` is not added. Do not guess.
5. When the sources are silent, the table routes that case to an explicit outcome saying so (for example `ask-district-office`), cited to the README note that the sources are silent. It never picks a plausible answer.
6. `table.json` must pass `npm run bones -- check` (no errors, gaps or conflicts) before a task touching it is ticked.
7. `skeleton/examples/` tables are broken on purpose (one defect each, named in the file name). Do not fix them.
