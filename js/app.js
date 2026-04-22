import { showTab, toast, initTheme } from './ui.js';
import { D } from './data.js';
import { doLogin, doRegister, doLogout, showLogin, showRegister, tryRestoreSession, obCreateFamily, obJoinFamily } from './auth.js';
import { renderRFilters, renderRecipes, toggleRF, toggleER, delR, addIng, delIng, addStep, delStep, updR, setSrcType, updSrc, openQE, closeQE, saveQE, setSortOrder, uploadRecipeImage, removeRecipeImage, togglePublic } from './recipes.js';
import { renderWeek, openDrawModal, closeDrawModal, toggleDrawPill, setTimePill, drawWeek, backToCurrent, toggleDay, toggleDayActive, rerollDay, setPortions, setNote } from './week.js';
import { renderShop, setShopView } from './shopping.js';
import { renderArchiv, viewArchiveWeek } from './archive.js';
import { exportPDF, exportRecipePDF, exportShopPDF } from './pdf.js';
import { openDiscover, closeDiscover, importRecipe, filterDiscover, setDiscoverCat, setDiscoverAuf, toggleDiscoverR, discoverLoadMore } from './discover.js';
import { renderSettings, toggleAcc, changeTheme, addCat, updateCat, updateCatColor, updateCatBg, deleteCat, addAuf, updateAuf, updateAufColor, updateAufBg, deleteAuf, addEinh, deleteEinh, saveFamilyName, createInvitation, joinFamily } from './settings.js';
import { openUrlImport, closeUrlImport, parseRecipeUrl } from './parser.js';

// ── Apply saved theme before first paint ──────────────────────────────────────
initTheme();

// ── Global functions (needed for onclick="" in HTML) ──────────────────────────
window.doLogin           = doLogin;
window.doRegister        = doRegister;
window.doLogout          = doLogout;
window.obCreateFamily    = obCreateFamily;
window.obJoinFamily      = obJoinFamily;
window.showLogin         = showLogin;
window.showRegister      = showRegister;

const PAGE_TITLES = { rezepte: 'Rezepte', woche: 'Wochenplan', einkauf: 'Einkauf', archiv: 'Archiv', einstellungen: 'Einstellungen' };

window.showTab = (t) => {
  showTab(t);
  if (t === 'einkauf') renderShop();
  if (t === 'archiv') renderArchiv();
  if (t === 'einstellungen') renderSettings();
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.id === 'nav-' + t);
  });
  const gear = document.getElementById('nav-einstellungen');
  if (gear) gear.style.color = t === 'einstellungen' ? 'var(--meadow)' : '';
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[t] || 'Wochenplan';
  const fabGroup = document.getElementById('fab-group');
  if (fabGroup) fabGroup.classList.toggle('hidden', t !== 'rezepte');
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
window.openUrlImport    = openUrlImport;
window.closeUrlImport   = closeUrlImport;
window.parseRecipeUrl   = parseRecipeUrl;
window.joinFamily        = joinFamily;

// ── renderAll (used by auth after login) ─────────────────────────────────────
export function renderAll() {
  renderRFilters();
  renderRecipes();
  renderWeek();
  populateQESelects();
  const fabGroup = document.getElementById('fab-group');
  if (fabGroup) fabGroup.classList.remove('hidden');
}

function populateQESelects() {
  const catSel = document.getElementById('qe-cat');
  const aufSel = document.getElementById('qe-auf');
  if (catSel) {
    catSel.innerHTML = D.settings.cats.map(c =>
      `<option value="${c.id}">${c.label}</option>`).join('');
  }
  if (aufSel) {
    aufSel.innerHTML = D.settings.aufwand.map(a =>
      `<option value="${a.id}">${a.label}</option>`).join('');
  }
}

window.filterRecipes = (q) => {
  renderRecipes(q.toLowerCase().trim());
};

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  const restored = await tryRestoreSession();
  if (!restored) {
    document.getElementById('login-screen').style.display = 'flex';
  }
})();
