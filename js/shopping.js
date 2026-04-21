import { D } from './data.js';
import { fmtIng } from './ui.js';
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
      const key = ing.n.toLowerCase().trim() + ':' + ing.u;
      if (!agg[key]) agg[key] = { n: ing.n, u: ing.u, m: 0, recipes: [] };
      agg[key].m += ing.m * factor;
      if (!agg[key].recipes.includes(r.name)) agg[key].recipes.push(r.name);
    });
  });
  return Object.values(agg).sort((a, b) => a.n.localeCompare(b.n));
}

export function getActivePlan() {
  return viewingArchive || D.weekPlan;
}

export function setShopView(v) {
  shopView = v;
  document.getElementById('s-by-recipe').classList.toggle('on', v === 'recipe');
  document.getElementById('s-by-ing').classList.toggle('on', v === 'ing');
  document.getElementById('s-by-recipe').classList.toggle('off', v !== 'recipe');
  document.getElementById('s-by-ing').classList.toggle('off', v !== 'ing');
  renderShop();
}

export function renderShop() {
  const el = document.getElementById('shop-view');
  const plan = getActivePlan();
  if (!plan.days || !plan.days.some(d => d.active && d.recipeId)) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><div class="empty-state-title">Keine aktiven Tage</div><div class="empty-state-sub">Generiere zuerst einen Wochenplan.</div></div>';
    return;
  }
  const activeDays = plan.days.filter(d => d.active && d.recipeId);

  if (shopView === 'recipe') {
    el.innerHTML = activeDays.map(d => {
      const r = D.recipes.find(r => r.id === d.recipeId);
      if (!r || !r.ings || !r.ings.length) return '';
      const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
      return `<div class="card shop-group">
        <div class="shop-group-title">${r.name} <span style="font-weight:400;color:var(--text3)">${d.day}</span></div>
        ${r.ings.map((ing, i) => `<div class="shop-item">
          <input type="checkbox" id="sri-${d.day}-${i}" onchange="this.nextElementSibling.classList.toggle('done',this.checked)" />
          <label for="sri-${d.day}-${i}">${fmtIng(ing, factor)}</label>
        </div>`).join('')}
      </div>`;
    }).join('') || '<div class="empty">Keine Zutaten hinterlegt.</div>';
  } else {
    const items = aggregateIngredients(plan);
    if (!items.length) { el.innerHTML = '<div class="empty">Keine Zutaten hinterlegt.</div>'; return; }
    el.innerHTML = '<div class="card">' + items.map((it, i) => {
      const m = Number.isInteger(it.m) ? it.m : Math.round(it.m * 10) / 10;
      return `<div class="shop-item">
        <input type="checkbox" id="sai-${i}" onchange="this.nextElementSibling.classList.toggle('done',this.checked)" />
        <label for="sai-${i}">
          <span style="font-weight:500">${it.n}</span>
          <span style="display:block;font-size:11px;color:var(--text3);margin-top:1px">${it.recipes.join(' · ')}</span>
        </label>
        <span class="shop-qty">${m} ${it.u}</span>
      </div>`;
    }).join('') + '</div>';
  }
}
