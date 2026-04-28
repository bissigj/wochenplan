import { D, getCatLabel, getAufLabel, tagStyle, saveRecipesDebounced, saveRecipeNow, deleteRecipeFromDB, saveWeekNow } from './data.js';
import { parseIngredient } from 'https://esm.sh/@jlucaspains/sharp-recipe-parser@1.3.6';
import { sbUploadImage, sbDeleteImage } from './db.js';
import { fmtIng, srcHTML, toast, esc } from './ui.js';
import { renderWeek } from './week.js';

export let expandedR = null;
export let rFilters = new Set();
export let sortOrder = 'name';
export function renderRFilters() {
  // Kategorien alphabetisch → horizontal scrollbare Pills
  const cats = [...D.settings.cats].sort((a, b) => a.label.localeCompare(b.label, 'de'));
  document.getElementById('r-filters').innerHTML = cats.map(c =>
    `<button class="pill ${rFilters.has(c.id) ? 'on' : ''}" style="${tagStyle(c.id)}"
      onclick="toggleRF('${esc(c.id)}')">${esc(c.label)}</button>`
  ).join('');

  // Aufwand Segment-Control
  const aufEl = document.getElementById('r-auf-segment');
  if (aufEl) {
    const hasAufFilter = D.settings.aufwand.some(a => rFilters.has(a.id));
    aufEl.innerHTML =
      `<button class="segment ${!hasAufFilter ? 'on' : ''}" onclick="clearAufFilter()">Alle</button>` +
      D.settings.aufwand.map(a =>
        `<button class="segment ${rFilters.has(a.id) ? 'on' : ''}"
          onclick="toggleRF('${esc(a.id)}')">${esc(a.label)}</button>`
      ).join('');
  }
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
  let vis = [...D.recipes];
  if (rFilters.size) {
    const catIds = D.settings.cats.map(c => c.id);
    const aufIds = D.settings.aufwand.map(a => a.id);
    vis = vis.filter(r => {
      const cf = [...rFilters].filter(f => catIds.includes(f));
      const af = [...rFilters].filter(f => aufIds.includes(f));
      return (cf.length === 0 || cf.includes(r.cat)) && (af.length === 0 || af.includes(r.auf));
    });
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    vis = vis.filter(r =>
      r.name.toLowerCase().includes(q) ||
      getCatLabel(r.cat).toLowerCase().includes(q) ||
      getAufLabel(r.auf).toLowerCase().includes(q) ||
      (r.ings || []).some(ing => (ing.n || '').toLowerCase().includes(q))
    );
  }
  if (sortOrder === 'name') vis.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortOrder === 'cat') vis.sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.name.localeCompare(b.name));
  else if (sortOrder === 'time') vis.sort((a, b) => (a.time || 999) - (b.time || 999));

  if (!vis.length) {
    const isSearch = searchQuery.length > 0 || rFilters.size > 0;
    el.innerHTML = isSearch
      ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Keine Treffer</div><div class="empty-state-sub">Versuche einen anderen Suchbegriff oder Filter.</div></div>'
      : '<div class="empty-state"><div class="empty-state-icon">🍳</div><div class="empty-state-title">Noch keine Rezepte</div><div class="empty-state-sub">Tippe auf + um dein erstes Rezept hinzuzufügen.</div></div>';
    return;
  }

  const einheiten = D.settings.einheiten || [];

  el.innerHTML = vis.map(r => {
    const isOpen = expandedR === r.id;
    return `<div class="card recipe-card">

      <!-- ── Zusammengeklappte Zeile ── -->
      <div class="recipe-row" onclick="toggleER(${r.id})" style="cursor:pointer">
        <span class="recipe-name-col">${esc(r.name)}</span>
        <span class="recipe-meta">${r.time ? r.time + ' min' : ''}</span>
        <span class="tag" style="${tagStyle(r.cat)}">${esc(getCatLabel(r.cat))}</span>
        <span class="tag" style="${tagStyle(r.auf)}">${esc(getAufLabel(r.auf))}</span>
        <button class="xbtn" onclick="event.stopPropagation();delR(${r.id})"
          style="margin-left:6px;padding:4px 6px;font-size:16px;opacity:0.4"
          onmouseover="this.style.opacity=1;this.style.color='var(--red)'"
          onmouseout="this.style.opacity=0.4;this.style.color=''">×</button>
      </div>

      ${isOpen ? `
      <!-- ── Aufgeklapptes Detail ── -->
      <div class="recipe-detail">

        <!-- Bild als Header mit Overlay -->
        <div class="rd-img-header" style="${r.img ? `background-image:url('${esc(r.img)}')` : 'background:var(--bg3)'}">
          <div class="rd-img-overlay">
            <div class="rd-img-meta">
              <span class="tag" style="${tagStyle(r.cat)}">${esc(getCatLabel(r.cat))}</span>
              <span class="tag" style="${tagStyle(r.auf)}">${esc(getAufLabel(r.auf))}</span>
              ${r.time ? `<span class="rd-chip">${r.time} min</span>` : ''}
              <span class="rd-chip">${r.portions || 2} Port.</span>
            </div>
            <div class="rd-img-actions">
              <label class="btn btn--sm rd-img-btn" style="cursor:pointer">
                <span class="img-upload-label">${r.img ? 'Foto ersetzen' : '+ Foto'}</span>
                <input type="file" accept="image/*,image/heic" style="display:none" onchange="uploadRecipeImage(${r.id},this)" />
              </label>
              ${r.img ? `<button class="btn btn--sm rd-img-btn btn--danger" onclick="removeRecipeImage(${r.id})">Entfernen</button>` : ''}
            </div>
          </div>
        </div>

        <!-- Name -->
        <div class="rd-name-row">
          <input type="text" class="rd-name-input" value="${esc(r.name)}"
            onchange="updR(${r.id},'name',this.value);this.closest('.recipe-card').querySelector('.recipe-name-col').textContent=this.value" />
        </div>

        <!-- Eckdaten: 4er-Zeile -->
        <div class="rd-meta-row">
          <div class="rd-meta-cell">
            <span class="rd-label">Kategorie</span>
            <select class="inline-select" onchange="updR(${r.id},'cat',this.value)">
              ${D.settings.cats.map(c => `<option value="${esc(c.id)}" ${r.cat === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
            </select>
          </div>
          <div class="rd-meta-cell">
            <span class="rd-label">Aufwand</span>
            <select class="inline-select" onchange="updR(${r.id},'auf',this.value)">
              ${D.settings.aufwand.map(a => `<option value="${esc(a.id)}" ${r.auf === a.id ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}
            </select>
          </div>
          <div class="rd-meta-cell">
            <span class="rd-label">Zeit (min)</span>
            <input type="number" value="${r.time || ''}" min="1" max="300" style="width:100%" onchange="updR(${r.id},'time',+this.value)" />
          </div>
          <div class="rd-meta-cell">
            <span class="rd-label">Portionen</span>
            <input type="number" value="${r.portions || 2}" min="1" max="20" style="width:100%" onchange="updR(${r.id},'portions',+this.value)" />
          </div>
        </div>

        <div class="rd-divider"></div>

        <!-- Zutaten | Zubereitung -->
        <div class="rd-body">

          <!-- Zutaten -->
          <div class="rd-col rd-col-ings">
            <div class="rd-col-title">Zutaten · ${r.portions || 2} Port.</div>
            <div class="rd-ing-list">
              ${(r.ings || []).map((ing, i) => {
                const m = ing.m > 0 ? String(+ing.m.toFixed(2)).replace('.', ',') : '';
                const qty = [m, esc(ing.u || '')].filter(Boolean).join('\u202f');
                return `
                <div class="rd-ing-row">
                  <span class="rd-ing-qty">${qty || '—'}</span>
                  <span class="rd-ing-name">${esc(ing.n || '')}</span>
                  <button class="xbtn" onclick="delIng(${r.id},${i})">×</button>
                </div>`;
              }).join('')}
            </div>
            <div class="rd-add-row">
              <input type="number" id="im-${r.id}" placeholder="Menge" step="any" min="0" class="rd-add-qty" />
              <select id="iu-${r.id}" class="inline-select rd-add-unit">
                ${einheiten.map(e => `<option>${esc(e)}</option>`).join('')}
              </select>
              <input type="text" id="in-${r.id}" placeholder="Zutat" class="rd-add-name"
                onkeydown="if(event.key==='Enter')addIng(${r.id})" />
              <button class="btn btn--sm" onclick="addIng(${r.id})">+</button>
            </div>
          </div>

          <!-- Zubereitung -->
          <div class="rd-col rd-col-steps">
            <div class="rd-col-title">Zubereitung</div>
            <ul class="steps-list" id="steps-${r.id}">
              ${(r.steps || []).map((s, i) => `
                <li class="step-item" data-id="${r.id}" data-i="${i}">
                  <span class="drag-handle">⠿</span>
                  <span class="step-num">${i + 1}</span>
                  <span class="step-text">${esc(s)}</span>
                  <button class="xbtn" onclick="delStep(${r.id},${i})">×</button>
                </li>`).join('')}
            </ul>
            <div class="rd-add-row">
              <input type="text" id="st-${r.id}" placeholder="Neuer Schritt…" class="rd-add-step"
                onkeydown="if(event.key==='Enter')addStep(${r.id})" />
              <button class="btn btn--sm" onclick="addStep(${r.id})">+</button>
            </div>
          </div>
        </div>

        <div class="rd-divider"></div>

        <!-- Quelle + Sichtbarkeit nebeneinander -->
        <div class="rd-footer">
          <div class="rd-footer-cell">
            <div class="rd-label" style="margin-bottom:6px">Quelle</div>
            ${r.src && r.src.val
              ? /* Quelle gesetzt: Read-only Anzeige + Ändern-Button */ `
                <div class="rd-src-display">
                  ${srcHTML(r.src)}
                  <button class="btn btn--sm btn--ghost" style="margin-left:var(--s-4);flex-shrink:0"
                    onclick="openSrcEdit(${r.id})">Ändern</button>
                </div>
                <div class="rd-src-edit-panel" id="src-edit-${r.id}" style="display:none;margin-top:10px">
                  <div class="pills" style="gap:6px;margin-bottom:8px">
                    <button class="pill ${r.src.type === 'url' ? 'on' : ''}" onclick="setSrcType(${r.id},'url')">🔗 URL</button>
                    <button class="pill ${r.src.type === 'buch' ? 'on' : ''}" onclick="setSrcType(${r.id},'buch')">📖 Buch</button>
                  </div>
                  ${r.src.type === 'url'
                    ? `<input type="url" value="${esc(r.src.val)}" placeholder="https://…" onchange="updSrc(${r.id},'val',this.value)" />`
                    : `<input type="text" value="${esc(r.src.val)}" placeholder="Kochbuchname" style="margin-bottom:6px" onchange="updSrc(${r.id},'val',this.value)" />
                       <input type="text" value="${esc(r.src.seite||'')}" placeholder="Seite (optional)" onchange="updSrc(${r.id},'seite',this.value)" />`}
                </div>`
              : /* Kein Wert: direkt Eingabe */ `
                <div class="pills" style="gap:6px;margin-bottom:8px">
                  <button class="pill ${!r.src || r.src.type === 'url' ? 'on' : ''}" onclick="setSrcType(${r.id},'url')">🔗 URL</button>
                  <button class="pill ${r.src && r.src.type === 'buch' ? 'on' : ''}" onclick="setSrcType(${r.id},'buch')">📖 Buch</button>
                </div>
                ${(!r.src || r.src.type === 'url')
                  ? `<input type="url" value="" placeholder="https://…" onchange="updSrc(${r.id},'val',this.value)" />`
                  : `<input type="text" value="" placeholder="Kochbuchname" style="margin-bottom:6px" onchange="updSrc(${r.id},'val',this.value)" />
                     <input type="text" value="" placeholder="Seite (optional)" onchange="updSrc(${r.id},'seite',this.value)" />`}`}
          </div>
          <div class="rd-footer-cell" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px">
            <div class="rd-label">Sichtbarkeit</div>
            <button class="btn btn--sm ${r.public === false ? 'btn-private' : 'btn-public'}"
              onclick="togglePublic(${r.id})">
              ${r.public === false ? '🔒 Privat' : '👁 Öffentlich'}
            </button>
          </div>
        </div>

        <!-- PDF -->
        <div style="padding:10px var(--s-6) var(--s-5)">
          <button class="btn btn--sm" onclick="exportRecipePDF(${r.id})">↓ PDF exportieren</button>
        </div>

      </div>` : ''}
    </div>`;
  }).join('');
}

export function toggleER(id) {
  expandedR = expandedR === id ? null : id;
  rerender();
}

export async function delR(id) {
  const idx = D.recipes.findIndex(r => r.id === id);
  if (idx < 0) return;
  const [removed] = D.recipes.splice(idx, 1);
  rerender();
  let undone = false;
  window._undoDelR = async () => {
    if (undone) return;
    undone = true;
    D.recipes.splice(idx, 0, removed);
    await saveRecipeNow(removed);
    rerender();
    toast('Rezept wiederhergestellt');
  };
  toast(`"${removed.name}" gelöscht · <a onclick="undoDelR()" style="cursor:pointer;text-decoration:underline">Rückgängig</a>`);
  setTimeout(async () => { if (!undone) await deleteRecipeFromDB(removed); }, 5000);
}

export async function addIng(id) {
  const mRaw = document.getElementById('im-' + id).value;
  const u = document.getElementById('iu-' + id).value;
  const n = document.getElementById('in-' + id).value.trim();
  if (!n) return;
  const m = mRaw === '' ? 0 : parseFloat(mRaw);
  const r = D.recipes.find(r => r.id === id);
  r.ings.push({ m: isNaN(m) ? 0 : m, u, n });
  document.getElementById('im-' + id).value = '';
  document.getElementById('in-' + id).value = '';
  saveRecipesDebounced(r);
  rerender();
}

export async function delIng(id, i) {
  const r = D.recipes.find(r => r.id === id);
  r.ings.splice(i, 1);
  saveRecipesDebounced(r);
  rerender();
}

export async function addStep(id) {
  const inp = document.getElementById('st-' + id);
  const v = inp.value.trim();
  if (!v) return;
  const rs = D.recipes.find(r => r.id === id);
  rs.steps.push(v);
  inp.value = '';
  saveRecipesDebounced(rs);
  rerender();
}

export async function delStep(id, i) {
  const r = D.recipes.find(r => r.id === id);
  r.steps.splice(i, 1);
  saveRecipesDebounced(r);
  rerender();
}

export async function updR(id, key, val) {
  const r = D.recipes.find(r => r.id === id);
  r[key] = val;
  saveRecipesDebounced(r);
}

export async function uploadRecipeImage(id, input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Nur Bilder erlaubt (JPG, PNG, HEIC)'); return; }
  const label = input.parentElement.querySelector('.img-upload-label');
  if (label) label.textContent = 'Wird hochgeladen…';
  const url = await sbUploadImage(file);
  if (url) {
    const ri = D.recipes.find(r => r.id === id);
    ri.img = url;
    ri.img_owned = true;
    await saveRecipeNow(ri);
    rerender();
    toast('Bild gespeichert');
  } else {
    if (label) label.textContent = 'Fehler beim Hochladen';
  }
}

export async function removeRecipeImage(id) {
  const r = D.recipes.find(r => r.id === id);
  if (!r || !r.img) return;
  if (r.img_owned !== false) await sbDeleteImage(r.img);
  r.img = null;
  r.img_owned = undefined;
  await saveRecipeNow(r);
  rerender();
  toast('Foto entfernt');
}

export async function togglePublic(id) {
  const r = D.recipes.find(r => r.id === id);
  r.public = !r.public;
  await saveRecipeNow(r);
  rerender();
  toast(r.public ? 'Rezept ist jetzt öffentlich' : 'Rezept ist jetzt privat');
}

export async function setSrcType(id, type) {
  const r = D.recipes.find(r => r.id === id);
  r.src = { type, val: '', seite: '' };
  saveRecipesDebounced(r);
  rerender();
}

export async function updSrc(id, key, val) {
  const r = D.recipes.find(r => r.id === id);
  if (!r.src) r.src = { type: 'url', val: '', seite: '' };
  r.src[key] = val;
  saveRecipesDebounced(r);
  rerender();
}

// ── Quick Entry ───────────────────────────────────────────────────────────────
export function openQE() {
  const modal = document.getElementById('qe-modal');
  document.getElementById('qe-name').value  = '';
  document.getElementById('qe-ings').value  = '';
  document.getElementById('qe-steps').value = '';
  document.getElementById('qe-time').value  = '';
  delete modal.dataset.importSrc;
  delete modal.dataset.importImg;
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('qe-name').focus(), 100);
}

export function closeQE() {
  const modal = document.getElementById('qe-modal');
  modal.style.display = 'none';
  delete modal.dataset.importSrc;
  delete modal.dataset.importImg;
}

export function parseIngredientLine(line) {
  line = line.trim();
  if (!line) return null;
  try {
    const r = parseIngredient(line, 'en', {
      additionalUOMs: {
        dl:           { short: 'dl',       plural: 'dl',       versions: ['dl'] },
        cl:           { short: 'cl',       plural: 'cl',       versions: ['cl'] },
        EL:           { short: 'EL',       plural: 'EL',       versions: ['el', 'EL'] },
        TL:           { short: 'TL',       plural: 'TL',       versions: ['tl', 'TL'] },
        Prise:        { short: 'Prise',    plural: 'Prisen',   versions: ['prise', 'prisen'] },
        Bund:         { short: 'Bund',     plural: 'Bund',     versions: ['bund'] },
        Dose:         { short: 'Dose',     plural: 'Dosen',    versions: ['dose', 'dosen'] },
        Pck:          { short: 'Pck.',     plural: 'Pck.',     versions: ['pck', 'pck.', 'päckchen'] },
        Stück:        { short: 'Stück',    plural: 'Stück',    versions: ['stück', 'stk', 'stk.'] },
        Becher:       { short: 'Becher',   plural: 'Becher',   versions: ['becher'] },
        Glas:         { short: 'Glas',     plural: 'Gläser',   versions: ['glas', 'gläser'] },
        Zweig:        { short: 'Zweig',    plural: 'Zweige',   versions: ['zweig', 'zweige'] },
        Blatt:        { short: 'Blatt',    plural: 'Blätter',  versions: ['blatt', 'blätter'] },
        Zehe:         { short: 'Zehe',     plural: 'Zehen',    versions: ['zehe', 'zehen', 'Zehe/n', 'zehe/n'] },
        Scheibe:      { short: 'Scheibe',  plural: 'Scheiben', versions: ['scheibe', 'scheiben'] },
        Handvoll:     { short: 'Handvoll', plural: 'Handvoll', versions: ['handvoll'] },
        Messerspitze: { short: 'Msp.',     plural: 'Msp.',     versions: ['msp', 'msp.', 'messerspitze'] },
        Würfel:       { short: 'Würfel',   plural: 'Würfel',   versions: ['würfel'] },
        Knolle:       { short: 'Knolle',   plural: 'Knollen',  versions: ['knolle', 'knollen'] },
        Kopf:         { short: 'Kopf',     plural: 'Köpfe',    versions: ['kopf', 'köpfe'] },
        Stange:       { short: 'Stange',   plural: 'Stangen',  versions: ['stange', 'stangen'] },
        Tasse:        { short: 'Tasse',    plural: 'Tassen',   versions: ['tasse', 'tassen'] },
        Pkg:          { short: 'Pkg.',     plural: 'Pkg.',     versions: ['pkg', 'pkg.', 'packung', 'packungen'] },
      }
    });
    if (r && r.ingredient) {
      return { m: r.quantity > 0 ? r.quantity : 0, u: r.unitText || '', n: r.ingredient.trim() };
    }
  } catch(e) {}
  return { m: 1, u: '', n: line };
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
  const modal = document.getElementById('qe-modal');
  console.log('importImg:', modal.dataset.importImg);
  console.log('importSrc:', modal.dataset.importSrc);
  const ingLines  = document.getElementById('qe-ings').value.split('\n').filter(l => l.trim());
  const stepsText = document.getElementById('qe-steps').value.trim();
  const ings  = ingLines.map(parseIngredientLine).filter(Boolean);
  const steps = splitSteps(stepsText);
  const time     = parseInt(document.getElementById('qe-time').value) || null;
  const portions = parseInt(document.getElementById('qe-portions').value) || 2;
  const importSrc = modal.dataset.importSrc ?? '';
  const src = importSrc ? { type: 'url', val: importSrc, seite: '' } : null;
  const newR = {
    id: D.nextId++, name,
    cat: document.getElementById('qe-cat').value,
    auf: document.getElementById('qe-auf').value,
    time, portions, ings, steps, src, public: true
  };
  // Importiertes Bild übernehmen — nach newR Deklaration
  if (modal.dataset.importImg) {
    newR.img = modal.dataset.importImg;
    newR.img_owned = true;
  }
  D.recipes.push(newR);
  closeQE();
  await saveRecipeNow(newR);
  renderRFilters();
  rerender();
  toast('Rezept hinzugefügt');
}

// ── Quelle: Edit-Panel togglen ────────────────────────────────────────────────
export function openSrcEdit(id) {
  const panel = document.getElementById('src-edit-' + id);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
}

// ── Aufwand-Filter zurücksetzen ───────────────────────────────────────────────
export function clearAufFilter() {
  D.settings.aufwand.forEach(a => rFilters.delete(a.id));
  renderRFilters();
  renderRecipes();
}

import { SUPA_URL, SUPA_KEY } from './config.js';
import { toast } from './ui.js';

// ── URL-Import Modal öffnen ───────────────────────────────────────────────────
export function openUrlImport() {
  document.getElementById('url-import-modal').style.display = 'flex';
  document.getElementById('url-import-input').value = '';
  document.getElementById('url-import-err').textContent = '';
  document.getElementById('url-import-btn').textContent = 'Rezept laden';
  setTimeout(() => document.getElementById('url-import-input').focus(), 80);
}

export function closeUrlImport() {
  document.getElementById('url-import-modal').style.display = 'none';
}

// ── Edge Function aufrufen ────────────────────────────────────────────────────
export async function parseRecipeUrl() {
  const input  = document.getElementById('url-import-input');
  const errEl  = document.getElementById('url-import-err');
  const btn    = document.getElementById('url-import-btn');
  const url    = input.value.trim();

  if (!url) { errEl.textContent = 'Bitte eine URL eingeben.'; return; }

  errEl.textContent = '';
  btn.textContent   = 'Wird geladen…';
  btn.disabled      = true;

  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/parse-recipe`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPA_KEY}`,
        'apikey':        SUPA_KEY,
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      errEl.textContent = data.error ?? 'Unbekannter Fehler.';
      return;
    }

    closeUrlImport();
    // Fix 5: URL mitgeben damit sie als Quelle gesetzt werden kann
    openQEWithRecipe(data.recipe, url);

  } catch (e) {
    errEl.textContent = 'Netzwerkfehler – bist du online?';
  } finally {
    btn.textContent = 'Rezept laden';
    btn.disabled    = false;
  }
}

// ── Quick-Entry Modal mit geparsten Daten befüllen ───────────────────────────
function openQEWithRecipe(r, sourceUrl) {
  const modal = document.getElementById('qe-modal');

  // Fix 5: Quell-URL für saveQE bereitstellen
  modal.dataset.importSrc = sourceUrl ?? '';

  // Felder befüllen
  document.getElementById('qe-name').value     = r.name     ?? '';
  document.getElementById('qe-time').value     = r.time     ?? '';
  document.getElementById('qe-portions').value = r.portions ?? 2;

  // Zutaten als lesbaren Text – der User kann sie noch korrigieren,
  // saveQE parst sie dann nochmals (gewollter Review-Schritt)
  const ingText = (r.ings ?? []).map(ing => {
    const parts = [
      ing.m > 0 ? String(ing.m) : '',
      ing.u ?? '',
      ing.n ?? '',
    ].filter(Boolean);
    return parts.join(' ');
  }).join('\n');
  document.getElementById('qe-ings').value = ingText;

  // Schritte als nummerierte Liste
  const stepsText = (r.steps ?? [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
  document.getElementById('qe-steps').value = stepsText;

  if (r.img) {
    modal.dataset.importImg = r.img;
  } else {
    delete modal.dataset.importImg;
  }

  modal.style.display = 'flex';

  // Fix 6: Name-Feld fokussieren und selektieren → sofort editierbar
  setTimeout(() => {
    const nameEl = document.getElementById('qe-name');
    nameEl.focus();
    nameEl.select();
  }, 80);

  toast('Rezept geladen · Name prüfen, dann Kategorie & Aufwand wählen');
}
