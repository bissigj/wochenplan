import { getState } from './store.js';
import { fmtIng, esc, formatAmount } from './ui.js';
import { viewingArchive } from './week.js';

export let shopView = 'recipe';

// ── Aggregation ───────────────────────────────────────────────────────────────
// Gibt { toBuy: [...], pantry: [...] } zurück
// Matching gegen pantry ist exakt (case-insensitive trim)
export function aggregateIngredients(plan) {
  const { recipes, settings } = getState();
  const pantrySet = new Set((settings.pantry || []).map(p => p.toLowerCase().trim()));
  const agg = {};

  (plan.days || []).filter(d => d.active && d.recipeId).forEach(d => {
    const r = recipes.find(r => r.id === d.recipeId);
    if (!r || !r.ings) return;
    const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
    r.ings.forEach(ing => {
      const key = (ing.n || '').toLowerCase().trim() + ':' + (ing.u || '');
      if (!agg[key]) agg[key] = { n: ing.n, u: ing.u, m: 0, recipes: [] };
      agg[key].m += (ing.m || 0) * factor;
      if (!agg[key].recipes.includes(r.name)) agg[key].recipes.push(r.name);
    });
  });

  const all = Object.values(agg).sort((a, b) => (a.n || '').localeCompare(b.n || '', 'de'));
  const toBuy  = all.filter(it => !pantrySet.has((it.n || '').toLowerCase().trim()));
  const pantry = all.filter(it =>  pantrySet.has((it.n || '').toLowerCase().trim()));
  return { toBuy, pantry };
}

export function getActivePlan() {
  return viewingArchive || getState().weekPlan;
}

export function setShopView(v) {
  shopView = v;
  document.getElementById('s-by-recipe').classList.toggle('on', v === 'recipe');
  document.getElementById('s-by-ing').classList.toggle('on', v === 'ing');
  renderShop();
}

export function renderShop() {
  const el = document.getElementById('shop-view');
  const plan = getActivePlan();
  if (!plan.days || !plan.days.some(d => d.active && d.recipeId)) {
    el.innerHTML = '<div class="empty">Keine aktiven Tage.</div>';
    return;
  }
  const activeDays = plan.days.filter(d => d.active && d.recipeId);

  if (shopView === 'recipe') {
    el.innerHTML = activeDays.map(d => {
      const r = getState().recipes.find(r => r.id === d.recipeId);
      if (!r || !r.ings || !r.ings.length) return '';
      const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
      return `<div class="card shop-group">
        <div class="shop-group-title">${esc(r.name)} <span class="shop-day-label">${esc(d.day)}</span></div>
        ${r.ings.map((ing, i) => `<div class="shop-item">
          <input type="checkbox" id="sri-${esc(d.day)}-${i}" data-change="shop-check" />
          <label for="sri-${esc(d.day)}-${i}">${fmtIng(ing, factor)}</label>
        </div>`).join('')}
      </div>`;
    }).join('') || '<div class="empty">Keine Zutaten hinterlegt.</div>';
    return;
  }

  // ── Aggregierte Ansicht ───────────────────────────────────────────────────
  const { toBuy, pantry } = aggregateIngredients(plan);

  if (!toBuy.length && !pantry.length) {
    el.innerHTML = '<div class="empty">Keine Zutaten hinterlegt.</div>';
    return;
  }

  el.innerHTML = `
    ${_renderShopSection(toBuy, 'einkaufen')}
    ${pantry.length ? _renderPantrySection(pantry) : ''}
  `;
}

function _renderShopItem(it, i, section) {
  const m   = formatAmount(it.m);
  const qty = m ? `${m} ${esc(it.u || '')}`.trim() : esc(it.u || '');
  return `<div class="shop-item">
    <input type="checkbox" id="si-${section}-${i}" data-change="shop-check" />
    <label for="si-${section}-${i}">
      ${esc(it.n || '')}
      <span class="shop-recipe-hint">· ${it.recipes.map(esc).join(' · ')}</span>
    </label>
    <span class="shop-qty">${qty}</span>
    <button class="btn btn--xs shop-pantry-btn" data-action="add-pantry-item" data-val="${esc(it.n)}" title="In den Vorrat verschieben">→ Vorrat</button>
  </div>`;
}

function _renderShopSection(items, section) {
  if (!items.length) return '<div class="card shop-section"><p class="shop-empty">Alle Zutaten im Vorrat 🎉</p></div>';
  return `<div class="card shop-section">
    <div class="shop-section-title">Einkaufen</div>
    ${items.map((it, i) => _renderShopItem(it, i, section)).join('')}
  </div>`;
}

function _renderPantrySection(items) {
  return `<div class="card shop-section shop-section--pantry">
    <div class="shop-section-title">Im Vorrat</div>
    ${items.map((it, i) => {
      const m   = formatAmount(it.m);
      const qty = m ? `${m} ${esc(it.u || '')}`.trim() : esc(it.u || '');
      return `<div class="shop-item shop-item--pantry">
        <input type="checkbox" id="sp-${i}" data-change="shop-check" />
        <label for="sp-${i}">
          ${esc(it.n || '')}
          <span class="shop-recipe-hint">· ${it.recipes.map(esc).join(' · ')}</span>
        </label>
        <span class="shop-qty">${qty}</span>
        <button class="btn btn--xs shop-pantry-btn shop-pantry-btn--remove" data-action="remove-pantry-item" data-val="${esc(it.n)}" title="Wieder einkaufen">← Einkaufen</button>
      </div>`;
    }).join('')}
  </div>`;
}
