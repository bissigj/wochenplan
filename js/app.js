import { showTab, toast, initTheme } from './ui.js';
import { subscribe, getState } from './store.js';
import { doLogin, doRegister, doLogout, showLogin, showRegister, tryRestoreSession, obCreateFamily, obJoinFamily } from './auth.js';
import { renderRFilters, renderRecipes, toggleRF, toggleER, delR, addIng, delIng, addStep, delStep, updR, setSrcType, updSrc, openQE, closeQE,
        saveQE, setSortOrder, uploadRecipeImage, removeRecipeImage, togglePublic, openSrcEdit, clearAufFilter, openUrlImport,
        closeUrlImport, parseRecipeUrl, toggleCatPanel, toggleCatFilter, clearCatFilter, _pendingUndo } from './recipes.js';
import { renderWeek, openDrawModal, closeDrawModal, toggleDrawPill, setTimePill, drawWeek, backToCurrent, toggleDay, toggleDayActive, rerollDay, setPortions, setNote } from './week.js';
import { renderShop, setShopView } from './shopping.js';
import { renderArchiv, viewArchiveWeek } from './archive.js';
import { exportPDF, exportRecipePDF, exportShopPDF } from './pdf.js';
import { openDiscover, closeDiscover, importRecipe, filterDiscover, setDiscoverCat, setDiscoverAuf, toggleDiscoverR, discoverLoadMore } from './discover.js';
import { renderSettings, toggleAcc, changeTheme, addCat, updateCat, updateCatField, deleteCat, addAuf, updateAuf, updateAufField,
        deleteAuf, addEinh, deleteEinh, saveFamilyName, createInvitation, joinFamily } from './settings.js';

// ── Apply saved theme before first paint ──────────────────────────────────────
initTheme();

// ── SVG Icons für FAB ─────────────────────────────────────────────────────────
const FAB_ICONS = {
  add:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  generate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
  pdf:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  discover: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
};

// ── FAB konfigurieren je Tab ──────────────────────────────────────────────────
function updateFAB(t) {
  const fabGroup    = document.getElementById('fab-group');
  const fab         = document.getElementById('fab-add');
  const fabDiscover = document.getElementById('fab-discover');
  if (!fabGroup || !fab) return;

  if (t === 'rezepte') {
    fab.innerHTML = FAB_ICONS.add;
    fab.dataset.action = 'open-qe';
    fab.title = 'Rezept hinzufügen';
    fabDiscover.innerHTML = FAB_ICONS.discover;
    fabDiscover.dataset.action = 'open-discover';
    fabDiscover.title = 'Rezepte entdecken';
    fabDiscover.style.display = '';
    fabGroup.classList.remove('hidden');
  } else if (t === 'woche') {
    fab.innerHTML = FAB_ICONS.generate;
    fab.dataset.action = 'open-draw-modal';
    fab.title = 'Woche neu generieren';
    fabDiscover.innerHTML = FAB_ICONS.pdf;
    fabDiscover.dataset.action = 'export-pdf';
    fabDiscover.title = 'Wochenplan als PDF';
    fabDiscover.style.display = '';
    fabGroup.classList.remove('hidden');
  } else if (t === 'einkauf') {
    fab.innerHTML = FAB_ICONS.pdf;
    fab.dataset.action = 'export-shop-pdf';
    fab.title = 'Einkaufsliste als PDF';
    fabDiscover.style.display = 'none';
    fabGroup.classList.remove('hidden');
  } else {
    fabGroup.classList.add('hidden');
  }
}

// ── Modularer Dispatcher ──────────────────────────────────────────────────────
const _handlers = {};

export function registerActions(map) {
  Object.assign(_handlers, map);
}

// Click-Dispatcher
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = _handlers[el.dataset.action];
  if (fn) fn(el.dataset, e);
});

// Change-Dispatcher (select, input[type=color], input[type=number], checkbox)
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = _handlers[el.dataset.change];
  if (fn) fn(el.dataset, e, el);
});

// Input-Dispatcher (live search, oninput)
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  const fn = _handlers[el.dataset.input];
  if (fn) fn(el.dataset, e, el);
});

// Submit-Dispatcher (Enter-Taste)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const el = e.target.closest('[data-submit]');
  if (!el) return;
  const fn = _handlers[el.dataset.submit];
  if (fn) fn(el.dataset, e);
});

// ── App-eigene Actions registrieren ──────────────────────────────────────────
registerActions({
  // Auth
  'login':            () => doLogin(),
  'register':         () => doRegister(),
  'logout':           () => doLogout(),
  'show-login':       () => showLogin(),
  'show-register':    () => showRegister(),
  'ob-create-family': () => obCreateFamily(),
  'ob-join-family':   () => obJoinFamily(),

  // Navigation
  'tab-rezepte':       () => _showTab('rezepte'),
  'tab-woche':         () => _showTab('woche'),
  'tab-einkauf':       () => _showTab('einkauf'),
  'tab-archiv':        () => _showTab('archiv'),
  'tab-einstellungen': () => _showTab('einstellungen'),

  // Rezepte
  'open-qe':           () => openQE(),
  'close-qe':          () => closeQE(),
  'save-qe':           () => saveQE(),
  'open-url-import':   () => openUrlImport(),
  'close-url-import':  () => closeUrlImport(),
  'parse-recipe-url':  () => parseRecipeUrl(),
  'toggle-rf':         ({ id }) => toggleRF(id),
  'toggle-er':         ({ id }) => toggleER(+id),
  'del-r':             ({ id }) => delR(+id),
  'add-ing':           ({ id }) => addIng(+id),
  'del-ing':           ({ rid, i }) => delIng(+rid, +i),
  'add-step':          ({ id }) => addStep(+id),
  'del-step':          ({ rid, i }) => delStep(+rid, +i),
  'set-src-type':      ({ rid, type }) => setSrcType(+rid, type),
  'open-src-edit':     ({ id }) => openSrcEdit(+id),
  'upload-img':        ({ id }, e, el) => { const f = el?.files?.[0]; if (f) uploadRecipeImage(+id, f); },
  'remove-img':        ({ id }) => removeRecipeImage(+id),
  'toggle-public':     ({ id }) => togglePublic(+id),
  'export-recipe-pdf': ({ id }) => exportRecipePDF(+id),
  'clear-auf-filter':  () => clearAufFilter(),
  'toggle-cat-panel':  (_, e) => toggleCatPanel(e),
  'toggle-cat-filter': ({ id }) => toggleCatFilter(id),
  'clear-cat-filter':  () => clearCatFilter(),
  'undo-del-r':        () => { if (_pendingUndo) _pendingUndo(); },

  // Woche
  'open-draw-modal':   () => openDrawModal(),
  'close-draw-modal':  () => closeDrawModal(),
  'draw-week':         () => drawWeek(),
  'back-to-current':   () => backToCurrent(),
  'toggle-day':        ({ i }) => toggleDay(+i),
  'toggle-day-active': ({ i }, e) => toggleDayActive(+i, e),
  'reroll-day':        ({ i }, e) => rerollDay(+i, e),
  'export-pdf':        () => exportPDF(),

  // Einkauf
  'shop-check':         (_, e, el) => { el.nextElementSibling?.classList.toggle('done', el.checked); },
  'shop-by-recipe':    () => setShopView('recipe'),
  'shop-by-ing':       () => setShopView('ing'),
  'export-shop-pdf':   () => exportShopPDF(),

  // Archiv
  'view-archive-week': ({ idx }) => viewArchiveWeek(+idx),

  // Discover
  'open-discover':     () => openDiscover(),
  'close-discover':    () => closeDiscover(),
  'import-recipe':     ({ id }) => importRecipe(id),
  'toggle-discover-r': ({ id }) => toggleDiscoverR(id),
  'discover-load-more':() => discoverLoadMore(),

  // Einstellungen
  'toggle-acc':        ({ id }) => toggleAcc(id),
  'change-theme':      ({ theme }) => changeTheme(theme),
  'add-cat':           () => addCat(),
  'del-cat':           ({ id }) => deleteCat(id),
  'add-auf':           () => addAuf(),
  'del-auf':           ({ id }) => deleteAuf(id),
  'add-einh':          () => addEinh(),
  'del-einh':          ({ val }) => deleteEinh(val),
  'save-family-name':  () => saveFamilyName(),
  'create-invitation': () => createInvitation(),
  'join-family':       () => joinFamily(),
  'load-family-members': () => {},

  // Change-Actions
  'set-sort-order':    (_, e, el) => setSortOrder(el.value),
  'set-portions':      ({ i }, e, el) => setPortions(+i, +el.value),
  'set-note':          ({ i }, e, el) => setNote(+i, el?.value ?? ''),
  'upd-r':             ({ rid, key }, e, el) => updR(+rid, key, el.value),
  'upd-src':           ({ rid, key }, e, el) => updSrc(+rid, key, el.value),
  'update-cat':        ({ id }, e, el) => updateCat(id, el.value),
  'update-cat-field':  ({ id, field }, e, el) => updateCatField(id, field, el.value),
  'update-auf':        ({ id }, e, el) => updateAuf(id, el.value),
  'update-auf-field':  ({ id, field }, e, el) => updateAufField(id, field, el.value),

  // Input-Actions
  'filter-recipes':    (_, e, el) => renderRecipes(el.value.toLowerCase().trim()),
  'filter-discover':   () => filterDiscover(),
  'set-discover-cat':  (_, e, el) => setDiscoverCat(el.dataset.val),
  'set-discover-auf':  (_, e, el) => setDiscoverAuf(el.dataset.val),

  // Draw Modal
  'toggle-draw-pill':  (_, e, el) => toggleDrawPill(el || e.target.closest('[data-action]') || e.target),
  'set-time-pill':     ({ val }) => setTimePill(+val),
  'set-note':          ({ i }, e, el) => setNote(+i, el?.value ?? ''),
});

// ── Tab-Wechsel ───────────────────────────────────────────────────────────────
function _showTab(t) {
  _activeTab = t;
  showTab(t);
  if (t === 'einkauf') renderShop();
  if (t === 'archiv') renderArchiv();
  if (t === 'einstellungen') renderSettings();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.id === 'nav-' + t);
  });
  document.querySelectorAll('.header-nav-tab').forEach(el => {
    el.classList.toggle('active', el.id === 'hnav-' + t);
  });

  const gear = document.getElementById('nav-einstellungen');
  if (gear) gear.style.color = t === 'einstellungen' ? 'var(--meadow)' : '';

  updateFAB(t);
}

// ── renderAll (used by auth after login) ─────────────────────────────────────
export function renderAll() {
  _loggedIn = true;
  renderRFilters();
  renderRecipes();
  renderWeek();
  populateQESelects();
  updateFAB('rezepte');
}

function populateQESelects() {
  const catSel = document.getElementById('qe-cat');
  const aufSel = document.getElementById('qe-auf');
  const { settings } = getState();
  if (catSel) catSel.innerHTML = settings.cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  if (aufSel) aufSel.innerHTML = settings.aufwand.map(a => `<option value="${a.id}">${a.label}</option>`).join('');
}

// ── Store-Subscriber ──────────────────────────────────────────────────────────
let _activeTab = 'rezepte';
let _loggedIn = false;
subscribe(() => {
  if (!_loggedIn) return;
  populateQESelects();
  if (_activeTab === 'woche')         renderWeek();
  if (_activeTab === 'einkauf')       renderShop();
  if (_activeTab === 'archiv')        renderArchiv();
  if (_activeTab === 'einstellungen') renderSettings();
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  const restored = await tryRestoreSession();
  if (!restored) {
    document.getElementById('login-screen').style.display = 'flex';
  }
})();
