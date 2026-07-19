# Progressive Bilingual Reader

Storybooks that begin in the reader's language and gradually become the target language ("diglot weave"). One authored dataset renders any (source, target) pair among English, Portuguese (BR), French, Italian, German, and Spanish. Output is a single self-contained HTML file per book: page-flip navigation, tap-any-word popups, first-appearance footnotes, auto-generated glossary, and a hidden full translation on the final page. A generated library page (`index.html`) lists every book and lets the reader pick the language pair before opening one.

## Quick start

```
node build.js                              # builds every book in books/ + index.html (library)
node build.js three-little-pigs            # builds one book (index.html always refreshed)
node tools/validate.js                     # QA checks (default: dist/three-little-pigs.html)
node tools/validate.js dist/jack-and-the-beanstalk.html
```

No dependencies. Node 18+. Open `index.html` in a browser, pick the pair, choose a book — or open any `dist/*.html` directly and pick the pair on its cover. The library passes the chosen pair to the book via `?src=&tgt=`; a book opened straight from `dist/` behaves exactly as before.

`npm run build` / `npm run validate` are equivalent to the above.

## Layout

```
src/       chrome (head.html, tail.html), rendering engine (engine.js), library template
           (library.html) — all book-agnostic
shared/    i18n.js — language names and UI strings for all six languages
books/     one data file per book (concepts, token maps, story segments)
tools/     validate.js — structural QA (spec §5)
dist/      build output, one self-contained HTML file per book
index.html build output — the library page (also the GitHub Pages entry point)
```

Titles and character names are localized per language the way each tale is traditionally told: *Jack and the Beanstalk* is *João e o Pé de Feijão* (pt), *Hans und die Bohnenranke* (de), *Juan y las Habichuelas Mágicas* (es), while French and Italian keep "Jack".

## Documents

- `implementation.spec.md` — the full ruleset: pedagogy rules R1–R13, data model, engine behaviors B1–B6, authoring steps, QA checklist, and repo/build rules. Read this before changing anything.
- `CLAUDE.md` — operating instructions for AI-assisted development in this repo.

## Adding a book

Follow spec §4. Summary: pick a repetitive public-domain tale; cut it into segments; flag each segment source (`S(...)`) or target (`{f:1,...}`); mark first appearances with `n:[...]` and landmark phrases with `g:1`; fill the concept table and token maps; translate every segment into all six languages; `node build.js <name>` and `node tools/validate.js dist/<name>.html`.

## Known limitations

- The French, Italian, German, and Spanish translations in `books/three-little-pigs.js` were machine-authored, as were all six languages of `books/jack-and-the-beanstalk.js` (including the English/Portuguese base text). Have a fluent speaker review each language before giving a book to a learner (spec §4 step 6).
- Token maps are intentionally non-exhaustive: unmapped words fall back to a whole-sentence translation popup (spec B3). `validate.js` prints per-language coverage.
- No persistence: reading position and language pair reset on reload (spec B6). The library's `?src=&tgt=` link is the only way a pair survives a reload, and it lives in the URL, not in storage.
- `validate.js` currently reports known content warnings for the example book: five first-half words fall short of the 3-repetition rule (GOODBYE, LAZY, CLEVER, WORKED, HUNGER) and page 6 introduces 6 items against a budget of ~5. These are authoring gaps to fix in `books/three-little-pigs.js`, not engine bugs.
