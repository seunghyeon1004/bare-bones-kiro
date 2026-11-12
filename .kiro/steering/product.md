---
inclusion: always
---

# Product: Bare Bones

Bare Bones is a skeleton for small web tools that are a decision in disguise. The decision lives in a decision table (JSON). An engine checks the table for gaps and conflicts, asks the fewest questions, and explains each answer with the rule and source. Full detail: `docs/product-brief.md`.

## The two apps

1. Which bin? (`apps/which-bin/`): where a household item goes under South Korea's separate-discharge rules. For English readers living in Korea who cannot read the Korean guides. Sources: Seoul 2025 rules and the Ministry of Environment 2018 guide. Tone: friendly, `tiles` answer style.
2. Which licence? (`apps/which-licence/`): which of 7 open-source licences fits a project (MIT, Apache-2.0, Unlicense, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0). Source: choosealicense.com data. Tone: plain, precise, `list` answer style. Not legal advice; the app says so.

## Non-goals

No accounts, no saving, no editor UI, no translations, no analytics, no fuzzy matching or search over items, no server, no model calls, no external requests from the page. Each app is one or two screens.

## Rule: the two app folders differ only in three files

Each `apps/<name>/` contains exactly `table.json`, `copy.json`, `theme.css`. No other file, no code. If a feature needs a change inside an app folder beyond those three files, it belongs in `skeleton/` instead, and stop to say so.
