# Bare Bones: product brief

Written by the owner before any code. Kiro turns this into steering and specs.

## The idea

A lot of small, useful web tools are a decision in disguise: "which bin does this go in?", "which licence fits my project?", "do I need a visa?", "which form do I file?". They are usually written as a pile of if-statements, and nobody can tell whether the pile has holes (a case nobody answered) or contradictions (two branches that answer the same case differently).

Bare Bones is a skeleton for that kind of tool. The decision lives in a **decision table**, a data file. A small engine checks the table for holes and contradictions, asks the user the fewest questions needed, and explains every answer with the rule that fired and the source behind it. A page shell turns any valid table into an accessible web app. A CLI checks tables and scaffolds new apps.

Two apps prove it is a template and not a one-off. Each app folder holds three files only: `table.json`, `copy.json`, `theme.css`. Diff the two folders and that is all you see.

1. **Which bin?** (`apps/which-bin/`): where a household item goes under South Korea's separate-discharge rules, in English, for people who live in Korea and cannot read the Korean guides. Seoul's 2025 standard rules plus the Ministry of Environment guide. Friendly, big tiles, one tap per question.
2. **Which licence?** (`apps/which-licence/`): which of seven common open-source licences fits a project, from choosealicense.com's published licence data. Plain, precise, a list of options with a sentence each. Not legal advice.

The source notes for both are in `docs/sources/README.md`. Every rule in a table cites a row there. Where the sources are silent the table says so (an "ask your district office" outcome) instead of guessing.

## The table format

A table is JSON:

- `id`, `title`.
- `conditions`: ordered list. Each has `id`, `question`, optional `help`, and `values` (at least two), each with `id`, `label`, optional `hint`.
- `outcomes`: each has `id`, `label`, `detail`.
- `rules`: each has `id`, `when`, `then`, optional `note`, and `source`. `when` maps a condition id to one value id or a non-empty array of value ids (any of them). A condition not named in `when` matches every value ("any"). `then` is an outcome id. `source` is `{ "ref": <source id>, "at": <where in the source> }`.
- `sources`: each has `id`, `title`, `url`, `published` (date or "unknown"), `read` (date).

Ids are lower-case kebab-case. A **combination** is one value for every condition. The table's space is every combination; tables with more than 100,000 combinations are rejected.

## What the engine must do

All of this is plain TypeScript with no runtime dependencies, so it runs the same in Node, the CLI, the MCP server and the browser.

1. **Validate** the structure and report every problem with a path (`rules[3].when.kind`): unknown condition, value, outcome or source; duplicate ids; a condition with fewer than two values; an empty `when` array; a bad id; too many combinations.
2. **Check** a structurally valid table:
   - a **gap** is a combination no rule matches;
   - a **conflict** is a combination matched by two rules with different outcomes (two rules that agree are fine);
   - report the number of gap combinations and, for each conflicting pair of rules, the pair, their outcomes and one example combination; report up to 20 example gap combinations;
   - warnings, which do not fail the check: an outcome no rule produces.
   A table passes when it has no structural errors, no gaps and no conflicts.
3. **Decide** from partial answers (any subset of conditions answered, in any order):
   - the consistent combinations are those that agree with every answer;
   - if all of them get the same outcome, the result is **decided**: the outcome, the rules that fire on at least one consistent combination, the answered conditions those rules actually test ("what mattered"), each rule's note and source;
   - otherwise the result is **open** with the next question to ask.
   - A question is **relevant** when two consistent combinations that differ only in that condition get different outcomes. The next question is always a relevant one. Among the relevant ones pick the one whose worst answer leaves the fewest distinct outcomes; break ties by the table's condition order.
   - Answering never asks a question that cannot change the outcome, and stops as soon as the outcome is decided. The questions it skipped are listed in the result ("not asked, because they could not change the answer").
   - The result depends only on the set of answers, not on the order they were given.
4. Answers that name an unknown condition or value are an error, not ignored, in the engine. (The page ignores bad answers in a shared link and says so.)

## The page shell

One static page per app, built from the skeleton plus the app folder. No login, no server, no model calls, no tracking, no external requests.

- One question at a time. The answer options are real buttons. `copy.json` picks the answer style: `tiles` (big touch targets in a grid) or `list` (a vertical list with the hint under each label).
- The answers so far are shown as a short list; each can be changed, which goes back to that point.
- The result shows the outcome, its detail, the rule's note, "why" (rule id, what mattered, the source with a link and dates) and the skipped questions.
- A shareable link: answers live in the URL hash (`#kind=glass&broken=no`); opening the link restores them. A "copy link" button.
- "Show the whole table": a plain HTML table of all rules, "any" for unnamed conditions, with outcome and source.
- Works on a 360 px phone and with the keyboard alone; focus moves to the new question or result; visible focus; WCAG AA contrast in both light and dark (`prefers-color-scheme`); respects `prefers-reduced-motion`.
- `copy.json` holds every word on the page that is not in the table: title, tagline, intro, button labels, the footer with source attribution and disclaimers. `theme.css` holds only CSS custom properties (colours for light and dark, fonts, radius, spacing scale) and nothing that changes layout logic.
- A landing page lists every app with its title and tagline.

## The CLI

`npm run bones -- check <table.json>`: prints structural errors, gaps (count and examples) and conflicts (pairs and examples), or "ok" with the counts of conditions, combinations and rules. Exit 0 when the table passes, 1 when it does not, 2 for usage errors.

`npm run bones -- new <name>`: copies `skeleton/template/` to `apps/<name>/` with the name filled in. The template is a tiny valid app (two questions). Refuses an existing folder or a bad name. After `new`, `npm run build` builds it with no other change.

## Build and hosting

`npm run build` checks every table under `apps/` (any failure stops the build), and writes `dist/` with one folder per app plus the landing page. All links are relative, so the site works under `https://seunghyeon1004.github.io/bare-bones-kiro/`. A GitHub Actions workflow runs the checks and tests and publishes `dist/` to GitHub Pages.

## Dev tooling

- An MCP server (stdio, dev only) exposing `check_table` (path or inline table) and `evaluate` (path plus answers, returns the decide result), so an agent can check a table it is editing.
- Tests: vitest unit tests; fast-check properties for the guarantees above; Playwright end-to-end tests with axe for both apps.

## Non-goals

No accounts, no saving, no editor UI, no translations, no analytics, no fuzzy matching or search over items. Each app is one or two screens. Correct checker, two working apps and clean design matter more than features.
