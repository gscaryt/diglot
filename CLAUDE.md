# CLAUDE.md

Instructions for working in this repository.

## What this is

A zero-dependency generator for progressive bilingual storybooks ("diglot weave"). `build.js` concatenates `src/head.html + shared/i18n.js + books/<name>.js + src/engine.js + src/tail.html` into one self-contained HTML file in `dist/`, and also generates the library page `index.html` at the repo root from `src/library.html` (i18n + per-book TITLE/ART injected). The authoritative ruleset is `implementation.spec.md`; when in doubt, that document wins.

## Invariants — do not break

1. Every segment carries text for all five languages (`x:{e,p,f,i,d}` complete, or `c:'CONCEPT_ID'`). Every concept in `C` has all five languages.
2. Target words are never visually marked (no highlight, underline, color, or weight change) — spec R7.
3. First appearance of a tracked item gets a footnote (`n:[...]` on that segment, once only); later occurrences rely on tap popups — spec R5.
4. The final story page has `tr:1` (translation reveal, no footnotes); no other page does — spec R11.
5. Source-language glue never contains target-language words.
6. No localStorage/sessionStorage or any browser storage — spec B6.
7. Unmapped tokens must remain tappable and fall back to the segment's source-language text — spec B3. Do not remove the fallback to "clean up" the popup code.

## Workflow

- After every change: `node build.js && node tools/validate.js`. Validation must exit 0. Treat new warnings as questions to resolve, not noise.
- Story/content changes → `books/`. Engine/UI behavior → `src/engine.js`. Library page markup/behavior → `src/library.html`. Scaffolding copy or new language → `shared/i18n.js`. Never inline book content into the engine.
- `%L` strings in `shared/i18n.js` must compose with the language names in that source language's `LNAMES` row — the fr/it rows carry articles (l'anglais, lo spagnolo) by design; see spec §2 "Articled language names".
- When editing `books/*.js`, keep the segment-slot structure: languages may distribute words differently across the same S/T slot sequence (German verb placement differs from English) — that is by design, not a bug to normalize.
- New book: follow spec §4 steps 1–8. Copy `books/three-little-pigs.js` as a template.
- New language: follow the checklist in spec §0 (touches i18n, every book file, engine letter maps, validator letter maps).

## Translation quality

Machine-authored translations (currently FR/IT/DE/ES in the example book) are drafts. Flag them as needing native-speaker review in any user-facing summary; do not present them as verified learner-ready content.
