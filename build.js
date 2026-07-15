#!/usr/bin/env node
/* Assemble a single-file HTML reader from src/ + shared/ + books/<name>.js.
   Usage: node build.js [book-name]   (default: three-little-pigs)
   Output: dist/<book-name>.html */
const fs = require('fs');
const path = require('path');

const book = process.argv[2] || 'three-little-pigs';
const bookPath = path.join('books', book + '.js');
if (!fs.existsSync(bookPath)) {
  console.error('No such book: ' + bookPath);
  console.error('Available: ' + fs.readdirSync('books').filter(f => f.endsWith('.js')).join(', '));
  process.exit(1);
}

const read = f => fs.readFileSync(f, 'utf8');
const out = read('src/head.html')      // doctype, CSS, body chrome, opening <script>
          + read('shared/i18n.js')     // LANGS, language names, UI strings
          + read(bookPath)             // TITLE, CONCEPTS, TOKENS, PAGES
          + read('src/engine.js')      // rendering engine (starts with /*ENGINE*/)
          + read('src/tail.html');     // closing tags

fs.mkdirSync('dist', { recursive: true });
const outFile = path.join('dist', book + '.html');
fs.writeFileSync(outFile, out);
console.log('Built ' + outFile + ' (' + out.length + ' bytes)');
