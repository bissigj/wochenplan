import { showTab, toast, initTheme } from './ui.js';
import { D } from './data.js';
import { doLogin, doRegister, doLogout, showLogin, showRegister, tryRestoreSession, obCreateFamily, obJoinFamily } from './auth.js';
import { renderRFilters, renderRecipes, toggleRF, toggleER, delR, addIng, delIng, addStep, delStep, updR, setSrcType, updSrc, openQE, closeQE,
        saveQE, setSortOrder, uploadRecipeImage, removeRecipeImage, togglePublic, openSrcEdit, clearAufFilter, openUrlImport,
        closeUrlImport, parseRecipeUrl, toggleCatPanel, toggleCatFilter, clearCatFilter } from './recipes.js';
import { renderWeek, openDrawModal, closeDrawModal, toggleDrawPill, setTimePill, drawWeek, backToCurrent, toggleDay, toggleDayActive, rerollDay, setPortions, setNote } from './week.js';
import { renderShop, setShopView } from './shopping.js';
import { renderArchiv, viewArchiveWeek } from './archive.js';
import { exportPDF, exportRecipePDF, exportShopPDF } from './pdf.js';
import { openDiscover, closeDiscover, importRecipe, filterDiscover, setDiscoverCat, setDiscoverAuf, toggleDiscoverR, discoverLoadMore } from './discover.js';
import { renderSettings, toggleAcc, changeTheme, addCat, updateCat, updateCatColor, updateCatBg, deleteCat, addAuf, updateAuf, updateAufColor, updateAufBg,
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
  const fabGroup   = document.getElementById('fab-group');
  const fab        = document.getElementById('fab-add');
  const fabDiscover = document.getElementById('fab-discover');
  if (!fabGroup || !fab) return;

  if (t === 'rezepte') {
    fab.innerHTML = FAB_ICONS.add;
    fab.onclick   = () => openQE();
    fab.title     = 'Rezept hinzufügen';
    fabDiscover.style.display = '';
    fabGroup.classList.remove('hidden');
  } else if (t === 'woche') {
    fab.innerHTML = FAB_ICONS.generate;
    fab.onclick   = () => openDrawModal();
    fab.title     = 'Woche neu generieren';
    fabDiscover.style.display = 'none';
    fabGroup.classList.remove('hidden');
  } else if (t === 'einkauf') {
    fab.innerHTML = FAB_ICONS.pdf;
    fab.onclick   = () => exportShopPDF();
    fab.title     = 'Einkaufsliste als PDF';
    fabDiscover.style.display = 'none';
    fabGroup.classList.remove('hidden');
  } else {
    fabGroup.classList.add('hidden');
  }
}

// ── Global functions (needed for onclick="" in HTML) ──────────────────────────
window.doLogin           = doLogin;
window.doRegister        = doRegister;
window.doLogout          = doLogout;
window.obCreateFamily    = obCreateFamily;
window.obJoinFamily      = obJoinFamily;
window.showLogin         = showLogin;
window.showRegister      = showRegister;
window.openSrcEdit       = openSrcEdit;
window.clearAufFilter    = clearAufFilter;
window.undoDelR          = () => { if (window._undoDelR) window._undoDelR(); };
window.toggleCatPanel    = toggleCatPanel;
window.toggleCatFilter   = toggleCatFilter;
window.clearCatFilter    = clearCatFilter;

const PAGE_TITLES = { rezepte: 'Rezepte', woche: 'Wochenplan', einkauf: 'Einkauf', archiv: 'Archiv', einstellungen: 'Einstellungen' };

window.showTab = (t) => {
  showTab(t);
  if (t === 'einkauf') renderShop();
  if (t === 'archiv') renderArchiv();
  if (t === 'einstellungen') renderSettings();

  // Mobile Bottom-Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.id === 'nav-' + t);
  });

  // Desktop Header-Nav
  document.querySelectorAll('.header-nav-tab').forEach(el => {
    el.classList.toggle('active', el.id === 'hnav-' + t);
  });

  // Gear-Button Farbe (Mobile)
  const gear = document.getElementById('nav-einstellungen');
  if (gear) gear.style.color = t === 'einstellungen' ? 'var(--meadow)' : '';

  // FAB kontextabhängig aktualisieren
  updateFAB(t);
};

window.toggleRF          = toggleRF;
window.toggleER          = toggleER;
window.delR              = delR;
window.addIng            = addIng;
window.delIng            = delIng;
window.addStep           = addStep;
window.delStep           = delStep;
window.updR              = updR;
window.setSrcType        = setSrcType;
window.updSrc            = updSrc;
window.openQE            = openQE;
window.closeQE           = closeQE;
window.saveQE            = saveQE;
window.openDrawModal     = openDrawModal;
window.closeDrawModal    = closeDrawModal;
window.toggleDrawPill    = toggleDrawPill;
window.setTimePill       = setTimePill;
window.drawWeek          = drawWeek;
window.backToCurrent     = backToCurrent;
window.toggleDay         = toggleDay;
window.toggleDayActive   = toggleDayActive;
window.rerollDay         = rerollDay;
window.setPortions       = setPortions;
window.setNote           = setNote;
window.setShopView       = setShopView;
window.viewArchiveWeek   = viewArchiveWeek;
window.exportPDF         = exportPDF;
window.exportRecipePDF   = exportRecipePDF;
window.setSortOrder      = setSortOrder;
window.uploadRecipeImage = uploadRecipeImage;
window.removeRecipeImage = removeRecipeImage;
window.togglePublic      = togglePublic;
window.exportShopPDF     = exportShopPDF;
window.openDiscover      = openDiscover;
window.closeDiscover     = closeDiscover;
window.importRecipe      = importRecipe;
window.filterDiscover    = filterDiscover;
window.setDiscoverCat    = setDiscoverCat;
window.setDiscoverAuf    = setDiscoverAuf;
window.toggleDiscoverR   = toggleDiscoverR;
window.discoverLoadMore  = discoverLoadMore;
window.renderSettings    = renderSettings;
window.toggleAcc         = toggleAcc;
window.changeTheme       = changeTheme;
window.addCat            = addCat;
window.updateCat         = updateCat;
window.updateCatColor    = updateCatColor;
window.updateCatBg       = updateCatBg;
window.deleteCat         = deleteCat;
window.addAuf            = addAuf;
window.updateAuf         = updateAuf;
window.updateAufColor    = updateAufColor;
window.updateAufBg       = updateAufBg;
window.deleteAuf         = deleteAuf;
window.addEinh           = addEinh;
window.deleteEinh        = deleteEinh;
window.saveFamilyName    = saveFamilyName;
window.createInvitation  = createInvitation;
window.openUrlImport     = openUrlImport;
window.closeUrlImport    = closeUrlImport;
window.parseRecipeUrl    = parseRecipeUrl;
window.joinFamily        = joinFamily;

// ── renderAll (used by auth after login) ─────────────────────────────────────
export function renderAll() {
  renderRFilters();
  renderRecipes();
  renderWeek();
  populateQESelects();
  updateFAB('rezepte');
}

function populateQESelects() {
  const catSel = document.getElementById('qe-cat');
  const aufSel = document.getElementById('qe-auf');
  if (catSel) catSel.innerHTML = D.settings.cats.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  if (aufSel) aufSel.innerHTML = D.settings.aufwand.map(a => `<option value="${a.id}">${a.label}</option>`).join('');
}

window.filterRecipes = (q) => { renderRecipes(q.toLowerCase().trim()); };

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  const restored = await tryRestoreSession();
  if (!restored) {
    document.getElementById('login-screen').style.display = 'flex';
  }
})();
