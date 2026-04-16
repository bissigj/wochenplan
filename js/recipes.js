import { D } from './data.js';
import { saveRecipesDebounced, saveWeekNow } from './data.js';
import { CATS, AUFWAND, EINHEITEN } from './config.js';
import { fmtIng, srcHTML, toast } from './ui.js';
import { renderWeek } from './week.js';

export let expandedR = null;
export let rFilters = new Set();

export function renderRFilters() {
  document.getElementById('r-count').textContent = D.recipes.length + ' Rezepte';
  document.getElementById('r-filters').innerHTML = [...CATS, ...AUFWAND].map(f =>
    `<button class="pill ${rFilters.has(f) ? 'on' : ''}" onclick="toggleRF('${f}')">${f}</button>`
  ).join('');
}

export function toggleRF(f) {
  rFilters.has(f) ? rFilters.delete(f) : rFilters.add(f);
  renderRFilters();
  renderRecipes();
}

export function renderRecipes(searchQuery = '') {
  const el = document.getElementById('r-list');
  let vis = D.recipes;
  if (rFilters.size) {
    vis = D.recipes.filter(r => {
      const cf = [...rFilters].filter(f => CATS.includes(f));
      const af = [...rFilters].filter(f => AUFWAND.includes(f));
      return (cf.length === 0 || cf.includes(r.cat)) && (af.length === 0 || af.includes(r.auf));
    });
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    vis = vis.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.cat.toLowerCase().includes(q) ||
      (r.ings || []).some(ing => ing.n.toLowerCase().includes(q))
    );
  }
  if (!vis.length) { el.innerHTML = '<div class="empty">Keine Rezepte gefunden.</div>'; return; }
  el.innerHTML = vis.map(r => {
    const isOpen = expandedR === r.id;
    return `<div class="card">
      <div class="recipe-row">
        <span class="recipe-name-col">${r.name}</span>
        <span class="recipe-meta">${r.time ? r.time + ' min' : ''}</span>
        <span class="tag tag-${r.cat}">${r.cat}</span>
        <span class="tag tag-${r.auf}">${r.auf}</span>
        <button class="expand-btn" onclick="toggleER(${r.id})">${isOpen ? '▲' : '▼'}</button>
        <button class="btn btn-d btn-sm" onclick="delR(${r.id})">×</button>
      </div>
      ${isOpen ? `<div class="recipe-detail"><div class="detail-grid">
        <div>
          <div class="section-title">Eckdaten</div>
          <div class="row" style="gap:8px;margin-bottom:10px">
            <div style="flex:1"><span class="label">Kochzeit (min)</span>
              <input type="number" value="${r.time || ''}" min="1" max="300" style="width:80px" onchange="updR(${r.id},'time',+this.value)" /></div>
            <div style="flex:1"><span class="label">Portionen</span>
              <input type="number" value="${r.portions || 2}" min="1" max="20" style="width:80px" onchange="updR(${r.id},'portions',+this.value)" /></div>
          </div>
          <div class="row" style="gap:8px;margin-bottom:10px">
            <div style="flex:1"><span class="label">Kategorie</span>
              <select class="inline-select" style="width:100%" onchange="updR(${r.id},'cat',this.value)">
                ${CATS.map(c => `<option value="${c}" ${r.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select></div>
            <div style="flex:1"><span class="label">Aufwand</span>
              <select class="inline-select" style="width:100%" onchange="updR(${r.id},'auf',this.value)">
                ${AUFWAND.map(a => `<option value="${a}" ${r.auf === a ? 'selected' : ''}>${a}</option>`).join('')}
              </select></div>
          </div>
          <div class="section-title">Zutaten (für ${r.portions || 2} Port.)</div>
          <div class="ing-chips">${(r.ings || []).map((ing, i) => `<span class="ing-chip">${fmtIng(ing)}<button class="xbtn" onclick="delIng(${r.id},${i})">×</button></span>`).join('')}</div>
          <div class="row" style="gap:6px">
            <input type="number" id="im-${r.id}" placeholder="Menge" min="0.1" step="0.1" style="width:70px" />
            <select id="iu-${r.id}" style="width:80px">${EINHEITEN.map(u => `<option>${u}</option>`).join('')}</select>
            <input type="text" id="in-${r.id}" placeholder="Zutatname" style="flex:1" onkeydown="if(event.key==='Enter')addIng(${r.id})" />
            <button class="btn btn-sm" onclick="addIng(${r.id})">+</button>
          </div>
        </div>
        <div>
          <div class="section-title">Zubereitung</div>
          <ol class="steps-list" id="steps-${r.id}">${(r.steps || []).map((s, i) => `<li class="step-item" data-idx="${i}"><span class="drag-handle">⠿</span><span class="step-num">${i + 1}</span><span class="step-text">${s}</span><button class="xbtn" onclick="delStep(${r.id},${i})" style="margin-top:3px">×</button></li>`).join('')}</ol>
          <div class="row" style="gap:6px">
            <input type="text" id="st-${r.id}" placeholder="Schritt hinzufügen…" style="flex:1" onkeydown="if(event.key==='Enter')addStep(${r.id})" />
            <button class="btn btn-sm" onclick="addStep(${r.id})">+</button>
          </div>
          <div class="section-title" style="margin-top:12px">Quelle</div>
          <div class="row" style="gap:6px;margin-bottom:8px">
            <button class="pill ${!r.src || r.src.type === 'url' ? 'on' : ''}" onclick="setSrcType(${r.id},'url')">🔗 URL</button>
            <button class="pill ${r.src && r.src.type === 'buch' ? 'on' : ''}" onclick="setSrcType(${r.id},'buch')">📖 Buch</button>
          </div>
          ${(!r.src || r.src.type === 'url')
            ? `<input type="url" value="${r.src?.val || ''}" placeholder="https://…" onchange="updSrc(${r.id},'val',this.value)" />`
            : `<input type="text" value="${r.src?.val || ''}" placeholder="Kochbuchname" style="margin-bottom:6px" onchange="updSrc(${r.id},'val',this.value)" />
               <input type="text" value="${r.src?.seite || ''}" placeholder="Seite (optional)" onchange="updSrc(${r.id},'seite',this.value)" />`}
          <div style="margin-top:6px">${srcHTML(r.src)}</div>
        </div>
      </div></div>` : ''}
    </div>`;
  }).join('');
}

export function toggleER(id) {
  expandedR = expandedR === id ? null : id;
  renderRecipes();
  initSortable();
}

function initSortable() {
  if (expandedR === null) return;
  const listEl = document.getElementById('steps-' + expandedR);
  if (!listEl || typeof Sortable === 'undefined') return;
  Sortable.create(listEl, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      const r = D.recipes.find(r => r.id === expandedR);
      if (!r) return;
      const moved = r.steps.splice(evt.oldIndex, 1)[0];
      r.steps.splice(evt.newIndex, 0, moved);
      listEl.querySelectorAll('.step-num').forEach((el, i) => el.textContent = i + 1);
      await saveRecipesDebounced();
    }
  });
}

export async function addRecipe() {
  const n = document.getElementById('new-name').value.trim();
  if (!n) return;
  D.recipes.push({
    id: D.nextId++,
    name: n,
    cat: document.getElementById('new-cat').value,
    auf: document.getElementById('new-auf').value,
    time: null, portions: 2, ings: [], steps: [], src: null
  });
  document.getElementById('new-name').value = '';
  await saveRecipesDebounced();
  renderRFilters();
  renderRecipes();
}

export async function delR(id) {
  D.recipes = D.recipes.filter(r => r.id !== id);
  D.weekPlan.days = (D.weekPlan.days || []).filter(d => d.recipeId !== id);
  await saveRecipesDebounced();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function addIng(id) {
  const m = parseFloat(document.getElementById('im-' + id).value);
  const u = document.getElementById('iu-' + id).value;
  const n = document.getElementById('in-' + id).value.trim();
  if (!n || isNaN(m)) return;
  D.recipes.find(r => r.id === id).ings.push({ m, u, n });
  document.getElementById('im-' + id).value = '';
  document.getElementById('in-' + id).value = '';
  await saveRecipesDebounced();
  renderRecipes();
}

export async function delIng(id, i) {
  D.recipes.find(r => r.id === id).ings.splice(i, 1);
  await saveRecipesDebounced();
  renderRecipes();
}

export async function addStep(id) {
  const inp = document.getElementById('st-' + id);
  const v = inp.value.trim();
  if (!v) return;
  D.recipes.find(r => r.id === id).steps.push(v);
  inp.value = '';
  await saveRecipesDebounced();
  renderRecipes();
}

export async function delStep(id, i) {
  D.recipes.find(r => r.id === id).steps.splice(i, 1);
  await saveRecipesDebounced();
  renderRecipes();
}

export async function updR(id, key, val) {
  D.recipes.find(r => r.id === id)[key] = val;
  await saveRecipesDebounced();
}

export async function setSrcType(id, type) {
  D.recipes.find(r => r.id === id).src = { type, val: '', seite: '' };
  await saveRecipesDebounced();
  renderRecipes();
}

export async function updSrc(id, key, val) {
  const r = D.recipes.find(r => r.id === id);
  if (!r.src) r.src = { type: 'url', val: '', seite: '' };
  r.src[key] = val;
  await saveRecipesDebounced();
  renderRecipes();
}

// ── Quick Entry ───────────────────────────────────────────────────────────────
export function openQE() {
  document.getElementById('qe-name').value = '';
  document.getElementById('qe-ings').value = '';
  document.getElementById('qe-steps').value = '';
  document.getElementById('qe-time').value = '';
  document.getElementById('qe-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('qe-name').focus(), 100);
}

export function closeQE() {
  document.getElementById('qe-modal').style.display = 'none';
}

export function parseIngredientLine(line) {
  line = line.trim();
  if (!line) return null;

  // --- 1. Normalisierung ---
  const FRACTIONS = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125 };
  for (const [sym, val] of Object.entries(FRACTIONS)) {
    line = line.replace(new RegExp('(\\d+)\\s*' + sym, 'g'), (_, n) => String(parseFloat(n) + val));
    line = line.replace(new RegExp(sym, 'g'), String(val));
  }

  // "125g" -> "125 g"
  line = line.replace(/(\d)([a-zA-Z]+)/g, '$1 $2');

  // "2x" -> "2 x"
  line = line.replace(/(\d)\s*[xX×]\s*/g, '$1 x ');

  const UNITS = [
    'kg', 'g', 'mg',
    'l', 'dl', 'cl', 'ml',
    'EL', 'TL',
    'Prise', 'Bund', 'Dose', 'Pck\\.', 'Stück'
  ];
  const unitRegex = new RegExp(`^(${UNITS.join('|')})\\b`, 'i');

  // --- 2. Multiplikation ---
  let m = line.match(/^([0-9.]+)\s*x\s+(.+)$/i);
  if (m) {
    const factor = parseFloat(m[1]);
    let rest = m[2].trim();

    // zweite Zahl + optionale Einheit
    let m2 = rest.match(/^([0-9.]+)\s*([a-zA-Z]+)?\s+(.+)$/);
    if (m2) {
      const base = parseFloat(m2[1]);
      const unit = m2[2] || 'Stück';
      const name = m2[3].trim();

      return {
        m: Math.round(factor * base * 100) / 100,
        u: normalizeUnit(unit),
        n: name
      };
    }
  }

  // --- 3. Standard: Zahl + Einheit ---
  m = line.match(/^([0-9.]+)\s+([a-zA-Z.]+)\s+(.+)$/);
  if (m) {
    const amount = parseFloat(m[1]);
    const unit = m[2];
    const name = m[3].trim();

    if (isKnownUnit(unit, UNITS)) {
      return { m: amount, u: normalizeUnit(unit), n: name };
    }
  }

  // --- 4. Zahl + Name ---
  m = line.match(/^([0-9.]+)\s+(.+)$/);
  if (m) {
    return { m: parseFloat(m[1]), u: 'Stück', n: m[2].trim() };
  }

  // --- 5. Fallback ---
  return { m: 1, u: 'Stück', n: line };
}


// Helpers
function isKnownUnit(u, list) {
  return list.some(x => new RegExp(`^${x}$`, 'i').test(u));
}

function normalizeUnit(u) {
  return u.replace('.', '');
}

export async function saveQE() {
  const name = document.getElementById('qe-name').value.trim();
  if (!name) { document.getElementById('qe-name').focus(); return; }
  const ingLines = document.getElementById('qe-ings').value.split('\n').filter(l => l.trim());
  const stepsText = document.getElementById('qe-steps').value.trim();
  const ings = ingLines.map(parseIngredientLine).filter(Boolean);
  const steps = stepsText ? [stepsText] : [];
  const time = parseInt(document.getElementById('qe-time').value) || null;
  D.recipes.push({ id: D.nextId++, name, cat: document.getElementById('qe-cat').value, auf: document.getElementById('qe-auf').value, time, portions: 2, ings, steps, src: null });
  closeQE();
  await saveRecipesDebounced();
  renderRFilters();
  renderRecipes();
  toast('Rezept hinzugefügt');
}
