#!/usr/bin/env node
/* QA checks from implementation.spec.md §5, run against a built HTML file.
   Usage: node tools/validate.js [dist/three-little-pigs.html]
   Exit code 1 on errors. Warnings do not fail the build. */
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2] || 'dist/three-little-pigs.html';
const html = fs.readFileSync(file, 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('/*ENGINE*/'));
const { C, TOKENS, PAGES, UI, LANGS } =
  vm.runInNewContext(script + ';({C,TOKENS,PAGES,UI,LANGS})', {});

const KEYS = ['e', 'p', 'f', 'i', 'd', 's'];
const FULL = ['en', 'pt', 'fr', 'it', 'de', 'es'];
const WORD = /[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*/gu;
const errs = [], warns = [];

/* 1. Every concept has every language, non-empty */
for (const [id, v] of Object.entries(C))
  FULL.forEach(L => { if (!v[L] || !v[L].trim()) errs.push(`concept ${id} missing ${L}`); });

/* 2. Every segment has every language; n/c references exist */
PAGES.forEach((pg, pi) => pg.ps.flat().forEach((seg, si) => {
  if (seg.m) return;
  if (seg.c) { if (!C[seg.c]) errs.push(`p${pi + 1} unknown concept ${seg.c}`); }
  else KEYS.forEach(k => {
    if (seg.x[k] === undefined || seg.x[k] === '') errs.push(`p${pi + 1} seg${si} missing lang ${k}`);
  });
  (seg.n || []).forEach(c => { if (!C[c]) errs.push(`p${pi + 1} n ref unknown ${c}`); });
}));

/* 3. Token map values reference existing concepts */
for (const [L, map] of Object.entries(TOKENS))
  for (const [tok, cid] of Object.entries(map))
    if (!C[cid]) errs.push(`TOKENS.${L}.${tok} -> unknown ${cid}`);

/* 4. Each tracked concept introduced exactly once */
const seen = {};
PAGES.forEach((pg, pi) => pg.ps.flat().forEach(seg => (seg.n || []).forEach(c => {
  if (seen[c] !== undefined) errs.push(`${c} introduced twice: p${seen[c] + 1} and p${pi + 1}`);
  seen[c] = pi;
})));

/* 5. Density budget: <=5 tracked intros per page in the first half (warning) */
const half = Math.ceil(PAGES.length / 2);
PAGES.forEach((pg, pi) => {
  if (pi >= half) return;
  const n = pg.ps.flat().reduce((a, s) => a + ((s.n || []).length + (s.m ? 1 : 0)), 0);
  if (n > 5) warns.push(`p${pi + 1}: ${n} introductions (budget ~5)`);
});

/* 6. Repetition (R3): concepts introduced in the FIRST HALF should recur >=3
      times in target text. Second-half introductions are exempt (spec R3).
      Counted per language: segments whose c matches, segments whose target
      text contains the concept's rendering as a substring (covers phrases),
      or segments containing a token mapped to the concept. */
FULL.forEach((L, ix) => {
  for (const [cid, introPage] of Object.entries(seen)) {
    if (introPage >= half) continue;
    let count = 0;
    PAGES.forEach(pg => pg.ps.flat().forEach(seg => {
      if (seg.m) { if (cid === 'PIGS') count++; return; }
      if (seg.f !== 1) return;
      if (seg.c === cid) { count++; return; }
      const txt = seg.c ? C[seg.c][L] : seg.x[KEYS[ix]];
      if (txt.toLowerCase().includes(C[cid][L].toLowerCase())) { count++; return; }
      for (const m of txt.matchAll(WORD))
        if (TOKENS[L][m[0].toLowerCase()] === cid) { count++; break; }
    }));
    if (count < 3) warns.push(`${L}: ${cid} introduced p${introPage + 1}, occurs ${count}x in target text (<3)`);
  }
});

/* 7. Token coverage stats (informational; fallback covers the rest) */
FULL.forEach((L, ix) => {
  let hit = 0, tot = 0;
  PAGES.forEach(pg => pg.ps.flat().forEach(seg => {
    if (seg.m || seg.f !== 1) return;
    const txt = seg.c ? C[seg.c][L] : seg.x[KEYS[ix]];
    for (const m of txt.matchAll(WORD)) { tot++; if (TOKENS[L][m[0].toLowerCase()]) hit++; }
  }));
  console.log(`${L}: token coverage ${hit}/${tot} (${Math.round(100 * hit / tot)}%)`);
});

/* 8. Final page: translation flag on, no other page has it */
PAGES.forEach((pg, pi) => {
  if (pg.tr && pi !== PAGES.length - 1) errs.push(`p${pi + 1} has tr flag but is not final`);
});
if (!PAGES[PAGES.length - 1].tr) errs.push('final page missing tr flag');

console.log(`pages: ${PAGES.length} | concepts: ${Object.keys(C).length} | tracked intros: ${Object.keys(seen).length}`);
if (warns.length) console.log('WARNINGS:\n  ' + warns.join('\n  '));
if (errs.length) { console.error('ERRORS:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('OK: no structural errors');
