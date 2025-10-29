// script.js — Etsy Keywords Finder (UI + generator)
// NOTE: This uses client-side heuristics (demo search volume). For live volume integrate an API.

const seedEl = document.getElementById('seed');
const catEl = document.getElementById('category');
const countEl = document.getElementById('count');
const generateBtn = document.getElementById('generate');
const clearBtn = document.getElementById('clear');
const listEl = document.getElementById('list');
const resultsSub = document.getElementById('resultsSub');
const resultsHeading = document.getElementById('resultsHeading');
const countStat = document.getElementById('countStat');
const topEl = document.getElementById('top');
const statsBox = document.getElementById('stats');
const titleIdeasEl = document.getElementById('titleIdeas');
const tagsEl = document.getElementById('tags');
const copyAllBtn = document.getElementById('copyAll');
const exportCsvBtn = document.getElementById('exportCsv');
const themeBtn = document.getElementById('themeBtn');

let current = [];

/* ---------- small content pools (expandable) ---------- */
const modifiers = ['handmade','personalized','custom','vintage','minimal','boho','luxury','eco','gift','set','bulk','small','large','engraved'];
const materials = ['soy','resin','wood','ceramic','cotton','linen','leather','sterling silver','gold plated','glass'];
const intents = ['for','for kids','for women','for men','gift for','with','in'];
const occasions = ['wedding','birthday','anniversary','christmas','valentines','mother\'s day','baby shower'];
const extras = ['best','unique','trending','popular','top','cheap','premium'];

/* ---------- util ---------- */
const rand = arr => arr[Math.floor(Math.random()*arr.length)];
const uniq = arr => Array.from(new Set(arr));
const slug = s => (s||'').toLowerCase().trim();

/* ---------- generator ---------- */
function generateList(seedRaw, category, count) {
  const seed = slug(seedRaw);
  if(!seed) return [];

  const base = seed.split(/\s+/).filter(Boolean);
  let pool = [];

  // core variants
  pool.push(seed);
  modifiers.slice(0,10).forEach(m => { pool.push(`${m} ${seed}`); pool.push(`${seed} ${m}`); });
  materials.slice(0,8).forEach(m => { pool.push(`${seed} ${m}`); pool.push(`${m} ${seed}`); });
  intents.forEach(i => pool.push(`${seed} ${i}`));
  occasions.forEach(o => { pool.push(`${seed} for ${o}`); pool.push(`${o} ${seed}`); });
  extras.forEach(e => { pool.push(`${e} ${seed}`); pool.push(`${seed} ${e}`); });

  // templates
  const templates = [`set of ${seed}`, `${seed} set`, `personalized ${seed}`, `custom ${seed}`, `${seed} gift`, `mini ${seed}`, `${seed} for sale`];
  pool.push(...templates);

  // multi-word permutations
  if(base.length > 1) {
    pool.push(base.join(' '));
    pool.push(base.slice().reverse().join(' '));
    base.forEach(b => modifiers.slice(0,6).forEach(m => pool.push(`${m} ${b}`)));
  }

  // category combos
  if(category) pool.push(`${seed} ${slug(category)}`, `${slug(category)} ${seed}`);

  // generated expansions
  for(let i=0;i<200;i++){
    pool.push(`${rand(modifiers)} ${seed} ${rand(extras)}`);
    pool.push(`${rand(extras)} ${rand(materials)} ${seed}`);
  }

  // normalize
  pool = pool.map(s => s.replace(/\s+/g,' ').trim()).filter(Boolean);
  pool = uniq(pool);

  // expand to requested count if needed
  let expanded = pool.slice();
  let idx = 0;
  const adders = ['best','2025','new','sale','handmade'];
  while(expanded.length < count && idx < pool.length){
    expanded.push(`${pool[idx]} ${rand(adders)}`);
    idx++;
  }

  // shuffle and limit
  expanded = expanded.sort(()=>Math.random()-0.5).slice(0, Math.max(10, count));

  // map with heuristic score
  return expanded.map(k => {
    const len = k.split(' ').length;
    let opp = 50 + Math.min(30,(len-1)*7);
    if(materials.some(m=>k.includes(m))) opp += 6;
    if(intents.some(i=>k.includes(i))) opp += 5;
    if(occasions.some(o=>k.includes(o))) opp += 5;
    if(len <= 2) opp -= 12;
    opp = Math.max(5, Math.min(98, Math.round(opp + (Math.random()*10-5))));
    const cls = opp > 70 ? 'high' : opp > 45 ? 'med' : 'low';
    const estVol = Math.max(8, Math.round((100-opp) * (Math.random()*4 + 1)));
    return {keyword:k,opp,cls,estVol,len};
  });
}

/* ---------- UI rendering ---------- */
function render(items) {
  listEl.innerHTML = '';
  if(!items.length) { listEl.innerHTML = `<div class="muted">No suggestions</div>`; return; }

  items.forEach(it=>{
    const div = document.createElement('div'); div.className = 'item';
    div.innerHTML = `
      <div class="left">
        <div class="kword">${escapeHtml(it.keyword)}</div>
        <div class="meta">${it.estVol} est. • ${it.len} words</div>
      </div>
      <div class="right">
        <div class="pill ${it.cls}">${it.opp}</div>
        <div class="item-actions">
          <button class="btn small copy-btn">Copy</button>
          <button class="btn small ghost tag-btn">+ Tag</button>
        </div>
      </div>`;
    // copy
    div.querySelector('.copy-btn').addEventListener('click', ()=>{
      navigator.clipboard.writeText(it.keyword).then(()=> flash('Copied'));
    });
    // add tag
    div.querySelector('.tag-btn').addEventListener('click', ()=>{
      addTag(it.keyword);
    });
    listEl.appendChild(div);
  });
}

function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

function flash(msg){
  resultsSub.textContent = msg;
  setTimeout(()=> {
    resultsSub.textContent = `${current.length} suggestions generated`;
  }, 1200);
}

/* ---------- sidebar updates ---------- */
function updateSidebar(items){
  // titles
  const top = items.slice().sort((a,b)=>b.opp-a.opp).slice(0,6).map(i=> capitalize(i.keyword));
  titleIdeasEl.innerHTML = top.map(t=>`<div>• ${escapeHtml(t)}</div>`).join('');
  // tags (short keywords)
  const tags = uniq(items.slice().sort((a,b)=> a.len - b.len).slice(0,18).map(i=> i.keyword.split(' ').slice(0,3).join(' ')));
  tagsEl.innerHTML = tags.map(t=>`<span class="tag" role="button">${escapeHtml(t)}</span>`).join(' ');
  // tag click handlers
  Array.from(tagsEl.querySelectorAll('.tag')).forEach(el=>{
    el.addEventListener('click', ()=> {
      navigator.clipboard.writeText(el.textContent).then(()=> flash('Tag copied'));
    });
  });
}

/* ---------- helpers ---------- */
function capitalize(s){ return s.split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function addTag(k){
  const t = k.split(' ').slice(0,3).join(' ');
  // append to tags area if not exists
  const existing = Array.from(tagsEl.querySelectorAll('.tag')).map(x=>x.textContent);
  if(!existing.includes(t)){
    const span = document.createElement('span'); span.className='tag'; span.textContent=t;
    tagsEl.appendChild(span);
    span.addEventListener('click', ()=> { navigator.clipboard.writeText(t).then(()=> flash('Tag copied')); });
    flash('Tag added');
  } else flash('Tag exists');
}

/* ---------- events ---------- */
generateBtn.addEventListener('click', ()=>{
  const seed = seedEl.value.trim();
  if(!seed){ alert('Enter a seed keyword (e.g. "soy candle")'); return; }
  const cat = catEl.value;
  const count = Math.max(10, Math.min(500, parseInt(countEl.value) || 120));
  resultsHeading.textContent = `Suggestions for: "${seed}"`;
  resultsSub.textContent = 'Generating…';
  current = generateList(seed, cat, count);
  render(current);
  countStat.textContent = current.length;
  topEl.textContent = current.slice().sort((a,b)=>b.opp-a.opp)[0]?.keyword || '—';
  statsBox.classList.remove('hidden');
  resultsSub.textContent = `${current.length} suggestions generated`;
  updateSidebar(current);
});

clearBtn.addEventListener('click', ()=>{
  seedEl.value=''; catEl.value=''; countEl.value='120';
  current=[]; listEl.innerHTML=''; titleIdeasEl.innerHTML='No data yet'; tagsEl.innerHTML='—';
  resultsHeading.textContent='Suggestions'; resultsSub.textContent='No results yet — enter a seed and click Generate.'; statsBox.classList.add('hidden');
});

copyAllBtn.addEventListener('click', ()=>{
  if(!current.length){ alert('No suggestions to copy'); return; }
  const text = current.map(i=>i.keyword).join('\n');
  navigator.clipboard.writeText(text).then(()=> flash('All keywords copied'));
});

exportCsvBtn.addEventListener('click', ()=>{
  if(!current.length){ alert('No suggestions to export'); return; }
  const rows = [['keyword','opportunity','estVol','length']];
  current.forEach(i => rows.push([`"${i.keyword.replace(/"/g,'""')}"`,i.opp,i.estVol,i.len]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='etsy-keywords.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  flash('CSV exported');
});

/* theme toggle (persist) */
themeBtn.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  themeBtn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  try { localStorage.setItem('ekf-dark', document.body.classList.contains('dark') ? '1' : '0'); } catch(e){}
});
(function initTheme(){
  try {
    const saved = localStorage.getItem('ekf-dark') === '1';
    if(saved) { document.body.classList.add('dark'); themeBtn.textContent='☀️'; }
  } catch(e){}
})();

/* init */
(function init(){
  resultsSub.textContent = 'No results yet — enter a seed and click Generate.';
  titleIdeasEl.textContent = 'No data yet';
  tagsEl.textContent = '—';
})();
