/*ENGINE*/
const LK = {en:'e',pt:'p',fr:'f',it:'i',de:'d',es:'s'};
// book-declared demo concept for %W templates (books define DEMO; 'PIGS' kept as legacy default)
const DEMO_C = (typeof DEMO === 'undefined') ? 'PIGS' : DEMO;
const WORD = /[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*/gu;
let SRC='en', TGT='pt', cur=0, anim=false;
// the library index links here with ?src=&tgt=; honor them (still no storage, spec B6)
let FROM_LIB=false;
try{
  const q=new URLSearchParams(location.search);
  if(LANGS.includes(q.get('src'))){ SRC=q.get('src'); FROM_LIB=true; }
  if(LANGS.includes(q.get('tgt')) && q.get('tgt')!==SRC){ TGT=q.get('tgt'); FROM_LIB=true; }
  if(TGT===SRC) TGT = SRC==='pt' ? 'en' : 'pt';
}catch(e){}
const TOTAL = PAGES.length + 3; // cover + how-to + story + glossary
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const book=document.getElementById('book'), pageEl=document.getElementById('pg'),
      ind=document.getElementById('ind'), prevB=document.getElementById('prev'),
      nextB=document.getElementById('next'), sheet=document.getElementById('sheet'),
      sw=document.getElementById('sw'), sd=document.getElementById('sd');

function X(seg,lang){ return seg.c ? C[seg.c][lang] : seg.x[LK[lang]]; }
function esc(s){ return s.replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function el(tag,cls,txt){ const n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; }

// wrap target-language text into tappable word spans inside container
function words(container, text){
  let last=0;
  for(const m of text.matchAll(WORD)){
    if(m.index>last) container.appendChild(document.createTextNode(text.slice(last,m.index)));
    const sp=el('span','w',m[0]); sp.tabIndex=0; sp.setAttribute('role','button');
    container.appendChild(sp); last=m.index+m[0].length;
  }
  container.appendChild(document.createTextNode(text.slice(last)));
}

function targetSpan(seg){
  const holder=el('span');
  holder.dataset.src = X(seg,SRC).trim();
  words(holder, X(seg,TGT));
  if(seg.g) holder.appendChild(document.createTextNode(' — '+X(seg,SRC).trim()));
  return holder;
}

/* ---------- page builders ---------- */
function buildCover(root){
  root.className='page cover';
  const fr=el('div','frame');
  fr.appendChild(el('div','eyebrow', UI[SRC].eyebrow.replace('%L', LNAMES[SRC][TGT])));
  const h1=document.createElement('h1');
  const tSeg={f:1,x:{e:TITLE.en,p:TITLE.pt,f:TITLE.fr,i:TITLE.it,d:TITLE.de,s:TITLE.es}};
  h1.appendChild(targetSpan(tSeg));
  fr.appendChild(h1);
  fr.appendChild(el('div','rule','✦ ✦ ✦'));
  fr.appendChild(el('p','sub', UI[SRC].sub.replace('%L', LNAMES[SRC][TGT])));
  const ls=el('div','lsel');
  [['sel-src',UI[SRC].readIn,SRC],['sel-tgt',UI[SRC].learn,TGT]].forEach(([id,lab,val])=>{
    const row=el('div','lrow'); const l=el('label',null,lab); l.htmlFor=id;
    const sel=document.createElement('select'); sel.id=id;
    LANGS.forEach(L=>{ const o=document.createElement('option'); o.value=L; o.textContent=LNAME_SELF[L]; if(L===val)o.selected=true; sel.appendChild(o); });
    row.appendChild(l); row.appendChild(sel); ls.appendChild(row);
  });
  fr.appendChild(ls);
  fr.insertAdjacentHTML('beforeend', (typeof ART === 'undefined')
   ? '<svg class="pig" viewBox="0 0 200 145" aria-hidden="true"><ellipse cx="108" cy="80" rx="60" ry="42"/><circle cx="52" cy="70" r="30"/><ellipse cx="32" cy="74" rx="10" ry="8"/><path d="M29 72 v4 M36 72 v4"/><path d="M40 46 L33 26 L55 38"/><path d="M61 42 L64 21 L78 37"/><circle cx="52" cy="61" r="2.6" fill="#2b2418" stroke="none"/><path d="M82 119 v16 M104 122 v15 M128 121 v16 M150 112 v16"/><path d="M167 72 q16 -8 11 4 q-5 11 9 7"/></svg>'
   : ART);
  fr.appendChild(el('p','hint', UI[SRC].hint));
  root.appendChild(fr);
  if(FROM_LIB){ // only when opened from the library, so a standalone copy stays self-contained
    const a=el('a','homeLink','‹ '+UI[SRC].lib);
    a.href='../index.html?src='+SRC+'&tgt='+TGT;
    root.appendChild(a);
  }
}

function buildHowto(root){
  root.className='page story';
  root.appendChild(el('div','plabel', UI[SRC].howtoLabel));
  root.appendChild(el('h2',null, UI[SRC].howtoTitle));
  root.appendChild(el('p',null, UI[SRC].howtoP.replaceAll('%L', LNAMES[SRC][TGT])));
  const ul=document.createElement('ul');
  UI[SRC].tips.forEach(t=>{
    const li=document.createElement('li');
    if(t.includes('%W')){
      const [a,b]=t.split('%W');
      li.appendChild(document.createTextNode(a));
      li.appendChild(targetSpan({f:1,c:DEMO_C}));
      li.appendChild(document.createTextNode(b));
    } else li.textContent=t;
    ul.appendChild(li);
  });
  root.appendChild(ul);
  root.appendChild(el('p',null, UI[SRC].happy));
}

function buildStory(root, pi){
  const page=PAGES[pi];
  root.className='page story';
  root.appendChild(el('div','plabel', PAGEWORD[TGT]+' '+(pi+1)));
  const intros=[];
  page.ps.forEach(para=>{
    const p=document.createElement('p');
    para.forEach(seg=>{
      if(seg.m){ // templated opening sentence
        intros.push(DEMO_C);
        const tpl=UI[SRC].meta1.replace('%L', LNAMES[SRC][TGT]);
        const [a,b]=tpl.split('%W');
        p.appendChild(document.createTextNode(a));
        p.appendChild(targetSpan({f:1,c:DEMO_C}));
        p.appendChild(document.createTextNode(b));
        return;
      }
      if(seg.n) intros.push(...seg.n);
      if(seg.f===0){ p.appendChild(document.createTextNode(X(seg,SRC))); return; }
      const t=targetSpan(seg);
      if(seg.b){ const bb=document.createElement('b'); bb.appendChild(t); p.appendChild(bb); }
      else p.appendChild(t);
    });
    root.appendChild(p);
  });
  if(page.tr){ // final page: full translation instead of footnotes
    const btn=el('button','trbtn', UI[SRC].showTr);
    const tr=el('p','tr'); tr.hidden=true; tr.style.whiteSpace='pre-line';
    tr.textContent = page.ps.map(para=>para.map(s=>X(s,SRC)).join('')).join('\n\n');
    root.appendChild(btn); root.appendChild(tr);
  } else if(intros.length){
    const fn=el('div','fnote');
    fn.innerHTML='<span class="fl">'+esc(UI[SRC].fnote)+'</span>'+
      intros.map(c=>'<b>'+esc(C[c][TGT])+'</b> — '+esc(C[c][SRC])).join(' · ');
    root.appendChild(fn);
  }
}

function buildGloss(root){
  root.className='page gloss';
  root.appendChild(el('div','plabel', GLOSSTITLE[TGT]));
  root.appendChild(el('h2',null, GLOSSTITLE[TGT]));
  const seen=new Map();
  PAGES.forEach((page,pi)=>{
    page.ps.flat().forEach(seg=>{
      if(seg.m && !seen.has(DEMO_C)) seen.set(DEMO_C, pi+1);
      (seg.n||[]).forEach(c=>{ if(!seen.has(c)) seen.set(c, pi+1); });
    });
  });
  const cols=el('div','cols');
  [...seen.entries()]
    .sort((a,b)=>C[a[0]][TGT].localeCompare(C[b[0]][TGT], TGT))
    .forEach(([c,pg])=>{
      const p=document.createElement('p');
      p.innerHTML='<b>'+esc(C[c][TGT])+'</b> — '+esc(C[c][SRC])+' <span class="pref">p. '+pg+'</span>';
      cols.appendChild(p);
    });
  root.appendChild(cols);
}

/* ---------- fill / flip / nav ---------- */
function fill(root, idx){
  document.title = TITLE[TGT] + ' — ' + TITLE[SRC];
  root.innerHTML=''; root.className='page';
  if(idx===0) buildCover(root);
  else if(idx===1) buildHowto(root);
  else if(idx===TOTAL-1) buildGloss(root);
  else buildStory(root, idx-2);
  root.scrollTop=0;
}
function update(){
  ind.textContent=(cur+1)+' / '+TOTAL;
  prevB.disabled=cur===0; nextB.disabled=cur===TOTAL-1;
}
function go(n){
  if(anim || n<0 || n>=TOTAL || n===cur) return;
  hideSheet();
  if(RM){ fill(pageEl,n); cur=n; update(); return; }
  anim=true;
  const fwd=n>cur, oldCls=pageEl.className, oldHTML=pageEl.innerHTML;
  fill(pageEl,n);
  const leaf=el('div','leaf'), f=document.createElement('div'), b=document.createElement('div');
  if(fwd){ f.className=oldCls+' face front'; f.innerHTML=oldHTML;
           b.className=pageEl.className+' face back'; b.innerHTML=pageEl.innerHTML;
           leaf.style.transform='rotateY(0deg)'; }
  else   { f.className=pageEl.className+' face front'; f.innerHTML=pageEl.innerHTML;
           b.className=oldCls+' face back'; b.innerHTML=oldHTML;
           leaf.style.transform='rotateY(-180deg)'; }
  leaf.appendChild(f); leaf.appendChild(b); book.appendChild(leaf);
  leaf.getBoundingClientRect();
  leaf.style.transform = fwd?'rotateY(-180deg)':'rotateY(0deg)';
  leaf.addEventListener('transitionend',()=>{ leaf.remove(); anim=false; },{once:true});
  setTimeout(()=>{ if(leaf.isConnected){ leaf.remove(); anim=false; } },900);
  cur=n; update();
}

/* ---------- popup ---------- */
function showDef(w){
  const tok=w.textContent, cid=TOKENS[TGT][tok.toLowerCase()];
  sw.textContent=tok;
  if(cid){ sd.textContent=C[cid][SRC]; }
  else{
    const src=(w.closest('[data-src]')||{}).dataset ? w.closest('[data-src]').dataset.src : '';
    sd.innerHTML='<span class="fb">'+esc(UI[SRC].inSent)+'</span>'+esc(src);
  }
  sheet.classList.add('open');
  w.classList.add('hit'); setTimeout(()=>w.classList.remove('hit'),700);
}
function hideSheet(){ sheet.classList.remove('open'); }

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const tb=e.target.closest('.trbtn');
  if(tb){ const t=tb.nextElementSibling; t.hidden=!t.hidden; return; }
  const w=e.target.closest('.w');
  if(w){ showDef(w); return; }
  if(!e.target.closest('#sheet') && !e.target.closest('select')) hideSheet();
});
document.getElementById('sx').addEventListener('click',hideSheet);
document.addEventListener('change',e=>{
  if(e.target.id==='sel-src'){ const old=SRC; SRC=e.target.value; if(SRC===TGT) TGT=old; fill(pageEl,cur); update(); }
  else if(e.target.id==='sel-tgt'){ const old=TGT; TGT=e.target.value; if(TGT===SRC) SRC=old; fill(pageEl,cur); update(); }
});
prevB.addEventListener('click',()=>go(cur-1));
nextB.addEventListener('click',()=>go(cur+1));
addEventListener('keydown',e=>{
  if(e.target.classList && e.target.classList.contains('w') && (e.key==='Enter'||e.key===' ')){
    e.preventDefault(); showDef(e.target); return;
  }
  if(e.target.tagName==='SELECT') return;
  if(e.key==='ArrowRight') go(cur+1);
  else if(e.key==='ArrowLeft') go(cur-1);
  else if(e.key==='Escape') hideSheet();
});
let tx=0,ty=0;
book.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
book.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>60 && Math.abs(dx)>1.6*Math.abs(dy)) go(cur+(dx<0?1:-1));
},{passive:true});

fill(pageEl,0); update();
