# Progressive Bilingual Reader — Implementation Spec

A ruleset for building "diglot weave" storybooks: texts that begin in the reader's language and gradually become the target language. Covers the pedagogy, the data model, the interactive behaviors, and the QA checks. Any (source, target) pair from the supported set should work from one authored dataset.

---

## 0. Repository layout and build

```
src/head.html    Page chrome: CSS, body skeleton, opening <script> tag. Shared by all books.
src/engine.js    Rendering engine (starts with /*ENGINE*/). Language-pair selection, page flip,
                 tap popups, footnotes, glossary and translation generation. Book-agnostic.
src/tail.html    Closing tags.
shared/i18n.js   LANGS, language-name matrices, PAGEWORD/GLOSSTITLE, UI string table.
                 Edit only when adding a language or changing scaffolding copy.
books/<name>.js  One file per book: TITLE, CONCEPTS (C), TOKENS, PAGES. All story content.
build.js         node build.js [book] -> dist/<book>.html (plain concatenation, no deps).
tools/validate.js node tools/validate.js [dist/<book>.html] -> runs §5 checks. Exit 1 on error.
dist/            Build output. Single self-contained HTML file per book.
```

Rules for changes:
- Story content changes go in books/, never in src/.
- Adding a language touches: LANGS, LNAME_SELF, LNAMES (row and column), UI block, PAGEWORD,
  GLOSSTITLE in shared/i18n.js; TITLE, every concept in C, every segment x, and a TOKENS map
  in each book file; plus the LK/KEYS letter maps in src/engine.js and tools/validate.js.
- After any change: `npm run build && npm run validate`. Both must pass before the work is done.

---

## 1. Pedagogy rules

**R1 — Comprehensibility.** A word may switch to the target language only where the surrounding context makes its meaning inferable without a dictionary. The *first* occurrence must be maximally transparent: apposition ("little pigs are *porquinhos*"), direct labeling of something just described ("he found a pile of straw. '*Palha!*'"), or restatement in the next clause.

**R2 — Progression ladder.** Introduce categories in this order:
1. Concrete nouns (pig, house, wolf, straw)
2. High-imagery adjectives (big, lazy, strong)
3. High-frequency verbs, one fixed form each (said, built, ran)
4. Function words (articles, and, but, no, of) — hardest to infer, so they arrive late and inside already-familiar phrases
5. Fixed phrases and repeated dialogue lines
6. Whole clauses, then whole sentences, then whole pages

**R3 — Repetition.** Every item introduced in the first half of the book recurs at least 3 times, with the first recurrence within 1–2 pages of introduction. If such an item cannot recur 3 times, don't introduce it as tracked vocabulary — leave it inside a full-sentence segment. Items introduced in the second half are exempt: they arrive inside full-sentence segments where the tap fallback, the final-page translation, and the glossary carry the support, and the book ends before three natural recurrences are possible.

**R4 — Story selection.** Prefer public-domain tales with built-in repetition loops (Three Little Pigs, Goldilocks, The Gingerbread Man, The Enormous Turnip). The loop is the drill: each iteration re-runs the same dialogue at a higher target-language ratio. In the Three Pigs, the wolf's exchange runs three times — mostly source, half target, fully target.

**R5 — First appearance gets a footnote; later appearances get a popup.** The first time an item appears in the target language, list it in a small, subtle note at the bottom of that page ("*palavra — meaning*"). Do not footnote it again. All later occurrences rely on the tap-to-reveal popup as a reminder. Footnotes are quiet by design: small type, muted color, hairline separator — present but not competing with the story.

**R6 — Landmark phrases get one inline gloss.** Famous lines (the huff-and-puff rhyme, "not by the hairs...") receive an em-dash translation in running text on first occurrence only: "*deixe-me entrar!* — let me in!" Subsequent occurrences appear bare.

**R7 — No visual marking of target words.** Same font, size, weight, and color as surrounding text. Highlighting would flag exactly the words the reader doesn't know and break the flow. Accepted tradeoff: zero discoverability of the tap mechanic — mitigate with an explicit instruction page containing a "try it now" word, and a brief flash *after* a word is tapped.

**R8 — Words carry vocabulary; sentences carry grammar.** Single-word swaps teach word meanings but nothing about gender, agreement, conjugation, or word order. From roughly the midpoint, switch whole clauses and sentences so grammar rides along implicitly. This is mandatory for word-order-divergent targets (German verb-final clauses make single-verb swaps unnatural).

**R9 — Article rule for embedded nouns.** A target noun embedded in source-language prose takes the article and agreement of the *source* language, with gender taken from the source translation of that concept ("the casa", "la casa", "das casa" → use the source word's gender: "a Haus" when Portuguese is the source). Imperfect, but standard diglot practice; full-sentence segments later correct the record.

**R10 — Density budget.** At most ~5 tracked introductions per page in the first half. Full-sentence pages later may carry more because the popup fallback (R14) supports every word.

**R11 — Ending.** The final pages are ~100% target language. The last page replaces footnotes with a full translation hidden behind a "show translation" control, so the all-target ending isn't spoiled.

**R12 — Glossary.** Auto-generated from all tracked introductions: alphabetical by target word, with the page of first appearance. Never hand-maintained.

**R13 — Register per language.** Use the idiomatic narrative tense of each language: English simple past, Portuguese pretérito perfeito, French passé simple, Italian passato remoto, German Präteritum. Dialogue stays colloquial.

---

## 2. Data model

The book is authored once, language-independently, as **segments**. The engine renders any (source, target) pair from the same data.

**Languages.** `LANGS = {en, pt, fr, it, de}` (extensible).

**Concepts.** A table of tracked vocabulary: `CONCEPTS[id] = {en, pt, fr, it, de}` — the word or phrase rendered in every language. One entry per *form* where it matters (BUILT vs BUILT_PL). Concepts power footnotes, popups, and the glossary: footnote text is `CONCEPTS[c][target] — CONCEPTS[c][source]`, so a single table serves all language pairs.

**Token maps.** `TOKENS[lang][token] = conceptId`, mapping surface forms (including inflections: *fortes*, *Zweigen*, *coururent*) to concepts, per language. Coverage need not be exhaustive — see R14.

**Segments.** Each page is a list of paragraphs; each paragraph a list of segments. A segment is:

```
{ f: 0|1,            // 0 = render in source language, 1 = render in target
  x: {en,pt,fr,it,de}, // the text of this segment in every language
  n: [conceptIds],   // tracked items introduced here (first occurrence) → footnote
  g: 1 }             // append " — <source text>" inline gloss (landmark phrases, R6)
```

Every segment carries all five texts even when flagged source-only, because any language can be either side of the pair, and the source text is also the popup fallback and the page-translation source. Source-language glue is written per language, so each language places verbs and articles naturally around the switched slots (German may put the verb in a different slot than English — that's expected and fine).

**Templated segments.** Sentences that mention the mechanic itself ("In %L, little pigs are %W") are templates per source language, with `%L` = target-language name (localized name matrix) and `%W` = the tappable target word.

**Chrome strings.** Cover, how-to page, footnote label, popup fallback label, translation button, and page labels are localized: reader-facing scaffolding follows the *source* language; page numbers, glossary title, and the book title follow the *target* language (they're teaching material).

---

## 3. Interactive behaviors

**B1 — Language pair selector.** Two controls ("I read in… / I'm learning…") on the cover. Same-language pairs are prevented (changing one to match the other swaps them). Changing the pair re-renders the current page; no reload.

**B2 — Page flip.** Swipe, arrow buttons, and keyboard arrows. 3D flip animation; instant swap under `prefers-reduced-motion`.

**B3 — Tap-to-reveal popup.** Every word inside a target-flagged segment is tappable, styled identically to normal text (R7). On tap:
1. Normalize the token (lowercase; keep accents and internal hyphens).
2. If `TOKENS[target][token]` exists → show `token` + `CONCEPTS[concept][source]`.
3. Otherwise → fall back to the whole segment: show `token` + "in this sentence: <segment text in source language>".

The fallback is a feature, not a failure mode: it guarantees a useful answer for every tap, makes exhaustive token maps optional, and doubles as sentence-level translation on the heavily-target late pages.

**B4 — Footnotes.** Rendered from the page's `n` lists: a hairline-separated block at the bottom of the page, small and muted, `target — source` pairs. First occurrence only (enforced by authoring + QA, not runtime deduplication).

**B5 — Glossary and final translation.** Generated at render time from the same data (R11, R12), so they are always consistent with the current language pair.

**B6 — No browser storage.** All state in memory (artifact constraint). Position and pair reset on reload.

---

## 4. Authoring a new book

1. Choose the tale (R4) and write/adapt a compact source text with a repeating structure.
2. Cut the text into segments at the points where language will switch. Early pages: noun-sized target slots inside source glue. Late pages: sentence-sized target segments.
3. Assign `f` flags along the ladder (R2), respecting the density budget (R10).
4. Mark `n` on each item's first target occurrence (R5) and `g` on landmark phrases (R6).
5. Build the concept table for everything in `n`, plus function words worth glossing.
6. Translate every segment into every supported language (R13). Machine translation is a draft, not a deliverable: have a native or fluent speaker review each language before giving the book to a learner.
7. Fill token maps for tracked vocabulary in each language; rely on the fallback for the rest.
8. Run the QA checklist.

---

## 5. QA checklist

- Every segment has text for all supported languages; no empty strings.
- Every concept referenced in `n` or any token map exists in `CONCEPTS`, with all languages filled.
- Every tracked concept's `n` mark sits on its *first* target-flagged occurrence, and the item recurs ≥3 times afterwards (script-checkable via token maps).
- No page in the first half introduces more than ~5 tracked items.
- Read the rendered text for at least the most likely pairs in both directions (e.g., en→pt, pt→en, en→de, de→en): check article/agreement seams (R9) and that no source glue accidentally contains target-language words.
- Tap coverage: on late pages, spot-check that unknown tokens produce the sentence fallback, not a dead tap.
- Final page shows no footnotes and offers the full translation control.
