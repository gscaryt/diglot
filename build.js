#!/usr/bin/env node
/* Assemble single-file HTML readers from src/ + shared/ + books/<name>.js,
   plus the library index page (index.html at the repo root).
   Usage: node build.js            -> builds every book in books/ + index.html
          node build.js [book]     -> builds that book + refreshes index.html
   Output: dist/<book-name>.html, index.html */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const all = fs.readdirSync('books').filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).sort();
const arg = process.argv[2];
if (arg && !all.includes(arg)) {
  console.error('No such book: books/' + arg + '.js');
  console.error('Available: ' + all.join(', '));
  process.exit(1);
}
const toBuild = arg ? [arg] : all;

const read = f => fs.readFileSync(f, 'utf8');
fs.mkdirSync('dist', { recursive: true });

for (const book of toBuild) {
  const out = read('src/head.html')             // doctype, CSS, body chrome, opening <script> tag
            + read('shared/i18n.js')            // LANGS, language names, UI strings
            + read(path.join('books', book + '.js')) // TITLE, CONCEPTS, TOKENS, PAGES
            + read('src/engine.js')             // rendering engine (starts with /*ENGINE*/)
            + read('src/tail.html');            // closing tags
  const outFile = path.join('dist', book + '.html');
  fs.writeFileSync(outFile, out);
  console.log('Built ' + outFile + ' (' + out.length + ' bytes)');
}

/* ---- library index: one card per book, links into dist/ with ?src=&tgt= ---- */
// default cover art, kept in sync with the fallback in src/engine.js
const DEFAULT_ART = '<svg class="pig" viewBox="0 0 200 145" aria-hidden="true"><ellipse cx="108" cy="80" rx="60" ry="42"/><circle cx="52" cy="70" r="30"/><ellipse cx="32" cy="74" rx="10" ry="8"/><path d="M29 72 v4 M36 72 v4"/><path d="M40 46 L33 26 L55 38"/><path d="M61 42 L64 21 L78 37"/><circle cx="52" cy="61" r="2.6" fill="#2b2418" stroke="none"/><path d="M82 119 v16 M104 122 v15 M128 121 v16 M150 112 v16"/><path d="M167 72 q16 -8 11 4 q-5 11 9 7"/></svg>';

const meta = all.map(name => {
  const src = read(path.join('books', name + '.js'));
  const { TITLE, ART } = vm.runInNewContext(
    src + ';({TITLE, ART: (typeof ART === "undefined") ? null : ART})', {});
  return { file: name, title: TITLE, art: ART || DEFAULT_ART };
});

const lib = read('src/library.html')
  .replace('/*I18N*/', () => read('shared/i18n.js'))
  .replace('"/*BOOKS*/"', () => JSON.stringify(meta));
fs.writeFileSync('index.html', lib);
console.log('Built index.html (' + lib.length + ' bytes, ' + meta.length + ' books)');
