import { D } from './data.js';
import { parseIngredient } from 'https://esm.sh/@jlucaspains/sharp-recipe-parser@1.3.6';
import { saveRecipesDebounced, saveWeekNow } from './data.js';
import { sbUploadImage, sbDeleteImage } from './db.js';
import { CATS, AUFWAND, EINHEITEN } from './config.js';
import { fmtIng, srcHTML, toast } from './ui.js';
import { renderWeek } from './week.js';

export let expandedR = null;
export let rFilters = new Set();
export let sortOrder = 'name'; // 'name' | 'cat' | 'time'

window.undoDelR = () => { if (window._undoDelR) window._undoDelR(); };

export function renderRFilters() {
  document.getElementById('r-count').textContent = D.recipes.length + ' Rezepte';
  document.getElementById('r-filters').innerHTML = [...CATS, ...AUFWAND].map(f =>
    `<button class="pill tag-${f} ${rFilters.has(f) ? 'on' : ''}" onclick="toggleRF('${f}')">${f}</button>`
  ).join('');
}

function rerender() {
  const q = document.getElementById('recipe-search')?.value || '';
  renderRecipes(q);
}

export function toggleRF(f) {
  rFilters.has(f) ? rFilters.delete(f) : rFilters.add(f);
  renderRFilters();
  renderRecipes();
}

export function setSortOrder(v) {
  sortOrder = v;
  rerender();
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
  if (sortOrder === 'name') vis.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortOrder === 'cat') vis.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  else if (sortOrder === 'time') vis.sort((a, b) => (a.time || 999) - (b.time || 999));
  
  if (!vis.length) { el.innerHTML = '<div class="empty">Keine Rezepte gefunden.</div>'; return; }
  el.innerHTML = vis.map(r => {
    const isOpen = expandedR === r.id;
    return `<div class="card">
      iv class="recipe-row" onclick="toggleER(${r.id})" style="cursor:pointer">
        <span class="recipe-name-col">${r.name}</span>
        <span class="recipe-meta">${r.time ? r.time + ' min' : ''}</span>
        <span class="tag tag-${r.cat}">${r.cat}</span>
        <span class="tag tag-${r.auf}">${r.auf}</span>
        <button class="expand-btn" onclick="toggleER(${r.id})">${isOpen ? '▲' : '▼'}</button>

        <button class="btn btn-d btn-sm" onclick="event.stopPropagation();delR(${r.id})" style="margin-left:8px;border-left:1px solid var(--bd2);padding-left:12px">×</button>
      </div>
      ${isOpen ? `<div class="recipe-detail">
      ${r.img ? `<div class="recipe-img" style="background-image:url('${r.img}');margin-bottom:1rem"></div>` : ''}
      <div class="detail-grid">
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
          <div class="ing-list">${(r.ings || []).map((ing, i) => `<div class="ing-row"><span class="ing-amt">${fmtIng(ing)}</span><button class="xbtn" onclick="delIng(${r.id},${i})">×</button></div>`).join('')}</div>
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
          <div class="section-title" style="margin-top:12px">Foto</div>
          <div id="img-preview-${r.id}" style="width:100%;height:140px;background-size:cover;background-position:center;border-radius:var(--rs);margin-bottom:8px;${r.img ? `background-image:url('${r.img}')` : 'display:none'}"></div>
          <div class="img-upload-wrap">
            <label class="btn btn-sm" style="cursor:pointer">
              <span class="img-upload-label">${r.img ? 'Foto ersetzen' : '+ Foto hochladen'}</span>
              <input type="file" accept="image/*,image/heic" style="display:none" onchange="uploadRecipeImage(${r.id},this)" />
            </label>
            ${r.img ? `<button class="btn btn-d btn-sm" onclick="removeRecipeImage(${r.id})">Foto entfernen</button>` : ''}
          </div>
        </div>
        <div class="row" style="margin-top:12px">
        <button class="btn btn-sm" onclick="exportRecipePDF(${r.id})">↓ PDF exportieren</button>
        </div>
      </div></div>` : ''}
    </div>`;
  }).join('');
}

export function toggleER(id) {
  expandedR = expandedR === id ? null : id;
  rerender();
  initSortable();
}

export async function removeRecipeImage(id) {
  const r = D.recipes.find(r => r.id === id);
  if (r.img) await sbDeleteImage(r.img);
  r.img = null;
  await saveRecipesDebounced();
  rerender();
  toast('Foto entfernt');
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
  rerender();
}

export async function delR(id) {
  const deleted = D.recipes.find(r => r.id === id);
  if (!confirm(`"${deleted.name}" wirklich löschen?`)) return;
  const deletedDays = (D.weekPlan.days || []).filter(d => d.recipeId === id);
  // Delete image from storage if exists
  if (deleted && deleted.img) await sbDeleteImage(deleted.img);
  D.recipes = D.recipes.filter(r => r.id !== id);
  D.weekPlan.days = (D.weekPlan.days || []).filter(d => d.recipeId !== id);
  await saveRecipesDebounced();
  renderRFilters();
  rerender();
  renderWeek();
  // Undo Toast
  let undone = false;
  const toastEl = document.getElementById('toast');
  toastEl.innerHTML = `"${deleted.name}" gelöscht. <span style="text-decoration:underline;cursor:pointer" onclick="undoDelR()">Rückgängig</span>`;
  toastEl.classList.add('show');
  window._undoDelR = async () => {
    if (undone) return;
    undone = true;
    D.recipes.push(deleted);
    deletedDays.forEach(d => D.weekPlan.days.push(d));
    await saveRecipesDebounced();
    renderRFilters();
    rerender();
    renderWeek();
    toast('"' + deleted.name + '" wiederhergestellt');
  };
  setTimeout(() => { toastEl.classList.remove('show'); window._undoDelR = null; }, 5000);
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
  rerender();
}

export async function delIng(id, i) {
  D.recipes.find(r => r.id === id).ings.splice(i, 1);
  await saveRecipesDebounced();
  rerender();
}

export async function addStep(id) {
  const inp = document.getElementById('st-' + id);
  const v = inp.value.trim();
  if (!v) return;
  D.recipes.find(r => r.id === id).steps.push(v);
  inp.value = '';
  await saveRecipesDebounced();
  rerender();
}

export async function delStep(id, i) {
  D.recipes.find(r => r.id === id).steps.splice(i, 1);
  await saveRecipesDebounced();
  rerender();
}

export async function updR(id, key, val) {
  D.recipes.find(r => r.id === id)[key] = val;
  await saveRecipesDebounced();
}

export async function uploadRecipeImage(id, input) {
  const file = input.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast('Nur Bilder erlaubt (JPG, PNG, HEIC)');
    return;
  }

  // Show preview immediately
  const previewUrl = URL.createObjectURL(file);
  const previewEl = document.getElementById('img-preview-' + id);
  if (previewEl) {
    previewEl.style.backgroundImage = `url('${previewUrl}')`;
    previewEl.style.display = 'block';
  }

  const label = input.parentElement.querySelector('.img-upload-label');
  if (label) label.textContent = 'Wird hochgeladen…';

  const url = await sbUploadImage(file);
  URL.revokeObjectURL(previewUrl);

  if (url) {
    D.recipes.find(r => r.id === id).img = url;
    await saveRecipesDebounced();
    rerender();
    toast('Bild gespeichert');
  } else {
    if (label) label.textContent = 'Fehler beim Hochladen';
    if (previewEl) previewEl.style.display = 'none';
  }
}

export async function setSrcType(id, type) {
  D.recipes.find(r => r.id === id).src = { type, val: '', seite: '' };
  await saveRecipesDebounced();
  rerender();
}

export async function updSrc(id, key, val) {
  const r = D.recipes.find(r => r.id === id);
  if (!r.src) r.src = { type: 'url', val: '', seite: '' };
  r.src[key] = val;
  await saveRecipesDebounced();
  rerender();
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
  try {
    const r = parseIngredient(line, 'en', {
      additionalUOMs: {
        dl:     { short: 'dl',     plural: 'dl',      versions: ['dl'] },
        cl:     { short: 'cl',     plural: 'cl',      versions: ['cl'] },
        EL:     { short: 'EL',     plural: 'EL',      versions: ['el', 'EL'] },
        TL:     { short: 'TL',     plural: 'TL',      versions: ['tl', 'TL'] },
        Prise:  { short: 'Prise',  plural: 'Prisen',  versions: ['prise', 'prisen'] },
        Bund:   { short: 'Bund',   plural: 'Bund',    versions: ['bund'] },
        Dose:   { short: 'Dose',   plural: 'Dosen',   versions: ['dose', 'dosen'] },
        Pck:    { short: 'Pck.',   plural: 'Pck.',    versions: ['pck', 'pck.', 'päckchen'] },
        Stück:  { short: 'Stück',  plural: 'Stück',   versions: ['stück', 'stk', 'stk.'] },
        Becher:   { short: 'Becher',  plural: 'Becher',   versions: ['becher'] },
        Glas:     { short: 'Glas',    plural: 'Gläser',   versions: ['glas', 'gläser'] },
        Zweig:    { short: 'Zweig',   plural: 'Zweige',   versions: ['zweig', 'zweige'] },
        Blatt:    { short: 'Blatt',   plural: 'Blätter',  versions: ['blatt', 'blätter'] },
        Zehe:     { short: 'Zehe',    plural: 'Zehen',    versions: ['zehe', 'zehen'] },
        Scheibe:  { short: 'Scheibe', plural: 'Scheiben', versions: ['scheibe', 'scheiben'] },
        Handvoll: { short: 'Handvoll',plural: 'Handvoll', versions: ['handvoll'] },
        Messerspitze: { short: 'Msp.', plural: 'Msp.',   versions: ['msp', 'msp.', 'messerspitze'] },
        Würfel:   { short: 'Würfel',  plural: 'Würfel',   versions: ['würfel'] },
        Knolle:   { short: 'Knolle',  plural: 'Knollen',  versions: ['knolle', 'knollen'] },
        Kopf:     { short: 'Kopf',    plural: 'Köpfe',    versions: ['kopf', 'köpfe'] },
        Stange:   { short: 'Stange',  plural: 'Stangen',  versions: ['stange', 'stangen'] },
        Tasse:    { short: 'Tasse',   plural: 'Tassen',   versions: ['tasse', 'tassen'] },
        Pkg:      { short: 'Pkg.',    plural: 'Pkg.',      versions: ['pkg', 'pkg.', 'packung', 'packungen'] },
      }
    });
    if (r && r.ingredient) {
      return {
        m: r.quantity > 0 ? r.quantity : 0,
        u: r.unitText || '',
        n: r.ingredient.trim()
      };
    }
  } catch(e) {}
  return {m: 1, u: '', n: line};
}

function splitSteps(text) {
  if (!text.trim()) return [];
  const numbered = text.split(/^\s*\d+[.)]\s+/m).filter(s => s.trim());
  if (numbered.length > 1) return numbered.map(s => s.trim());
  const lines = text.split('\n').filter(s => s.trim());
  if (lines.length > 1) return lines.map(s => s.trim());
  return [text.trim()];
}

export async function saveQE() {
  const name = document.getElementById('qe-name').value.trim();
  if (!name) { document.getElementById('qe-name').focus(); return; }
  const ingLines = document.getElementById('qe-ings').value.split('\n').filter(l => l.trim());
  const stepsText = document.getElementById('qe-steps').value.trim();
  const ings = ingLines.map(parseIngredientLine).filter(Boolean);
  const steps = splitSteps(stepsText);
  const time = parseInt(document.getElementById('qe-time').value) || null;
  const portions = parseInt(document.getElementById('qe-portions').value) || 2;
  D.recipes.push({ id: D.nextId++, name, cat: document.getElementById('qe-cat').value, auf: document.getElementById('qe-auf').value, time, portions, ings, steps, src: null });
  closeQE();
  await saveRecipesDebounced();
  renderRFilters();
  rerender();
  toast('Rezept hinzugefügt');
}
