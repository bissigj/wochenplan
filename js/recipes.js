import { getCatLabel, getAufLabel, tagStyle, saveRecipesDebounced, saveRecipeNow, deleteRecipeFromDB } from './data.js';
import { getState, setState } from './store.js';
import { parseIngredient } from 'https://esm.sh/@jlucaspains/sharp-recipe-parser@1.3.6';
import { sbUploadImage, sbDeleteImage } from './db.js';
import { fmtIng, srcHTML, toast, esc, show, hide } from './ui.js';
import { renderWeek } from './week.js';
import { SUPA_URL, SUPA_KEY } from './config.js';

// ═════════════════════════════════════════════════════════════════════════════
// INTERNER STORE-HELPER
// ═════════════════════════════════════════════════════════════════════════════

// patchFn(recipe) → gibt ein neues (gepatchtes) Rezept-Objekt zurück
function updateRecipe(id, patchFn) {
  const recipes = getState().recipes;
  const idx = recipes.findIndex(r => r.id === id);
  if (idx < 0) return null;
  const updated = patchFn({ ...recipes[idx] });
  setState(s => ({ recipes: s.recipes.map(r => r.id === id ? updated : r) }));
  return updated;
}

// ═════════════════════════════════════════════════════════════════════════════
// MODUL-STATE
// ═════════════════════════════════════════════════════════════════════════════

export let expandedR    = null;
export let rFilters     = new Set();
export let catFilters   = new Set();
export let sortOrder    = 'name';
export let _pendingUndo = null;
let catPanelOpen        = false;

function rerender() {
  const q = document.getElementById('recipe-search')?.value || '';
  renderRecipes(q);
}

// ═════════════════════════════════════════════════════════════════════════════
// FILTER
// ═════════════════════════════════════════════════════════════════════════════

export function renderRFilters() {
  const aufEl = document.getElementById('r-auf-segment');
  if (aufEl) {
    const { settings } = getState();
    const hasAufFilter = settings.aufwand.some(a => rFilters.has(a.id));
    aufEl.innerHTML =
      `<button class="segment ${!hasAufFilter ? 'on' : ''}" data-action="clear-auf-filter">Alle</button>` +
      settings.aufwand.map(a =>
        `<button class="segment ${rFilters.has(a.id) ? 'on' : ''}" data-action="toggle-rf" data-id="${esc(a.id)}">${esc(a.label)}</button>`
      ).join('');
  }
  _renderCatBtn();
  if (catPanelOpen) _renderCatPanelContent();
}

function _renderCatBtn() {
  const catBtn = document.getElementById('r-cat-btn');
  if (!catBtn) return;
  const { settings } = getState();
  const n = catFilters.size;
  const chev = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  if (n === 0) {
    catBtn.innerHTML = `Kategorie ${chev}`;
    catBtn.classList.remove('has-filter');
  } else if (n === 1) {
    const cat = settings.cats.find(c => c.id === [...catFilters][0]);
    catBtn.innerHTML = `${esc(cat ? cat.label : 'Kategorie')} ${chev}`;
    catBtn.classList.add('has-filter');
  } else {
    catBtn.innerHTML = `${n} Kategorien ${chev}`;
    catBtn.classList.add('has-filter');
  }
}

function _renderCatPanelContent() {
  const list = document.getElementById('r-cat-panel-list');
  if (!list) return;
  const cats = [...getState().settings.cats].sort((a, b) => a.label.localeCompare(b.label, 'de'));
  list.innerHTML = cats.map(c => {
    const active = catFilters.has(c.id);
    const check = active
      ? `<svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><polyline points="1.5 5 4 7.5 8.5 2"/></svg>`
      : '';
    return `<div class="cat-panel-item ${active ? 'active' : ''}" data-action="toggle-cat-filter" data-id="${esc(c.id)}">
      <div class="cat-panel-dot" style="background:${esc(c.color || '#888')}"></div>
      <span class="cat-panel-label">${esc(c.label)}</span>
      <div class="cat-panel-check">${check}</div>
    </div>`;
  }).join('');
}

export function toggleCatPanel(e) {
  catPanelOpen = !catPanelOpen;
  const panel = document.getElementById('r-cat-panel');
  if (!panel) return;
  if (catPanelOpen) {
    _renderCatPanelContent();
    panel.classList.add('open');
    setTimeout(() => document.addEventListener('click', _closeCatPanelOutside), 0);
  } else {
    panel.classList.remove('open');
    document.removeEventListener('click', _closeCatPanelOutside);
  }
}

function _closeCatPanelOutside(e) {
  const panel = document.getElementById('r-cat-panel');
  const btn   = document.getElementById('r-cat-btn');
  if (btn && btn.contains(e.target)) return;
  // Element könnte durch renderRFilters aus dem DOM entfernt worden sein —
  // in diesem Fall prüfen ob der Klick eine Panel-Action war
  const action = e.target.closest('[data-action]')?.dataset?.action;
  if (action === 'toggle-cat-filter' || action === 'clear-cat-filter') return;
  if (panel && panel.contains(e.target)) return;
  catPanelOpen = false;
  panel?.classList.remove('open');
  document.removeEventListener('click', _closeCatPanelOutside);
}

export function toggleRF(f)     { rFilters.has(f) ? rFilters.delete(f) : rFilters.add(f); renderRFilters(); renderRecipes(); }
export function toggleCatFilter(id) { catFilters.has(id) ? catFilters.delete(id) : catFilters.add(id); renderRFilters(); renderRecipes(); }
export function clearCatFilter()    { catFilters.clear(); renderRFilters(); renderRecipes(); }
export function clearAufFilter()    { getState().settings.aufwand.forEach(a => rFilters.delete(a.id)); renderRFilters(); renderRecipes(); }
export function setSortOrder(v)     { sortOrder = v; rerender(); }

// ═════════════════════════════════════════════════════════════════════════════
// RENDERING — LISTE
// ═════════════════════════════════════════════════════════════════════════════

export function renderRecipes(searchQuery = '') {
  const el = document.getElementById('r-list');
  const { recipes, settings } = getState();
  let vis = [...recipes];

  // Filter
  if (rFilters.size || catFilters.size) {
    const aufIds = settings.aufwand.map(a => a.id);
    vis = vis.filter(r => {
      const af = [...rFilters].filter(f => aufIds.includes(f));
      return (catFilters.size === 0 || catFilters.has(r.cat))
          && (af.length === 0 || af.includes(r.auf));
    });
  }

  // Suche
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    vis = vis.filter(r =>
      r.name.toLowerCase().includes(q) ||
      getCatLabel(r.cat).toLowerCase().includes(q) ||
      getAufLabel(r.auf).toLowerCase().includes(q) ||
      (r.ings || []).some(ing => (ing.n || '').toLowerCase().includes(q))
    );
  }

  // Sortierung
  if (sortOrder === 'name')      vis.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortOrder === 'cat')  vis.sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.name.localeCompare(b.name));
  else if (sortOrder === 'time') vis.sort((a, b) => (a.time || 999) - (b.time || 999));

  if (!vis.length) {
    const isFiltered = searchQuery.length > 0 || rFilters.size > 0 || catFilters.size > 0;
    el.innerHTML = isFiltered
      ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Keine Treffer</div><div class="empty-state-sub">Versuche einen anderen Suchbegriff oder Filter.</div></div>'
      : '<div class="empty-state"><div class="empty-state-icon">🍳</div><div class="empty-state-title">Noch keine Rezepte</div><div class="empty-state-sub">Tippe auf + um dein erstes Rezept hinzuzufügen.</div></div>';
    return;
  }

  const einheiten = settings.einheiten || [];
  el.innerHTML = vis.map(r => renderRecipeCard(r, expandedR === r.id, einheiten)).join('');
}

// ═════════════════════════════════════════════════════════════════════════════
// RENDERING — KARTE
// ═════════════════════════════════════════════════════════════════════════════

function renderRecipeCard(r, isOpen, einheiten) {
  return `<div class="card recipe-card">
    <div class="recipe-row" data-action="toggle-er" data-id="${r.id}">
      <span class="recipe-name-col">${esc(r.name)}</span>
      <span class="recipe-meta">${r.time ? r.time + ' min' : ''}</span>
      <span class="tag" style="${tagStyle(r.cat)}">${esc(getCatLabel(r.cat))}</span>
      <span class="tag" style="${tagStyle(r.auf)}">${esc(getAufLabel(r.auf))}</span>
      <button class="xbtn recipe-del-btn" data-action="del-r" data-id="${r.id}">×</button>
    </div>
    ${isOpen ? renderRecipeDetail(r, einheiten) : ''}
  </div>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// RENDERING — DETAIL (aufgeklappte Ansicht)
// ═════════════════════════════════════════════════════════════════════════════

function _fmtQty(ing) {
  const m = ing.m > 0 ? String(+ing.m.toFixed(2)).replace('.', ',') : '';
  return [m, esc(ing.u || '')].filter(Boolean).join(' ') || '—';
}

function _renderIngredients(r, einheiten) {
  const rows = (r.ings || []).map((ing, i) => `
    <div class="rd-ing-row rd-ing-row--editable" data-action="prefill-ing" data-rid="${r.id}" data-i="${i}" title="Klicken zum Bearbeiten">
      <span class="rd-ing-qty">${_fmtQty(ing)}</span>
      <span class="rd-ing-name">${esc(ing.n || '')}</span>
      <button class="xbtn" data-action="del-ing" data-rid="${r.id}" data-i="${i}">×</button>
    </div>`).join('');

  return `<div class="rd-col rd-col-ings">
    <div class="rd-col-title">Zutaten · ${r.portions || 2} Port.</div>
    <div class="rd-ing-list">${rows}</div>
    <div class="rd-add-row" id="rd-add-row-${r.id}">
      <input type="number" id="im-${r.id}" placeholder="Menge" step="any" min="0" class="rd-add-qty" />
      <select id="iu-${r.id}" class="inline-select rd-add-unit">
        <option value="">—</option>
        ${einheiten.map(e => `<option>${esc(e)}</option>`).join('')}
      </select>
      <input type="text" id="in-${r.id}" placeholder="Zutat" class="rd-add-name" data-submit="add-ing" data-id="${r.id}" />
      <button class="btn btn--sm" id="ib-${r.id}" data-action="add-ing" data-id="${r.id}">+</button>
    </div>
  </div>`;
}

function _renderSteps(r) {
  const items = (r.steps || []).map((s, i) => `
    <li class="step-item" data-id="${r.id}" data-i="${i}">
      <span class="drag-handle">⠿</span>
      <span class="step-num">${i + 1}</span>
      <span class="step-text">${esc(s)}</span>
      <button class="xbtn" data-action="del-step" data-rid="${r.id}" data-i="${i}">×</button>
    </li>`).join('');

  return `<div class="rd-col rd-col-steps">
    <div class="rd-col-title">Zubereitung</div>
    <ul class="steps-list" id="steps-${r.id}">${items}</ul>
    <div class="rd-add-row">
      <input type="text" id="st-${r.id}" placeholder="Neuer Schritt…" class="rd-add-step" data-submit="add-step" data-id="${r.id}" />
      <button class="btn btn--sm" data-action="add-step" data-id="${r.id}">+</button>
    </div>
  </div>`;
}

function _renderSrcInputs(rid, type, val, seite) {
  if (type === 'url') {
    return `<input type="url" value="${esc(val)}" placeholder="https://…" data-change="upd-src" data-rid="${rid}" data-key="val" />`;
  }
  return `<input type="text" value="${esc(val)}" placeholder="Kochbuchname" class="rd-src-input" data-change="upd-src" data-rid="${rid}" data-key="val" />
          <input type="text" value="${esc(seite || '')}" placeholder="Seite (optional)" data-change="upd-src" data-rid="${rid}" data-key="seite" />`;
}

function _renderSource(r) {
  const srcType  = r.src?.type || 'url';
  const srcVal   = r.src?.val  || '';
  const srcSeite = r.src?.seite || '';

  const typePills = `
    <div class="pills rd-pills">
      <button class="pill ${srcType === 'url'  ? 'on' : ''}" data-action="set-src-type" data-rid="${r.id}" data-type="url">🔗 URL</button>
      <button class="pill ${srcType === 'buch' ? 'on' : ''}" data-action="set-src-type" data-rid="${r.id}" data-type="buch">📖 Buch</button>
    </div>`;

  if (srcVal) {
    // Quelle vorhanden — Display + Edit-Panel
    return `<div class="rd-src-display">
      ${srcHTML(r.src)}
      <button class="btn btn--sm btn--ghost rd-src-btn" data-action="open-src-edit" data-id="${r.id}">Ändern</button>
    </div>
    <div class="rd-src-edit-panel is-hidden" id="src-edit-${r.id}">
      ${typePills}
      ${_renderSrcInputs(r.id, srcType, srcVal, srcSeite)}
    </div>`;
  }

  // Noch keine Quelle — direkt Eingabe
  return `${typePills}
    ${_renderSrcInputs(r.id, srcType, srcVal, srcSeite)}`;
}

function _renderMeta(r) {
  const catOptions = getState().settings.cats.map(c =>
    `<option value="${esc(c.id)}" ${r.cat === c.id ? 'selected' : ''}>${esc(c.label)}</option>`
  ).join('');
  const aufOptions = getState().settings.aufwand.map(a =>
    `<option value="${esc(a.id)}" ${r.auf === a.id ? 'selected' : ''}>${esc(a.label)}</option>`
  ).join('');

  return `<div class="rd-meta-row">
    <div class="rd-meta-cell">
      <span class="rd-label">Kategorie</span>
      <select class="inline-select" data-change="upd-r" data-rid="${r.id}" data-key="cat">${catOptions}</select>
    </div>
    <div class="rd-meta-cell">
      <span class="rd-label">Aufwand</span>
      <select class="inline-select" data-change="upd-r" data-rid="${r.id}" data-key="auf">${aufOptions}</select>
    </div>
    <div class="rd-meta-cell">
      <span class="rd-label">Zeit (min)</span>
      <input type="number" value="${r.time || ''}" min="1" max="300" class="rd-input-full" data-change="upd-r" data-rid="${r.id}" data-key="time" />
    </div>
    <div class="rd-meta-cell">
      <span class="rd-label">Portionen</span>
      <input type="number" value="${r.portions || 2}" min="1" max="20" class="rd-input-full" data-change="upd-r" data-rid="${r.id}" data-key="portions" />
    </div>
  </div>`;
}

function _renderImageHeader(r) {
  const bgStyle = r.img ? `background-image:url('${esc(r.img)}')` : 'background:var(--bg3)';
  const uploadLabel = r.img ? 'Foto ersetzen' : '+ Foto';
  const removeBtn = r.img
    ? `<button class="btn btn--sm rd-img-btn btn--danger" data-action="remove-img" data-id="${r.id}">Entfernen</button>`
    : '';

  return `<div class="rd-img-header" style="${bgStyle}">
    <div class="rd-img-overlay">
      <div class="rd-img-meta">
        <span class="tag" style="${tagStyle(r.cat)}">${esc(getCatLabel(r.cat))}</span>
        <span class="tag" style="${tagStyle(r.auf)}">${esc(getAufLabel(r.auf))}</span>
        ${r.time ? `<span class="rd-chip">${r.time} min</span>` : ''}
        <span class="rd-chip">${r.portions || 2} Port.</span>
      </div>
      <div class="rd-img-actions">
        <label class="btn btn--sm rd-img-btn">
          <span class="img-upload-label">${uploadLabel}</span>
          <input type="file" accept="image/*,image/heic" class="rd-file-hidden" data-change="upload-img" data-id="${r.id}" />
        </label>
        ${removeBtn}
      </div>
    </div>
  </div>`;
}

function renderRecipeDetail(r, einheiten) {
  const visibilityClass = r.public === false ? 'btn-private' : 'btn-public';
  const visibilityLabel = r.public === false ? '🔒 Privat' : '👁 Öffentlich';

  return `<div class="recipe-detail">
    ${_renderImageHeader(r)}
    <div class="rd-name-row">
      <input type="text" class="rd-name-input" value="${esc(r.name)}"
        data-change="upd-r" data-rid="${r.id}" data-key="name" />
    </div>
    ${_renderMeta(r)}
    <div class="rd-divider"></div>
    <div class="rd-body">
      ${_renderIngredients(r, einheiten)}
      ${_renderSteps(r)}
    </div>
    <div class="rd-divider"></div>
    <div class="rd-footer">
      <div class="rd-footer-cell">
        <div class="rd-label rd-source-label">Quelle</div>
        ${_renderSource(r)}
      </div>
      <div class="rd-footer-cell rd-footer-actions">
        <div class="rd-label">Sichtbarkeit</div>
        <button class="btn btn--sm ${visibilityClass}" data-action="toggle-public" data-id="${r.id}">
          ${visibilityLabel}
        </button>
      </div>
    </div>
    <div class="rd-actions-wrap">
      <button class="btn btn--sm" data-action="export-recipe-pdf" data-id="${r.id}">↓ PDF exportieren</button>
    </div>
  </div>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// CRUD-OPERATIONEN
// ═════════════════════════════════════════════════════════════════════════════

export function toggleER(id) { expandedR = expandedR === id ? null : id; rerender(); }

export async function delR(id) {
  const recipes = getState().recipes;
  const idx = recipes.findIndex(r => r.id === id);
  if (idx < 0) return;
  const removed = recipes[idx];
  if (!confirm(`„${removed.name}" wirklich löschen?`)) return;
  setState(s => ({ recipes: s.recipes.filter(r => r.id !== id) }));
  rerender();
  let undone = false;
  _pendingUndo = async () => {
    if (undone) return;
    undone = true;
    setState(s => {
      const r = [...s.recipes];
      r.splice(idx, 0, removed);
      return { recipes: r };
    });
    await saveRecipeNow(removed);
    rerender();
    toast('Rezept wiederhergestellt');
  };
  toast(`„${removed.name}" gelöscht · <a data-action="undo-del-r" class="toast-link">Rückgängig</a>`, 8000);
  setTimeout(async () => {
    if (!undone) {
      try {
        await deleteRecipeFromDB(removed);
      } catch (e) {
        setState(s => {
          const r = [...s.recipes];
          r.splice(idx, 0, removed);
          return { recipes: r };
        });
        rerender();
        toast('Fehler beim Löschen – Rezept wiederhergestellt');
        console.error('deleteRecipeFromDB error', e);
      }
    }
  }, 8000);
}

// _editingIng: merkt sich welche Zutat gerade bearbeitet wird { recipeId, idx }
let _editingIng = null;

export function prefillIng(rid, idx) {
  const recipe = getState().recipes.find(r => r.id === rid);
  if (!recipe) return;
  const ing = recipe.ings[idx];
  if (!ing) return;

  // Felder vorausfüllen
  const mEl = document.getElementById('im-' + rid);
  const uEl = document.getElementById('iu-' + rid);
  const nEl = document.getElementById('in-' + rid);
  const btn = document.getElementById('ib-' + rid);
  if (!mEl || !uEl || !nEl) return;

  mEl.value = ing.m > 0 ? ing.m : '';
  nEl.value = ing.n || '';
  // Einheit im Select vorwählen — leere Option wenn keine Einheit
  uEl.value = ing.u || '';

  // Edit-Modus markieren
  _editingIng = { rid, idx };
  if (btn) { btn.textContent = '✓'; btn.classList.add('btn--editing'); }

  // Zeile visuell hervorheben
  document.querySelectorAll(`.rd-ing-row--editable[data-rid="${rid}"]`).forEach((el, i) => {
    el.classList.toggle('rd-ing-row--active', i === idx);
  });

  nEl.focus();
  nEl.select();
}

function _clearIngEditMode(rid) {
  _editingIng = null;
  const btn = document.getElementById('ib-' + rid);
  if (btn) { btn.textContent = '+'; btn.classList.remove('btn--editing'); }
  document.querySelectorAll(`.rd-ing-row--active`).forEach(el => el.classList.remove('rd-ing-row--active'));
}

export async function addIng(id) {
  const mRaw = document.getElementById('im-' + id).value;
  const u    = document.getElementById('iu-' + id).value;
  const n    = document.getElementById('in-' + id).value.trim();
  if (!n) return;
  const m = mRaw === '' ? 0 : parseFloat(mRaw);
  const newIng = { m: isNaN(m) ? 0 : m, u, n };

  let r;
  if (_editingIng && _editingIng.rid === id) {
    // Edit-Modus: bestehende Zutat ersetzen
    const idx = _editingIng.idx;
    r = updateRecipe(id, r => ({
      ...r,
      ings: r.ings.map((ing, i) => i === idx ? newIng : ing)
    }));
    _clearIngEditMode(id);
  } else {
    // Normal: neue Zutat anhängen
    r = updateRecipe(id, r => ({ ...r, ings: [...r.ings, newIng] }));
  }

  document.getElementById('im-' + id).value = '';
  document.getElementById('in-' + id).value = '';
  if (r) { saveRecipesDebounced(r); rerender(); }
}

export async function delIng(id, i) {
  if (_editingIng && _editingIng.rid === id) _clearIngEditMode(id);
  const r = updateRecipe(id, r => ({ ...r, ings: r.ings.filter((_, idx) => idx !== i) }));
  if (r) { saveRecipesDebounced(r); rerender(); }
}

export async function addStep(id) {
  const inp = document.getElementById('st-' + id);
  const v   = inp.value.trim();
  if (!v) return;
  const r = updateRecipe(id, r => ({ ...r, steps: [...r.steps, v] }));
  inp.value = '';
  if (r) { saveRecipesDebounced(r); rerender(); }
}

export async function delStep(id, i) {
  const r = updateRecipe(id, r => ({ ...r, steps: r.steps.filter((_, idx) => idx !== i) }));
  if (r) { saveRecipesDebounced(r); rerender(); }
}

export async function updR(id, key, val) {
  const r = updateRecipe(id, r => ({ ...r, [key]: val }));
  if (r) {
    saveRecipesDebounced(r);
    // Name sofort im Karten-Header aktualisieren ohne vollen Re-render
    if (key === 'name') {
      const nameCol = document.querySelector(`.recipe-card [data-action="toggle-er"][data-id="${id}"] .recipe-name-col`);
      if (nameCol) nameCol.textContent = val;
    }
  }
}

export async function uploadRecipeImage(id, el) {
  const file = el?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Nur Bilder erlaubt (JPG, PNG, HEIC)'); return; }
  const label = el.parentElement.querySelector('.img-upload-label');
  if (label) label.textContent = 'Wird hochgeladen…';
  const url = await sbUploadImage(file);
  if (url) {
    const ri = updateRecipe(id, r => ({ ...r, img: url, img_owned: true }));
    if (ri) { await saveRecipeNow(ri); rerender(); toast('Bild gespeichert'); }
  } else {
    if (label) label.textContent = 'Fehler beim Hochladen';
  }
}

export async function removeRecipeImage(id) {
  const existing = getState().recipes.find(r => r.id === id);
  if (!existing || !existing.img) return;
  if (existing.img_owned !== false) await sbDeleteImage(existing.img);
  const r = updateRecipe(id, r => ({ ...r, img: null, img_owned: undefined }));
  if (r) { await saveRecipeNow(r); rerender(); toast('Foto entfernt'); }
}

export async function togglePublic(id) {
  const existing = getState().recipes.find(r => r.id === id);
  if (!existing) return;
  const r = updateRecipe(id, r => ({ ...r, public: !r.public }));
  if (r) {
    await saveRecipeNow(r);
    rerender();
    toast(r.public ? 'Rezept ist jetzt öffentlich' : 'Rezept ist jetzt privat');
  }
}

export async function setSrcType(id, type) {
  const r = updateRecipe(id, r => ({ ...r, src: { type, val: '', seite: '' } }));
  if (r) { saveRecipesDebounced(r); rerender(); }
}

export async function updSrc(id, key, val) {
  const r = updateRecipe(id, r => ({ ...r, src: { ...(r.src || { type: 'url', val: '', seite: '' }), [key]: val } }));
  if (r) { saveRecipesDebounced(r); rerender(); }
}

export function openSrcEdit(id) {
  const panel = document.getElementById('src-edit-' + id);
  if (panel) panel.classList.toggle('is-hidden');
}

// ═════════════════════════════════════════════════════════════════════════════
// QUICK ENTRY
// ═════════════════════════════════════════════════════════════════════════════

export function openQE() {
  const modal = document.getElementById('qe-modal');
  document.getElementById('qe-name').value  = '';
  document.getElementById('qe-ings').value  = '';
  document.getElementById('qe-steps').value = '';
  document.getElementById('qe-time').value  = '';
  delete modal.dataset.importSrc;
  delete modal.dataset.importImg;
  show(modal);
  setTimeout(() => document.getElementById('qe-name').focus(), 100);
}

export function closeQE() {
  const modal = document.getElementById('qe-modal');
  hide(modal);
  delete modal.dataset.importSrc;
  delete modal.dataset.importImg;
}

export async function saveQE() {
  const name = document.getElementById('qe-name').value.trim();
  if (!name) { document.getElementById('qe-name').focus(); return; }
  const modal    = document.getElementById('qe-modal');
  const ings     = document.getElementById('qe-ings').value.split('\n').filter(l => l.trim()).map(parseIngredientLine).filter(Boolean);
  const steps    = splitSteps(document.getElementById('qe-steps').value.trim());
  const time     = parseInt(document.getElementById('qe-time').value) || null;
  const portions = parseInt(document.getElementById('qe-portions').value) || 2;
  const importSrc = modal.dataset.importSrc ?? '';
  const src = importSrc ? { type: 'url', val: importSrc, seite: '' } : null;
  const { nextId } = getState();
  const newR = {
    id: nextId,
    name,
    cat:      document.getElementById('qe-cat').value,
    auf:      document.getElementById('qe-auf').value,
    time, portions, ings, steps, src,
    public:   true,
  };
  if (modal.dataset.importImg) { newR.img = modal.dataset.importImg; newR.img_owned = true; }
  setState(s => ({ recipes: [...s.recipes, newR], nextId: s.nextId + 1 }));
  closeQE();
  await saveRecipeNow(newR);
  renderRFilters();
  rerender();
  toast('Rezept hinzugefügt');
}

// ═════════════════════════════════════════════════════════════════════════════
// URL-IMPORT
// ═════════════════════════════════════════════════════════════════════════════

export function openUrlImport() {
  show('url-import-modal');
  document.getElementById('url-import-input').value = '';
  document.getElementById('url-import-err').textContent = '';
  document.getElementById('url-import-btn').textContent = 'Rezept laden';
  setTimeout(() => document.getElementById('url-import-input').focus(), 80);
}

export function closeUrlImport() {
  hide('url-import-modal');
}

export async function parseRecipeUrl() {
  const input = document.getElementById('url-import-input');
  const errEl = document.getElementById('url-import-err');
  const btn   = document.getElementById('url-import-btn');
  const url   = input.value.trim();
  if (!url) { errEl.textContent = 'Bitte eine URL eingeben.'; return; }
  errEl.textContent = '';
  btn.textContent = 'Wird geladen…';
  btn.disabled = true;
  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/parse-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPA_KEY}`, 'apikey': SUPA_KEY },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { errEl.textContent = data.error ?? 'Unbekannter Fehler.'; return; }
    closeUrlImport();
    openQEWithRecipe(data.recipe, url);
  } catch (e) {
    errEl.textContent = 'Netzwerkfehler – bist du online?';
  } finally {
    btn.textContent = 'Rezept laden';
    btn.disabled = false;
  }
}

function openQEWithRecipe(r, sourceUrl) {
  const modal = document.getElementById('qe-modal');
  modal.dataset.importSrc = sourceUrl ?? '';
  document.getElementById('qe-name').value     = r.name     ?? '';
  document.getElementById('qe-time').value     = r.time     ?? '';
  document.getElementById('qe-portions').value = r.portions ?? 2;
  document.getElementById('qe-ings').value  = (r.ings ?? [])
    .map(ing => [ing.m > 0 ? String(ing.m) : '', ing.u ?? '', ing.n ?? ''].filter(Boolean).join(' '))
    .join('\n');
  document.getElementById('qe-steps').value = (r.steps ?? [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
  if (r.img) modal.dataset.importImg = r.img;
  else delete modal.dataset.importImg;
  show(modal);
  setTimeout(() => { const n = document.getElementById('qe-name'); n.focus(); n.select(); }, 80);
  toast('Rezept geladen · Name prüfen, dann Kategorie & Aufwand wählen');
}

// ═════════════════════════════════════════════════════════════════════════════
// INGREDIENT PARSER (Quick Entry Hilfsfunktionen)
// ═════════════════════════════════════════════════════════════════════════════

export function parseIngredientLine(line) {
  line = line.trim();
  if (!line) return null;
  try {
    const r = parseIngredient(line, 'en', { additionalUOMs: {
      dl:           { short: 'dl',     plural: 'dl',      versions: ['dl'] },
      cl:           { short: 'cl',     plural: 'cl',      versions: ['cl'] },
      EL:           { short: 'EL',     plural: 'EL',      versions: ['el', 'EL'] },
      TL:           { short: 'TL',     plural: 'TL',      versions: ['tl', 'TL'] },
      Prise:        { short: 'Prise',  plural: 'Prisen',  versions: ['prise', 'prisen'] },
      Bund:         { short: 'Bund',   plural: 'Bund',    versions: ['bund'] },
      Dose:         { short: 'Dose',   plural: 'Dosen',   versions: ['dose', 'dosen'] },
      Pck:          { short: 'Pck.',   plural: 'Pck.',    versions: ['pck', 'pck.', 'päckchen'] },
      Stück:        { short: 'Stück',  plural: 'Stück',   versions: ['stück', 'stk', 'stk.'] },
      Becher:       { short: 'Becher', plural: 'Becher',  versions: ['becher'] },
      Glas:         { short: 'Glas',   plural: 'Gläser',  versions: ['glas', 'gläser'] },
      Zweig:        { short: 'Zweig',  plural: 'Zweige',  versions: ['zweig', 'zweige'] },
      Blatt:        { short: 'Blatt',  plural: 'Blätter', versions: ['blatt', 'blätter'] },
      Zehe:         { short: 'Zehe',   plural: 'Zehen',   versions: ['zehe', 'zehen', 'Zehe/n', 'zehe/n'] },
      Scheibe:      { short: 'Scheibe',plural: 'Scheiben',versions: ['scheibe', 'scheiben'] },
      Handvoll:     { short: 'Handvoll',plural:'Handvoll',versions: ['handvoll'] },
      Messerspitze: { short: 'Msp.',   plural: 'Msp.',    versions: ['msp', 'msp.', 'messerspitze'] },
      Würfel:       { short: 'Würfel', plural: 'Würfel',  versions: ['würfel'] },
      Knolle:       { short: 'Knolle', plural: 'Knollen', versions: ['knolle', 'knollen'] },
      Kopf:         { short: 'Kopf',   plural: 'Köpfe',   versions: ['kopf', 'köpfe'] },
      Stange:       { short: 'Stange', plural: 'Stangen', versions: ['stange', 'stangen'] },
      Tasse:        { short: 'Tasse',  plural: 'Tassen',  versions: ['tasse', 'tassen'] },
      Pkg:          { short: 'Pkg.',   plural: 'Pkg.',     versions: ['pkg', 'pkg.', 'packung', 'packungen'] },
    }});
    if (r?.ingredient) return { m: r.quantity > 0 ? r.quantity : 0, u: r.unitText || '', n: r.ingredient.trim() };
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
