# Design: apps

## Overview

Two data folders, one demo table, one test file, a Playwright setup and one workflow. No code goes into `apps/`. The engine is not changed. Everything below was first run through a throwaway brute-force model of the engine definitions (enumerate, match, decide with worst-case selection); the counts and walk lengths quoted here come from that run. The implementing task must reproduce them with the real engine and stop if one differs (`tech.md` rule 6).

## Assumptions and departures

1. **shell-and-cli answers.** The owner's answers are recorded there before this spec starts. Used here: `labels` has 19 keys (`noscript` added); dark colours required in every theme; the formatter in `skeleton/engine/format.ts` (this spec does not import it); no jsdom (all DOM behaviour is checked by Playwright).
2. **`source.at` forms.** which-bin: exactly one README Ref (`steering/table-format.md` rule 3). The five `ask-district` rules need other forms (below). which-licence: `<file>.yml: <fact>; <fact>`, as the owner asked, so a test can check each fact against the yml file.
3. **Two shared Refs.** `moe-2018 FAQ p.21` and `moe-2018 FAQ p.22` each name two README rows. A rule cites the Ref; its `note` says which row it uses.
4. **The demo table has two defects.** `table-format.md` rule 7 says one defect per example, named in the file name. The owner asked for a gap and a conflict in one file called `which-bin-broken`. The `title` and the added rule's `note` say which rule was removed and which added.
5. **The demo shows `gaps: 4`, not 1.** A rule covers a block of combinations. The smallest block in this table is 4 (`glass-soiled`: `coated` and `clear-drink` are "any"). The 4 differ only in conditions the removed rule did not name, so it is one hole with four example combinations.
6. **e2e is served under `/bare-bones-kiro/`.** The brief says the site lives at `https://seunghyeon1004.github.io/bare-bones-kiro/`. Serving `dist/` under that prefix tests the relative links the way Pages serves them.
7. **Korean text.** 종량제봉투, 특수규격마대, 대형폐기물 and 지자체별 차이 appear as written, each with an English explanation. The pages stay `lang="en"` (translations are a non-goal). Fonts: see themes.
8. **`published` for `seoul-2025`** is `2025-08-06`, which `docs/sources/README.md` records as the date the page was updated.
9. **No new properties.** See "Correctness properties".

## Files

```
apps/which-bin/{table.json, copy.json, theme.css}
apps/which-licence/{table.json, copy.json, theme.css}
skeleton/examples/which-bin-broken.table.json
test/apps.test.ts
playwright.config.ts
scripts/serve.mjs
e2e/helpers.ts  landing.spec.ts  walk.spec.ts  link.spec.ts  table.spec.ts  nojs.spec.ts  a11y.spec.ts  layout.spec.ts
.github/workflows/pages.yml
package.json    + @playwright/test 1.65.0, @axe-core/playwright 4.14.0, script test:e2e
tsconfig.json   + "playwright.config.ts" in include
```

## which-bin: conditions

Value order inside a yes/no condition is `no`, then `yes` (as in the template). Ids are lower-case kebab-case.

| Condition | Question | Help | Values (id: label, hint) |
| --- | --- | --- | --- |
| `kind` | What is the item? | | see next table |
| `soiled` | Is there food or grease on it that rinsing will not remove? | Rinse it first if you can. Answer Yes only if it is still dirty after rinsing. | `no`: No, Clean, or it rinses clean. `yes`: Yes, Still dirty after rinsing. |
| `broken` | Is it broken? | | `no`: No. `yes`: Yes. |
| `glass-type` | What kind of glass is it? | | `ordinary`: Bottle, jar or ordinary drinking glass. `special`: Heat-resistant, crystal, ceramic or window glass, Includes coated or coloured glass products, lighting glass and pottery (사기·도자기). |
| `coated` | Is the paper cup coated on both sides? | | `no`: No. `yes`: Yes, Both the inside and the outside have a coating. |
| `clear-drink` | Is it a colourless, see-through water or drink bottle? | | `no`: No, Coloured, or not a drink bottle. `yes`: Yes, Colourless and see-through. |

`kind` values, in the owner's order:

| id | label | hint |
| --- | --- | --- |
| `paper-box` | Paper or cardboard box | Cardboard and pizza boxes. Insulated delivery boxes lined with foil or plastic are not paper: they go in the general waste bag. |
| `paper-books` | Newspaper, books or flyers | Plastic-coated flyers go in the general waste bag. |
| `paper-cup` | Paper cup | |
| `carton` | Drink carton | Milk or juice cartons |
| `receipt` | Receipt | |
| `glass` | Glass | Bottles, jars, drinking glasses, window glass |
| `can` | Can | Drink and food cans |
| `foil` | Aluminium foil | |
| `plastic-bottle` | Plastic bottle | |
| `plastic-container` | Other plastic container or tray | |
| `plastic-film` | Plastic film or bag | |
| `styrofoam` | Styrofoam | |
| `battery` | Battery | |
| `lamp` | Fluorescent lamp | |

The two hints on `paper-box` and `paper-books` carry README rows `seoul-2025 A1 1` and the plastic-coated-flyer half of `seoul-2025 A1 2` without a rule (requirement 3.7).

## which-bin: outcomes

| id | label | detail |
| --- | --- | --- |
| `paper` | Paper | Put it out with paper recycling. |
| `cartons` | Drink cartons | Put it in the carton-only collection bin. |
| `glass-bottles` | Glass bottles | Put it out with glass bottles. |
| `cans` | Cans | Put it out with metal cans. |
| `clear-pet` | Clear PET bottles | Put it out as a clear PET bottle, separate from other plastics. |
| `plastics` | Plastics | Put it out with plastic containers. |
| `plastic-film` | Plastic film | Put it out with plastic film and bags, inside a clear or semi-clear bag. |
| `styrofoam` | Styrofoam | Put it out with styrofoam. |
| `battery-box` | Battery collection box | Put it in a battery collection box at a collection point. |
| `lamp-box` | Fluorescent lamp collection box | Put it in your district's fluorescent lamp collection container. |
| `general-waste` | General waste bag (종량제봉투) | Put it in the general waste bag, called a 종량제봉투 (jongnyangje-bongtu). It is the official pay-as-you-throw bag: you pay for the bag, and the price depends on its size. |
| `special-sack` | Special sack for non-combustibles (특수규격마대) | Put it in a special sack for non-combustible waste, called a 특수규격마대 (teuksu-gyugyeok madae). You buy the sack. Large items can also go out as bulky waste (대형폐기물). |
| `ask-district` | Ask your district office | The guides this app uses do not cover this case. Ask your district office (구청) before you put it out. |

## which-bin: rules

30 rules, each `{ id, when, then, note, source: { ref, at } }`. A condition missing from `when` is "any". `at` is the README Ref in the last-but-one column; the two special forms are named `SILENT` and `NONE` below.

`SILENT` = `docs/sources/README.md, note below the quote table`. `NONE` = `none: no quoted row (open question 1)`. For both, `ref` is `seoul-2025`.

| Rule id | when | then | at | note |
| --- | --- | --- | --- | --- |
| `paper-box-clean` | kind=paper-box, soiled=no | paper | seoul-2025 A2 가 | Take off any plastic coating, tape, staples and foil, then fold the box. |
| `paper-box-soiled` | kind=paper-box, soiled=yes | general-waste | moe-2018 dictionary, 피자박스 | The Ministry's guide lists a pizza box as paper, but inner paper soiled with grease goes in the general waste bag. |
| `paper-books-clean` | kind=paper-books, soiled=no | paper | seoul-2025 A2 나 (신문지, 책자) | Keep it dry, flatten it, stack it and tie it into a bundle. Remove plastic covers and spiral bindings first. |
| `paper-books-soiled` | kind=paper-books, soiled=yes | general-waste | moe-2018 FAQ p.21 | Paper with food or dirt on it goes in the general waste bag. (Ministry FAQ, paper with dirt.) |
| `paper-cup-coated` | kind=paper-cup, coated=yes | general-waste | seoul-2025 A1 2 | A paper cup coated on both sides cannot be recycled as paper. |
| `paper-cup-clean` | kind=paper-cup, coated=no, soiled=no | paper | seoul-2025 A2 나 (종이컵) | Empty it, rinse it with water and press it flat. Put cups in a bag or tie them together. |
| `paper-cup-soiled` | kind=paper-cup, coated=no, soiled=yes | general-waste | moe-2018 FAQ p.21 | A cup with a lot of food or other residue on it goes in the general waste bag. (Ministry FAQ, paper cups.) |
| `carton-clean` | kind=carton, soiled=no | cartons | seoul-2025 A2 나 (종이팩) | Empty it, rinse it and let it dry. Use the carton-only bin. If there is none, tie the cartons together and put them out beside the paper. |
| `carton-soiled` | kind=carton, soiled=yes | general-waste | moe-2018 FAQ p.22 | A carton with a lot of residue on it goes in the general waste bag. (Ministry FAQ, cartons.) |
| `receipt` | kind=receipt | general-waste | seoul-2025 A1 2 | Thermal paper receipts cannot be recycled as paper. |
| `glass-clean` | kind=glass, glass-type=ordinary, broken=no, soiled=no | glass-bottles | seoul-2025 A2 다 | Empty it and rinse it. Deposit bottles (soju, beer) can go back to a shop. Ordinary drinking glasses and beer mugs go with glass bottles too (Ministry FAQ p.22). |
| `glass-broken` | kind=glass, glass-type=ordinary, broken=yes | general-waste | seoul-2025 A1 3 | Wrap the pieces in newspaper first. A small amount goes in the general waste bag. A large amount goes in a special sack for non-combustibles (특수규격마대). |
| `glass-soiled` | kind=glass, glass-type=ordinary, broken=no, soiled=yes | ask-district | NONE | The guides do not say what to do with glass that is still dirty after rinsing. |
| `glass-special` | kind=glass, glass-type=special | special-sack | seoul-2025 A1 3 | Heat-resistant, crystal, coated or coloured glass, window glass, lighting glass and ceramics go in a special sack (특수규격마대) or can be put out as bulky waste (대형폐기물). |
| `can-clean` | kind=can, soiled=no | cans | seoul-2025 A2 라 | Empty it and rinse it. Remove plastic lids and anything else that is not metal. |
| `can-soiled` | kind=can, soiled=yes | ask-district | NONE | The guides do not say what to do with a can that is still dirty after rinsing. |
| `foil` | kind=foil | general-waste | seoul-2025 A1 4 | Aluminium foil goes in the general waste bag. |
| `pet-clear` | kind=plastic-bottle, clear-drink=yes, soiled=no | clear-pet | seoul-2025 A2 마 | Empty it, peel off the label, press it flat and close the cap. Put it out separately from other plastics. |
| `pet-clear-soiled` | kind=plastic-bottle, clear-drink=yes, soiled=yes | ask-district | NONE | The guides do not say what to do with a clear bottle that is still dirty after rinsing. |
| `plastic-bottle-clean` | kind=plastic-bottle, clear-drink=no, soiled=no | plastics | seoul-2025 A2 바 | Empty it and rinse it. Remove the label and any parts made of another material. |
| `plastic-bottle-soiled` | kind=plastic-bottle, clear-drink=no, soiled=yes | ask-district | SILENT | Neither guide says what to do with a plastic container that still has food or grease on it after rinsing. |
| `plastic-container-clean` | kind=plastic-container, soiled=no | plastics | seoul-2025 A2 바 | Empty it and rinse it. Remove the label and any parts made of another material. |
| `plastic-container-soiled` | kind=plastic-container, soiled=yes | ask-district | SILENT | Neither guide says what to do with a plastic container that still has food or grease on it after rinsing. |
| `film-clean` | kind=plastic-film, soiled=no | plastic-film | seoul-2025 A2 사 | Empty it, rinse it, and put it out inside a clear or semi-clear bag. |
| `film-soiled` | kind=plastic-film, soiled=yes | general-waste | moe-2018 FAQ p.25 | Film or wrap that cannot be cleaned, such as snack and noodle wrappers, goes in the general waste bag. |
| `styrofoam-clean` | kind=styrofoam, soiled=no | styrofoam | seoul-2025 A2 아, A1 7 | Empty it, rinse it and remove labels. |
| `styrofoam-soiled` | kind=styrofoam, soiled=yes | general-waste | seoul-2025 A2 아, A1 7 | Styrofoam with food on it, or with dirt that is hard to remove, goes in the general waste bag. |
| `battery` | kind=battery | battery-box | seoul-2025 A2 차 | Take the battery out of the device. Put it in a battery collection box at a collection point. |
| `lamp-whole` | kind=lamp, broken=no | lamp-box | seoul-2025 A2 카, A1 9 | Put it in your district's fluorescent lamp collection container. |
| `lamp-broken` | kind=lamp, broken=yes | general-waste | seoul-2025 A2 카, A1 9 | A small amount of a broken lamp goes in the general waste bag. A large amount goes in a special sack for non-combustibles (특수규격마대). |

The README quote table has 22 rows and 20 distinct Refs. The rules use 19 of them; the unused one is `seoul-2025 A1 1`. The one `at` per rule that is a README Ref is checked by a test, so a Ref cannot drift from the README.

`sources`:

```json
[
  { "id": "seoul-2025",
    "title": "Seoul Metropolitan Government, 헷갈리는 분리배출 기준, 서울시가 알려드립니다! (Seoul's standard discharge rules)",
    "url": "https://news.seoul.go.kr/env/archives/564022", "published": "2025-08-06", "read": "2026-11-12" },
  { "id": "moe-2018",
    "title": "Ministry of Environment, 재활용품 분리배출 가이드라인 (Guidelines for separating recyclables)",
    "url": "https://sustainability.korea.ac.kr/files/Separation%20and%20discharge%20guide%20for%20recycling%20items%20(Ministry%20of%20Environment).pdf",
    "published": "2018-08-30", "read": "2026-11-12" }
]
```

(All five URLs in this spec returned HTTP 200 on 2026-11-12.)

### Result of the check (model run)

`6 conditions, 448 combinations, 30 rules`, 0 gaps, 0 conflicts, all 13 outcomes used. 52 combinations end in `ask-district`: `glass-soiled` 4, `can-soiled` 16, `pet-clear-soiled` 8 (28 unlisted); `plastic-bottle-soiled` 8, `plastic-container-soiled` 16 (24 silent).

First question: `kind` (worst case 4 outcomes; the others 12 or 13). Questions asked, walking every combination: receipt, foil, battery 1; paper box, books, carton, can, container, film, styrofoam, lamp 2; paper cup and plastic bottle 2 or 3; glass 4. Mean over all 448 combinations: 2.00.

## which-bin: combinations the sources do not cover

These are the flags the owner asked for. Nothing here is a guess in the table: the first group is routed to `ask-district` and marked, the second group is carried in a `note` or `hint`.

**A. No README row covers the case (unlisted rules, routed to `ask-district` "for now"; requires the owner's agreement, open question 1).** Combinations are counted over all six conditions.

| # | Case | Rule | Combinations |
| --- | --- | --- | --- |
| U1 | `kind=glass`, `glass-type=ordinary`, `broken=no`, `soiled=yes` (a bottle or glass still dirty after rinsing) | `glass-soiled` | 4 (`coated`, `clear-drink` free) |
| U2 | `kind=can`, `soiled=yes` | `can-soiled` | 16 |
| U3 | `kind=plastic-bottle`, `clear-drink=yes`, `soiled=yes` (a clear bottle still dirty; `seoul-2025 A2 마` says only "empty it cleanly") | `pet-clear-soiled` | 8 |

**B. The README says the sources are silent (silent rules).** `kind=plastic-container`, `soiled=yes` (16 combinations) and `kind=plastic-bottle`, `clear-drink=no`, `soiled=yes` (8; a coloured bottle is an A2 바 container, "bottles included"). Both cite the README note.

**C. A README row exists but depends on a fact no condition asks.** No rule or condition is added.

| # | Row | What the conditions cannot say | What the table does |
| --- | --- | --- | --- |
| P1 | `seoul-2025 A1 3`, broken glass | small amount → general bag; large amount → special sack | `glass-broken` → general waste; the note gives the large-amount case |
| P2 | `seoul-2025 A2 카, A1 9`, broken lamp | same | `lamp-broken` → general waste; the note gives the large-amount case |
| P3 | `seoul-2025 A1 1`, foil- or plastic-lined insulated box | no lining condition, no such `kind` | no rule; a sentence in the `paper-box` hint. The only unused README Ref |
| P4 | `seoul-2025 A1 2` against `A2 나`, plastic-coated flyers | `coated` is defined for paper cups only | `paper-books` rules ignore coating; a sentence in the `paper-books` hint |
| P5 | `moe-2018 dictionary, 피자박스`, the box is paper, only the greasy inner paper is general waste | one bin per item | `soiled=yes` → general waste; the note quotes the split |

## which-licence: conditions

| Condition | Question | Help | Values (id: label, hint) |
| --- | --- | --- | --- |
| `copyleft` | If someone shares a changed or combined version, how much of it must be shared under your licence? | Copyleft means the source must be shared under the same terms. | `none`: None, Changes and larger works may use other terms and need not include source. `file`: Only the changed files, Source of the licensed files and changes to them stays open (weak copyleft). `library`: Only the library, Source of the library and changes to it stays open; a program that uses it through its interfaces may use other terms. `whole`: The whole program, Larger works that use your code must be shared under the same licence (strong copyleft). |
| `network` | Should running a modified version as a network service count as distributing it? | Among these seven licences, only AGPL-3.0 requires the source of a modified version that is used to provide a network service. | `no`: No. `yes`: Yes, Users of the service can get the source of the modified version. |
| `patent` | Do you want contributors to give an express patent grant? | Apache-2.0, MPL-2.0, LGPL-3.0, GPL-3.0 and AGPL-3.0 list patent-use. MIT and the Unlicense do not. | `no`: No. `yes`: Yes, Contributors grant patent rights. |
| `credit` | Must copies keep your copyright notice? | Every licence here except the Unlicense lists include-copyright. | `no`: No. `yes`: Yes, Copies keep the copyright and licence notice. |

## which-licence: outcomes

For each file in `docs/sources/choosealicense/`: `id` below, `label` = `<title> (<spdx-id>)`, `detail` = the `description:` value, copied unchanged.

| id | file | label |
| --- | --- | --- |
| `mit` | `mit.yml` | MIT License (MIT) |
| `apache-2-0` | `apache-2.0.yml` | Apache License 2.0 (Apache-2.0) |
| `unlicense` | `unlicense.yml` | The Unlicense (Unlicense) |
| `mpl-2-0` | `mpl-2.0.yml` | Mozilla Public License 2.0 (MPL-2.0) |
| `lgpl-3-0` | `lgpl-3.0.yml` | GNU Lesser General Public License v3.0 (LGPL-3.0) |
| `gpl-3-0` | `gpl-3.0.yml` | GNU General Public License v3.0 (GPL-3.0) |
| `agpl-3-0` | `agpl-3.0.yml` | GNU Affero General Public License v3.0 (AGPL-3.0) |

## which-licence: rules

7 rules, `source.ref` = `choosealicense`. Facts used (from the yml files): `patent-use` is listed by Apache-2.0, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0, not by MIT or the Unlicense. `include-copyright` is listed by all except the Unlicense (`conditions: []`). `network-use-disclose` only by AGPL-3.0. `same-license--file` MPL-2.0, `same-license--library` LGPL-3.0, `same-license` GPL-3.0 and AGPL-3.0.

| Rule id | when | then | at | note |
| --- | --- | --- | --- | --- |
| `permissive-patent` | copyleft=none, patent=yes | apache-2-0 | `apache-2.0.yml: patent-use; include-copyright` | Apache-2.0 is the only licence of the seven without copyleft that lists patent-use, the express patent grant. It also lists include-copyright, so copies must keep notices. If you wanted a patent grant and no notice requirement, none of the seven fits both, and Apache-2.0 is the nearest. |
| `permissive-notice` | copyleft=none, patent=no, credit=yes | mit | `mit.yml: include-copyright; no patent-use` | MIT lists include-copyright as its only condition, so copies keep your notice. It does not list patent-use. |
| `permissive-nothing` | copyleft=none, patent=no, credit=no | unlicense | `unlicense.yml: no conditions; no patent-use` | The Unlicense has no conditions, so copies need not keep any notice. It does not list patent-use. |
| `copyleft-file` | copyleft=file | mpl-2-0 | `mpl-2.0.yml: same-license--file; patent-use` | MPL-2.0 keeps the licensed files and changes to them under the same licence; a larger work may use other terms for the files it adds. It lists include-copyright and patent-use, as do the other copyleft licences here, so your answers on notices and patents do not change this. Only agpl-3.0.yml lists network-use-disclose, and it covers the whole program, so none of the seven combines file-level copyleft with network use. |
| `copyleft-library` | copyleft=library | lgpl-3-0 | `lgpl-3.0.yml: same-license--library; patent-use` | LGPL-3.0 keeps the library and changes to it under the same licence or GPL-3.0; a larger work that uses it through its interfaces may use other terms. It lists include-copyright and patent-use, as do the other copyleft licences here. Only agpl-3.0.yml lists network-use-disclose, so none of the seven combines library-level copyleft with network use. |
| `copyleft-whole` | copyleft=whole, network=no | gpl-3-0 | `gpl-3.0.yml: same-license; no network-use-disclose` | GPL-3.0 keeps larger works that use the licensed work under the same licence. It does not list network-use-disclose. It lists include-copyright and patent-use. |
| `copyleft-network` | copyleft=whole, network=yes | agpl-3-0 | `agpl-3.0.yml: network-use-disclose; same-license` | AGPL-3.0 adds network-use-disclose: when a modified version is used to provide a service over a network, its complete source must be made available. Its other conditions are the same as GPL-3.0's. |

`source`: `{ "id": "choosealicense", "title": "choosealicense.com licence data (github/choosealicense.com, gh-pages commit 687dabb)", "url": "https://github.com/github/choosealicense.com/tree/687dabb300c3d58891285d9567cc6f73a495470c/_licenses", "published": "unknown", "read": "2026-11-12" }`.

Model run: `4 conditions, 32 combinations, 7 rules`, 0 gaps, 0 conflicts, all outcomes used. First question `copyleft`. Walk lengths: `file` and `library` 1; `whole` 2; `none` with a patent grant 2; `none` without a patent grant 3.

Design choices: `network` is asked only after `copyleft=whole`, because it only changes the outcome there. For `file` and `library` the page lists `network`, `patent` and `credit` under "not asked", and the note says why they could not change the result. Where no licence fits (`permissive-patent` with no notice wanted; `copyleft-file` or `copyleft-library` with network use wanted) the copyleft scope wins over the other answers (open question 9).

## Copy

Both files have the 19 labels. `{n}`, `{max}` and `{count}` are placeholders.

`apps/which-bin/copy.json`:

```json
{
  "title": "Which bin?",
  "tagline": "Where does it go? Sorting household rubbish and recycling in South Korea, in plain English.",
  "intro": "Pick what the item is and answer a few quick questions. The answer follows the separate-discharge rules for South Korea, as published by Seoul in 2025. Rules vary by district, so your own district office has the last word.",
  "answerStyle": "tiles",
  "labels": {
    "startOver": "Start again", "change": "Change", "why": "Why this answer", "rule": "Rule",
    "whatMattered": "What mattered", "source": "Source", "published": "Published", "readOn": "Read on",
    "notAsked": "Questions we skipped, because they could not change the answer",
    "copyLink": "Copy link", "linkCopied": "Link copied",
    "showTable": "Show every rule", "hideTable": "Hide the rules", "any": "any",
    "outcome": "Where it goes", "yourAnswers": "Your answers",
    "questionOf": "Question {n} of up to {max}",
    "badLink": "{count} answer(s) in this link were not recognised and were ignored.",
    "noscript": "This page needs JavaScript to ask its questions. It does not send anything anywhere."
  },
  "resultLead": "Where it goes:",
  "footer": [
    { "text": "Source: Seoul Metropolitan Government, Seoul's standard discharge rules (page updated 2025-08-06)", "href": "https://news.seoul.go.kr/env/archives/564022" },
    { "text": "Source: Ministry of Environment, Guidelines for separating recyclables (PDF, 2018-08-30)", "href": "https://sustainability.korea.ac.kr/files/Separation%20and%20discharge%20guide%20for%20recycling%20items%20(Ministry%20of%20Environment).pdf" },
    { "text": "These are the rules for South Korea as published by Seoul. They vary by district (지자체별 차이), so check with your district office if you are unsure. This is not an official service." }
  ]
}
```

`apps/which-licence/copy.json`:

```json
{
  "title": "Which licence?",
  "tagline": "Which of seven common open-source licences fits your project, from choosealicense.com data.",
  "intro": "Answer a few questions about how others may reuse your code. Each result is tied to facts in the choosealicense.com data for MIT, Apache-2.0, Unlicense, MPL-2.0, LGPL-3.0, GPL-3.0 and AGPL-3.0. This is not legal advice.",
  "answerStyle": "list",
  "labels": {
    "startOver": "Start over", "change": "Change", "why": "Why this result", "rule": "Rule",
    "whatMattered": "What decided it", "source": "Source", "published": "Published", "readOn": "Read on",
    "notAsked": "Not asked, because the answer could not change the result",
    "copyLink": "Copy link", "linkCopied": "Link copied",
    "showTable": "Show the whole table", "hideTable": "Hide the table", "any": "any",
    "outcome": "Licence", "yourAnswers": "Your answers",
    "questionOf": "Question {n} of at most {max}",
    "badLink": "{count} answer(s) in this link were not recognised and were ignored.",
    "noscript": "This page needs JavaScript. It makes no network requests and stores nothing."
  },
  "resultLead": "Closest fit:",
  "footer": [
    { "text": "Licence data from choosealicense.com, CC BY 3.0", "href": "https://choosealicense.com/" },
    { "text": "Data source: github.com/github/choosealicense.com", "href": "https://github.com/github/choosealicense.com" },
    { "text": "CC BY 3.0 licence text", "href": "https://creativecommons.org/licenses/by/3.0/" },
    { "text": "Not legal advice. Read the full licence text before you use a licence." }
  ]
}
```

The result heading reads `<resultLead> <label>`; both lead phrases were chosen so that every outcome label reads naturally after them (`Where it goes: Ask your district office`).

## Themes

Both files hold the twelve contract properties in `:root` and the eight colours in `@media (prefers-color-scheme: dark) { :root { … } }`. Contrast ratios are computed by the WCAG 2.x formula (model run), all pairs of requirement 7.3 pass.

| Property | which-bin light | which-bin dark | which-licence light | which-licence dark |
| --- | --- | --- | --- | --- |
| `--bg` | `#fff4e0` | `#2a1a10` | `#f6f1e4` | `#17181b` |
| `--surface` | `#fffbf2` | `#3a2616` | `#fffdf7` | `#202226` |
| `--text` | `#2b1a0e` | `#fdeedb` | `#1b1b1b` | `#ebe6d9` |
| `--muted` | `#6b4a2f` | `#e0c3a2` | `#4f4a3f` | `#b9b3a5` |
| `--accent` | `#a63d00` | `#ffb36b` | `#1c3d6e` | `#8fb4ea` |
| `--accent-text` | `#ffffff` | `#2a1204` | `#ffffff` | `#101820` |
| `--border` | `#8a5a2b` | `#b58a5f` | `#6e675a` | `#8a8f99` |
| `--focus` | `#0b57d0` | `#8ab4f8` | `#9a3412` | `#f0b36a` |

Lowest ratio in each theme, always a border pair (minimum 3): which-bin light 5.39 (border on bg), which-bin dark 4.61 (border on surface), which-licence light 4.96 (border on bg), which-licence dark 4.91 (border on surface). Every text pair (minimum 4.5) is at least 5.86.

Light-only properties:

| Property | which-bin | which-licence |
| --- | --- | --- |
| `--font-body` | `ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-heading` | the same stack as `--font-body` | `Charter, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif` |
| `--radius` | `1.25rem` | `0` |
| `--space` | `1rem` | `0.75rem` |
| `--font-size` (only if in the contract) | `1.25rem` | `1rem` |

The look: which-bin is warm cream and burnt orange, round tiles, rounded typeface where the system has one. which-licence is ink on paper, no rounding, serif headings. Whether they look "clearly different" is a human judgement; the test only proves they differ in the properties of requirement 7.2. Nobody has looked at the rendered pages yet; the task opens both once in the browser (screenshots by Playwright, not committed) and reports what it sees.

**Large type.** The contract of shell-and-cli has no font-size property, and `shell.css` sets no font size, so a theme cannot make type larger. `--font-size` as a 13th contract property (with `shell.css` reading it) is the fix; it belongs in shell-and-cli, which this spec does not edit (open question 6). Until then which-bin gets large targets from `--space` and `--radius` only.

## Broken demo table

`skeleton/examples/which-bin-broken.table.json` is `apps/which-bin/table.json` with:

- the rule `glass-soiled` removed: 4 gaps, the combinations `kind=glass, soiled=yes, broken=no, glass-type=ordinary, coated=<no|yes>, clear-drink=<no|yes>`;
- a rule added at the end: `{ "id": "receipt-as-paper", "when": { "kind": "receipt" }, "then": "paper", "note": "WRONG ON PURPOSE: contradicts rule receipt (general waste). Added for the demo.", "source": { "ref": "seoul-2025", "at": "seoul-2025 A1 2" } }`;
- `id` `which-bin-broken`, `title` `Which bin? (broken on purpose: rule glass-soiled removed, rule receipt-as-paper added)`.

Model run: 4 gaps, first `kind=glass, soiled=yes, broken=no, glass-type=ordinary, coated=no, clear-drink=no`; 1 conflict, `receipt` against `receipt-as-paper`, outcomes `general-waste` and `paper`, example `kind=receipt, soiled=no, broken=no, glass-type=ordinary, coated=no, clear-drink=no`; no unused outcome (`ask-district` is still used by four rules). Removing `glass-soiled` is chosen because the rule exists in every version of the table whatever the owner decides about it.

## Golden items

Each is `decide(table, answers)` on the validated table. `questions` is the walk length from the complete combination made of the answers plus the first value (`no`, `ordinary`, the first `kind`) of every other condition.

which-bin:

| # | Item | Answers | Outcome | Rule | `source.at` | Questions |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Greasy pizza box | kind=paper-box, soiled=yes | general-waste | `paper-box-soiled` | moe-2018 dictionary, 피자박스 | 2 |
| 2 | Clean paper cup | kind=paper-cup, soiled=no, coated=no | paper | `paper-cup-clean` | seoul-2025 A2 나 (종이컵) | 3 |
| 3 | Paper cup coated on both sides | kind=paper-cup, coated=yes | general-waste | `paper-cup-coated` | seoul-2025 A1 2 | 3 |
| 4 | Broken drinking glass | kind=glass, glass-type=ordinary, broken=yes | general-waste | `glass-broken` | seoul-2025 A1 3 | 4 |
| 5 | Heat-resistant glass dish | kind=glass, glass-type=special | special-sack | `glass-special` | seoul-2025 A1 3 | 4 |
| 6 | Clear water bottle | kind=plastic-bottle, clear-drink=yes, soiled=no | clear-pet | `pet-clear` | seoul-2025 A2 마 | 3 |
| 7 | Plastic tub with food that will not rinse off | kind=plastic-container, soiled=yes | ask-district | `plastic-container-soiled` | docs/sources/README.md, note below the quote table | 2 |
| 8 | Battery | kind=battery | battery-box | `battery` | seoul-2025 A2 차 | 1 |

which-licence:

| # | Case | Answers | Outcome | Rule | `source.at` | Questions |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Whole program, no network | copyleft=whole, network=no | gpl-3-0 | `copyleft-whole` | gpl-3.0.yml: same-license; no network-use-disclose | 2 |
| 2 | Whole program, network counts | copyleft=whole, network=yes | agpl-3-0 | `copyleft-network` | agpl-3.0.yml: network-use-disclose; same-license | 2 |
| 3 | Changed files only | copyleft=file | mpl-2-0 | `copyleft-file` | mpl-2.0.yml: same-license--file; patent-use | 1 |
| 4 | The library only | copyleft=library | lgpl-3-0 | `copyleft-library` | lgpl-3.0.yml: same-license--library; patent-use | 1 |
| 5 | No copyleft, keep notice | copyleft=none, patent=no, credit=yes | mit | `permissive-notice` | mit.yml: include-copyright; no patent-use | 3 |
| 6 | Patent grant, no notice wanted (nearest) | copyleft=none, patent=yes, credit=no | apache-2-0 | `permissive-patent` | apache-2.0.yml: patent-use; include-copyright | 2 |
| 7 | No copyleft, nothing required | copyleft=none, patent=no, credit=no | unlicense | `permissive-nothing` | unlicense.yml: no conditions; no patent-use | 3 |
| 8 | Changed files only, network counts (nearest) | copyleft=file, network=yes | mpl-2-0 | `copyleft-file` | mpl-2.0.yml: same-license--file; patent-use | 1 |

Items 6 and 8 also assert that the rule's `note` contains `include-copyright` and `agpl-3.0.yml` respectively, which is the "nearest licence and why" claim (5.5). Items 1 to 5 of which-licence and the licence outcome details are checked against the yml files, not against numbers typed in the test.

## Tests: `test/apps.test.ts`

Imports `validate`, `check`, `decide` from `skeleton/engine/index.ts`; reads files with `node:fs`; no mocks. Describe names start with the word used by each task's filter. About 14 `it` blocks, no property.

- `which-bin table`
  - validates and checks with the pinned counts and no warning (2.3, 2.5, 2.6).
  - golden items, `it.each` over the 8 rows: decided, outcome, firing rules equal `[rule]`, `source.at`; walk length (9.1 to 9.3).
  - traceability: parse the README quote table (rows whose first cell starts with `seoul-2025` or `moe-2018`); every rule outside the five `ask-district` rules has an `at` that is a README Ref beginning with its `ref`; the README Refs not used as an `at` are exactly `['seoul-2025 A1 1']`; every rule has a non-empty `note`; the `ask-district` rules are exactly the five named, three with `at` starting `none:` and two with the silent `at` (3.1 to 3.6).
- `which-bin broken example`: equals the which-bin table minus `glass-soiled` plus `receipt-as-paper` (compared as objects); `check` gives 4 gaps, all with `kind=glass`, one conflict pair `receipt`/`receipt-as-paper`, no warning (8.1, 8.2).
- `which-licence table`
  - validates and checks with the pinned counts and no warning.
  - golden items, `it.each` over 8 rows, as above, with the two note assertions.
  - yml traceability: read the front matter of each yml (`permissions:` and `conditions:` lists, with a small line parser); each outcome's `detail` equals `description`, its `label` equals `title (spdx-id)`; every rule's `at` is `<file>.yml: <facts>` and every fact is true in that file (5.2, 5.4).
- `copy`: both files have 19 labels and `answerStyle` `tiles` / `list`; the phrases of 4.2, 6.2, 6.3; every which-bin footer link equals a source `url` (4.3).
- `themes`: the properties of 7.2 differ; the contrast pairs of 7.3 by a 15-line relative-luminance function; `@font-face`, `url(` and `@import` absent; the Hangul fonts present in which-bin (7.4, 7.5).
- `pages workflow`: reads `.github/workflows/pages.yml` as text. Checks `branches: [main]`, the order of the commands by `indexOf`, every `uses:` starts with `actions/`, `pages: write` and `id-token: write` appear only after `deploy:`, `contents: read` before `jobs:`, `path: dist`, `needs: build`, `node-version: 22` (11.1 to 11.6). A text check; it cannot prove GitHub accepts the file.

## End-to-end

### Setup

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/bare-bones-kiro/`;
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'node scripts/serve.mjs', url: BASE, reuseExistingServer: !process.env.CI, env: { PORT: String(PORT) } },
});
```

`scripts/serve.mjs` (plain ESM, about 40 lines, `node:http`, `node:fs`, `node:path`): `dist` is `../dist` of the script; exits 1 with `dist/ not found: run npm run build` if missing; `createServer` on `127.0.0.1:$PORT`; method other than GET/HEAD gives 405; the URL path must start with `/bare-bones-kiro/` (`/bare-bones-kiro` gives a 301 to the slash form), otherwise 404; the rest is decoded with `decodeURIComponent` in a `try`, resolved against `dist`, and 404 if the resolved path does not start with `dist` plus the separator; a directory serves its `index.html`; content types for `.html .js .css .json`, others `application/octet-stream`. No caching headers. It is a test helper, not product code (`structure.md`: `scripts/`).

`package.json`: add the two devDependencies and `"test:e2e": "npm run build && playwright test"`. `tsconfig.json`: add `playwright.config.ts` to `include`. Before the first run: `npx playwright install chromium` (downloads a browser, about 150 MB; not a package).

### Helpers (`e2e/helpers.ts`)

- `loadApp(name)`: `{ table, copy }` read from `apps/<name>/` with `fs` and `JSON.parse`.
- `choice(page, label)`: the button whose accessible name starts with `label` and is not followed by a letter.
- `pressChoice(page, label)`: keyboard only. Up to 40 times: if the button from `choice` is `document.activeElement`, press `Enter` and stop; otherwise press `Tab`. Fails if not found. No `click`, no `focus()`.
- `stepCount(page, copy)`: number of `li` in the list under the `labels.yourAnswers` heading.
- `scanAxe(page)`: `new AxeBuilder({ page }).analyze()`, returns `violations`.

### The 12 tests

| File | Test | What it asserts |
| --- | --- | --- |
| `landing.spec.ts` | landing page lists both apps | `h1` equals `landing.json` title; one link per app named by the app's title, followed by its tagline; Tab to the first link and `Enter` opens `which-bin/` with its `h1`; axe on the landing page has no violation |
| `walk.spec.ts` | which-bin: keyboard walk, greasy pizza box | goes to `which-bin/`; `labels.questionOf` shows question 1; `pressChoice` paper box, then Yes; result heading (`copy.resultLead`, a space, the `general-waste` label from `table.json`) is the focused element; `stepCount` is 2; the skipped list has 4 entries |
| `walk.spec.ts` | which-licence: keyboard walk, MIT | `pressChoice` None, No, Yes; result heading is focused and names MIT; `stepCount` is 3; skipped list has 1 entry (`network`) |
| `link.spec.ts` | shared link and bad link | `which-bin/#kind=glass&glass-type=ordinary&broken=yes`: result `General waste bag` shown with no interaction, focus on its heading, 3 steps. Then `which-bin/#kind=glass&broken=maybe&nope=1&kind=can`: the bad-link notice with count 3, the `kind=glass` step kept, a question shown (no result), address hash rewritten to `#kind=glass` |
| `table.spec.ts` | which-bin: whole table | toggle has `aria-expanded=false`, after activation `true`; the table named by `table.title` has 30 body rows and `conditions.length + 3` header cells; the `receipt` row has `labels.any` in 5 cells; its source cell contains the rule's `at` |
| `table.spec.ts` | which-licence: whole table | same with 7 rows, 7 header cells; the `copyleft-file` row has `labels.any` in 3 cells |
| `nojs.spec.ts` | pages are not blank without JavaScript | a context with `javaScriptEnabled: false`; for each app: the `h1` shows `copy.title`, `copy.intro` and `copy.labels.noscript` are visible |
| `a11y.spec.ts` | axe, which-bin, light | `emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })`; scans the question screen, the result screen (`#kind=battery`), and the result screen with the whole table open; each has no violation |
| `a11y.spec.ts` | axe, which-bin, dark | the same in dark |
| `a11y.spec.ts` | axe, which-licence, light | the same, result via `#copyleft=file` |
| `a11y.spec.ts` | axe, which-licence, dark | the same in dark |
| `layout.spec.ts` | no horizontal scroll at 360 px | viewport 360 by 740; for each app, on the question screen, the result screen and with the whole table open: `document.documentElement.scrollWidth <= clientWidth`, with the app and screen in the assertion message |

Notes:
- Reduced motion is set in the axe tests so that the colour transitions of `shell.css` cannot make axe read a colour mid-transition. The shell removes transitions under `prefers-reduced-motion` (shell-and-cli 9.4).
- Scanning the result screen with the whole table open goes one step beyond "question and result screens" in the owner's list. The table sits in a scrollable region, which is where axe finds `scrollable-region-focusable` and header problems. Cost: no extra test.
- The tests read headings, labels and counts from the JSON files, so a copy edit does not break them. The counts that must stay literal (2 and 3 questions, 30 and 7 rows) come from this design and from the table; a table change that alters them should fail.
- Known risk: the live region (`role="status"`) sits outside the landmarks. axe's `region` rule normally exempts live regions. If it does not, that is a shell defect: requirement 1.5 and 10.11 apply, and the owner decides.

## Workflow: `.github/workflows/pages.yml`

```yaml
name: Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Latest releases on 2026-11-12 (GitHub API): checkout v7.0.1, setup-node v7.1.0, upload-pages-artifact v5.0.0, deploy-pages v5.0.1; the major tags are used. The workflow runs `npx playwright test` after `npm run build`, not `npm run test:e2e`, so `dist/` is built once and the artifact is the tree that was tested. `actions/configure-pages` is left out: nothing here needs its outputs.

What the owner must do outside this spec, none of which Kiro does: commit `package-lock.json` (`npm ci` needs it), set Pages "Source" to "GitHub Actions" in the repository settings, push. The workflow has not run on GitHub when the task is ticked; only the text test and the local steps have run.

## Correctness properties

No new properties. The engine's Properties 1 to 10 already hold for any table, and these two tables are specific data: what is true of them (counts, outcomes, sources) is stated as example tests above. The one claim that looks universal, "every combination of each table has exactly one outcome", is the engine's check on a finite table (`npm run bones -- check`), run by the build and by `test/apps.test.ts`.

## Traceability of criteria

| Criterion | Checked by |
| --- | --- |
| 1.1, 1.2 | the `package.json` check in task 4's command |
| 1.3 | task 7 command |
| 1.4, 1.5 | the task preamble, and the owner's `git diff` (Kiro does not run git, so no command can prove 1.4) |
| 1.6 | `npm run build` in tasks 3 and 7 |
| 2.1 to 2.6 | `which-bin table` tests |
| 3.1 to 3.7 | `which-bin table` traceability test and the golden items; 3.7 by the notes and hints in the table |
| 4.1 to 4.3 | `npm run build` (copy validation) and the `copy` test |
| 5.1 to 5.7 | `which-licence table` tests |
| 6.1 to 6.3 | `npm run build` and the `copy` test |
| 7.1 | `npm run build` |
| 7.2 to 7.5 | `themes` test |
| 7.6 | read of `THEME_PROPS` in the task report |
| 8.1 to 8.3 | `which-bin broken example` test and the CLI exit code in task 1 |
| 9.1 to 9.4 | golden items |
| 10.1, 10.2 | every e2e run; 10.2 also by the tests passing through the server |
| 10.3 to 10.9 | the 12 tests |
| 10.10 | task 5 command (`npx playwright test --list` counts 12 tests) and review of the spec files for literals |
| 10.11 | task preamble |
| 11.1 to 11.6 | `pages workflow` test |

## Open questions for the owner

1. **Three unlisted cases (U1 to U3).** May a glass bottle or glass, a can, and a clear PET bottle that are still dirty after rinsing go to `ask-district`? The sources are silent on them but the README note names only plastic containers. If yes, the README note should be widened to name them (the rules cite `none:` until then); if no, say which outcome they should have, and rules `glass-soiled`, `can-soiled`, `pet-clear-soiled` change.
2. **Amount of broken glass and broken lamps (P1, P2).** `seoul-2025 A1 3` and `A1 9` split small and large amounts. Add a yes/no condition `large-amount` (448 → 896 combinations, one more question for those items), or keep the note?
3. **Insulated boxes (P3).** Add a 15th `kind` value (insulated delivery box → general waste, `seoul-2025 A1 1`), or keep the sentence in the hint?
4. **Plastic-coated flyers (P4).** Widen `coated` to "coated on both sides / plastic-coated" so that it applies to flyers too, or keep the hint?
5. **Pizza box (P5).** The Ministry lists the box as paper and only the greasy inner paper as general waste. One bin per item gives "general waste" for a greasy box. Add an outcome "tear off the greasy part", or keep it?
6. **Large type.** Add `--font-size` as a 13th contract property in shell-and-cli (and have `shell.css` read it)? Without it requirement 7.6 is not met.
7. **Question order.** The engine breaks ties by condition order. Putting `glass-type` before `soiled` and `broken` would cut heat-resistant glass from 4 questions to 2 and the mean over all combinations from 2.00 to 1.93. You fixed the order, so I kept it.
8. **Wording of the glass note.** "Wrap the pieces in newspaper" is in the README gloss and in your brief, but the Korean quote in the README table (`깨진 유리제품: (소량) 종량제봉투, (다량) 특수규격마대`) does not contain it. Keep the sentence?
9. **"Nearest" licence.** For file or library copyleft with network use wanted, I offer MPL-2.0 or LGPL-3.0 (the scope wins) and say AGPL-3.0 is the only one with network-use-disclose. Prefer AGPL-3.0 there?
10. **Rows read beyond their subject.** `moe-2018 FAQ p.21` is about hand towels and cups, used for books and boxes via the README gloss; `FAQ p.25` is about snack and noodle wrappers, used for all film. The two shared Refs (p.21, p.22) cannot tell the rows apart in `source.at`; the note does.
11. **Pages.** Actions are pinned to major tags, not commit SHAs. Pushes to `main` only: pull requests get no CI from this file.
