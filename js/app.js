import { showTab, toast } from './ui.js';
import { doLogin, doRegister, doLogout, showLogin, showRegister, tryRestoreSession } from './auth.js';
import { renderRFilters, renderRecipes, toggleRF, toggleER, addRecipe, delR, addIng, delIng, addStep, delStep, updR, setSrcType, updSrc, openQE, closeQE, saveQE, setSortOrder, uploadRecipeImage, removeRecipeImage } from './recipes.js';
import { renderWeek, openDrawModal, closeDrawModal, toggleDrawPill, setTimePill, drawWeek, backToCurrent, toggleDay, toggleDayActive, rerollDay, setPortions, setNote } from './week.js';
import { renderShop, setShopView } from './shopping.js';
import { renderArchiv, viewArchiveWeek } from './archive.js';
import { exportPDF, exportRecipePDF } from './pdf.js';

// ── Global functions (needed for onclick="" in HTML) ──────────────────────────
window.doLogin           = doLogin;
window.doRegister        = doRegister;
window.doLogout          = doLogout;
window.showLogin         = showLogin;
window.showRegister      = showRegister;
const PAGE_TITLES = { rezepte: 'Rezepte', woche: 'Wochenplan', einkauf: 'Einkauf', archiv: 'Archiv' };
window.showTab = (t) => {
  showTab(t);
  if (t === 'einkauf') renderShop();
  if (t === 'archiv') renderArchiv();
  // Update bottom nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.id === 'nav-' + t);
  });
  // Update page title
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[t] || 'Wochenplan';
};
window.toggleRF          = toggleRF;
window.toggleER          = toggleER;
window.addRecipe         = addRecipe;
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
window.uploadRecipeImage  = uploadRecipeImage;
window.removeRecipeImage  = removeRecipeImage;

// ── renderAll (used by auth after login) ─────────────────────────────────────
export function renderAll() {
  renderRFilters();
  renderRecipes();
  renderWeek();
}

// ── Search ───────────────────────────────────────────────────────────────────
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
