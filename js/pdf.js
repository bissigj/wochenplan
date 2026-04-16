import { D } from './data.js';
import { fmtIng, toast } from './ui.js';
import { getActivePlan } from './shopping.js';

export function exportPDF() {
  const plan = getActivePlan();
  if (!plan.days || !plan.days.length) { toast('Keine Woche zum Exportieren.'); return; }
  const activeDays = plan.days.filter(d => d.active && d.recipeId);
  const agg = {};
  activeDays.forEach(d => {
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
  const shopItems = Object.values(agg).sort((a, b) => a.n.localeCompare(b.n));
  const CC = { pasta: '#854F0B', curry: '#993C1D', suppe: '#0F6E56', salat: '#3B6D11', auflauf: '#534AB7', 'frühstück': '#993556', sonstiges: '#5F5E5A' };
  const AC = { einfach: '#27500A', mittel: '#633806', schwer: '#712B13' };

  const recipePages = activeDays.map(d => {
    const r = D.recipes.find(r => r.id === d.recipeId);
    if (!r) return '';
    const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
    const srcLine = r.src && r.src.val
      ? (r.src.type === 'url' ? `<a href="${r.src.val}">${r.src.val}</a>` : `📖 ${r.src.val}${r.src.seite ? ', S.' + r.src.seite : ''}`)
      : '';
    return `<div class="page">
      <div class="day-badge">${d.day}</div><h2>${r.name}</h2>
      <div class="meta-row">
        <span class="tag" style="background:${CC[r.cat] || '#888'}22;color:${CC[r.cat] || '#888'}">${r.cat}</span>
        <span class="tag" style="background:${AC[r.auf] || '#888'}22;color:${AC[r.auf] || '#888'}">${r.auf}</span>
        ${r.time ? `<span class="chip">⏱ ${r.time} min</span>` : ''}
        <span class="chip">👤 ${d.portions || plan.portions} Portionen</span>
      </div>
      <div class="two-col">
        <div><h3>Zutaten</h3><ul>${(r.ings || []).map(ing => `<li>${fmtIng(ing, factor)}</li>`).join('') || '<li>—</li>'}</ul></div>
        <div><h3>Zubereitung</h3>${(r.steps || []).map((s, i) => `<div class="step"><span class="snum">${i + 1}</span>${s}</div>`).join('') || '<p>—</p>'}</div>
      </div>
      ${srcLine ? `<div class="src-line">${srcLine}</div>` : ''}
      ${d.note ? `<div class="note">📝 ${d.note}</div>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${plan.kw}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;font-size:12pt;color:#1a1a18}
  .page{padding:2cm;min-height:100vh;page-break-after:always}.page:last-child{page-break-after:avoid}
  h1{font-size:22pt;font-weight:500;margin-bottom:6px}h2{font-size:17pt;font-weight:500;margin-bottom:10px}
  h3{font-size:11pt;font-weight:600;margin-bottom:8px;color:#444}.subtitle{font-size:11pt;color:#888;margin-bottom:24px}
  .week-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:28px}
  .day-box{border:0.5px solid #ccc;border-radius:8px;padding:12px}.day-name{font-size:9pt;color:#888;margin-bottom:3px}
  .day-recipe{font-size:12pt;font-weight:500;margin-bottom:5px}.day-note{font-size:9pt;color:#666;margin-top:4px}
  .tag{font-size:9pt;padding:2px 8px;border-radius:99px;display:inline-block;margin-right:4px}
  .meta-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
  .chip{font-size:9pt;color:#666;background:#f5f5f1;padding:2px 8px;border-radius:99px}
  .two-col{display:grid;grid-template-columns:1fr 1.4fr;gap:20px;margin-bottom:16px}
  ul{list-style:none;padding:0}ul li{font-size:10.5pt;padding:3px 0;border-bottom:0.5px solid #eee}
  .step{display:flex;gap:8px;align-items:flex-start;margin-bottom:7px}
  .snum{width:18px;height:18px;border-radius:50%;background:#eee;color:#555;font-size:9pt;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
  .src-line{font-size:9pt;color:#666;margin-top:12px;padding-top:8px;border-top:0.5px solid #eee}.src-line a{color:#185FA5}
  .note{font-size:9.5pt;color:#666;background:#f9f8f4;border-radius:6px;padding:8px 12px;margin-top:10px}
  .day-badge{font-size:9pt;color:#888;font-weight:500;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em}
  .shop-grid{columns:2;gap:16px;margin-top:8px}
  .shop-item-p{display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid #eee;font-size:10.5pt;break-inside:avoid}
  .shop-qty-p{color:#888;font-size:10pt}.shop-recipes{font-size:8.5pt;color:#aaa;margin-left:4px}
  @media print{.page{padding:1.5cm}}</style></head><body>
  <div class="page">
    <h1>${plan.kw}</h1><div class="subtitle">Wochenplan — ${activeDays.length} Tage</div>
    <div class="week-grid">${plan.days.map(d => {
    if (!d.active || !d.recipeId) return `<div class="day-box" style="background:#fafafa"><div class="day-name">${d.day}</div><div style="color:#ccc">—</div></div>`;
    const r = D.recipes.find(r => r.id === d.recipeId);
    if (!r) return '';
    return `<div class="day-box"><div class="day-name">${d.day}</div><div class="day-recipe">${r.name}</div>
      <div><span class="tag" style="background:${CC[r.cat] || '#888'}22;color:${CC[r.cat] || '#888'}">${r.cat}</span>
      <span class="tag" style="background:${AC[r.auf] || '#888'}22;color:${AC[r.auf] || '#888'}">${r.auf}</span></div>
      ${d.note ? `<div class="day-note">📝 ${d.note}</div>` : ''}</div>`;
  }).join('')}</div>
  </div>
  ${recipePages}
  <div class="page"><h1>Einkaufsliste</h1><div class="subtitle">${plan.kw} — aggregiert</div>
    <div class="shop-grid">${shopItems.map(it => {
    const m = Number.isInteger(it.m) ? it.m : Math.round(it.m * 10) / 10;
    return `<div class="shop-item-p"><span>${it.n}<span class="shop-recipes">${it.recipes.join(' · ')}</span></span><span class="shop-qty-p">${m} ${it.u}</span></div>`;
  }).join('')}</div>
  </div></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const pw = window.open(url, '_blank');
  if (pw) { pw.onload = () => { setTimeout(() => { pw.print(); URL.revokeObjectURL(url); }, 300); }; }
}
