import { D } from './data.js';
import { fmtIng, esc, formatAmount } from './ui.js';
import { viewingArchive } from './week.js';

export let shopView = 'recipe';

// ── Shared aggregation ────────────────────────────────────────────────────────
export function aggregateIngredients(plan) {
  const agg = {};
  (plan.days || []).filter(d => d.active && d.recipeId).forEach(d => {
    const r = D.recipes.find(r => r.id === d.recipeId);
    if (!r || !r.ings) return;
    const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
    r.ings.forEach(ing => {
      const key = (ing.n || '').toLowerCase().trim() + ':' + (ing.u || '');
      if (!agg[key]) agg[key] = { n: ing.n, u: ing.u, m: 0, recipes: [] };
      agg[key].m += (ing.m || 0) * factor;
      if (!agg[key].recipes.includes(r.name)) agg[key].recipes.push(r.name);
    });
  });
  return Object.values(agg).sort((a, b) => (a.n || '').localeCompare(b.n || ''));
}

export function getActivePlan() {
  return viewingArchive || D.weekPlan;
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
      const r = D.recipes.find(r => r.id === d.recipeId);
      if (!r || !r.ings || !r.ings.length) return '';
      const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
      return `<div class="card shop-group">
        <div class="shop-group-title">${esc(r.name)} <span style="font-weight:400;color:var(--text3)">${esc(d.day)}</span></div>
        ${r.ings.map((ing, i) => `<div class="shop-item">
          <input type="checkbox" id="sri-${esc(d.day)}-${i}" onchange="this.nextElementSibling.classList.toggle('done',this.checked)" />
          <label for="sri-${esc(d.day)}-${i}">${fmtIng(ing, factor)}</label>
        </div>`).join('')}
      </div>`;
    }).join('') || '<div class="empty">Keine Zutaten hinterlegt.</div>';
  } else {
    const items = aggregateIngredients(plan);
    if (!items.length) { el.innerHTML = '<div class="empty">Keine Zutaten hinterlegt.</div>'; return; }
    el.innerHTML = '<div class="card">' + items.map((it, i) => {
      const m = formatAmount(it.m);
      const qty = m ? `${m} ${esc(it.u || '')}`.trim() : esc(it.u || '');
      return `<div class="shop-item">
        <input type="checkbox" id="si-${i}" onchange="this.nextElementSibling.classList.toggle('done',this.checked)" />
        <label for="si-${i}">${esc(it.n || '')} <span style="color:var(--text3);font-size:11px">· ${it.recipes.map(esc).join(' · ')}</span></label>
        <span class="shop-qty">${qty}</span>
      </div>`;
    }).join('') + '</div>';
  }
}
