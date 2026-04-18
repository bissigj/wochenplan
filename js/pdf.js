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
      ? (r.src.type === 'url' ? `<a href="${r.src.val}">${r.src.val}</a>` : `📖 ${r.src.val}${r.src.seite ? ', S. ' + r.src.seite : ''}`)
      : '';
    const ingsHTML = (r.ings || []).map(ing => {
      const m = ing.m > 0 ? (Number.isInteger(ing.m * factor) ? ing.m * factor : (ing.m * factor).toFixed(1)) : '';
      const qty = [m, ing.u].filter(Boolean).join(' ');
      return `<div class="ing-item"><span class="ing-name">${ing.n}</span><span class="ing-qty">${qty}</span></div>`;
    }).join('') || '<div class="ing-item"><span class="ing-name">—</span></div>';
    return `<div class="page">
      ${r.img ? `<div style="width:100%;height:200px;background-image:url('${r.img}');background-size:cover;background-position:center;border-radius:8px;margin-bottom:20px"></div>` : ''}
      <div class="recipe-header">
        <div class="recipe-day">${d.day}</div>
        <div class="recipe-name">${r.name}</div>
        <div class="meta-row">
          <span class="tag" style="background:${CC[r.cat]||'#888'}18;color:${CC[r.cat]||'#888'}">${r.cat}</span>
          <span class="tag" style="background:${AC[r.auf]||'#888'}18;color:${AC[r.auf]||'#888'}">${r.auf}</span>
          ${r.time ? `<span class="chip">· ${r.time} min</span>` : ''}
          <span class="chip">· ${d.portions || plan.portions} Portionen</span>
        </div>
      </div>
      <div class="two-col">
        <div>
          <div class="col-title">Zutaten</div>
          ${ingsHTML}
        </div>
        <div>
          <div class="col-title">Zubereitung</div>
          ${(r.steps || []).map((s, i) => `<div class="step"><span class="snum">${i + 1}</span><span class="step-text">${s}</span></div>`).join('') || '<p>—</p>'}
        </div>
      </div>
      ${srcLine ? `<div class="src-line">${srcLine}</div>` : ''}
      ${d.note ? `<div class="note">${d.note}</div>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${plan.kw}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    /* Page */
    .page{padding:2cm 2cm 1.5cm;min-height:100vh;page-break-after:always;position:relative}
    .page:last-child{page-break-after:avoid}
    @media print{
     .page{padding:1.5cm 1.5cm 1cm}
     @page{margin:0}
     body{margin:1.5cm}
    }

    /* Cover page */
    .cover-accent{height:4px;background:#598234;border-radius:2px;margin-bottom:2cm}
    .cover-kw{font-size:28pt;font-weight:700;color:#1a1a1a;letter-spacing:-1px;margin-bottom:4px}
    .cover-sub{font-size:11pt;color:#888;margin-bottom:1.5cm}
    .week-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:1cm}
    .day-box{border-radius:8px;padding:12px 14px;border-left:3px solid #e0e0e0;background:#fafafa}
    .day-box.active{background:#f8f9f4;border-left-color:#598234}
    .day-name{font-size:8pt;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
    .day-recipe{font-size:11pt;font-weight:600;color:#1a1a1a;margin-bottom:6px;line-height:1.3}
    .day-tags{display:flex;gap:5px;flex-wrap:wrap}
    .day-note{font-size:8.5pt;color:#666;margin-top:5px;font-style:italic}
    .day-inactive{color:#ccc;font-size:10pt}

    /* Recipe pages */
    .recipe-header{border-left:4px solid #598234;padding-left:14px;margin-bottom:18px}
    .recipe-day{font-size:8pt;font-weight:700;color:#598234;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
    .recipe-name{font-size:22pt;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.1;margin-bottom:10px}
    .meta-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .tag{font-size:8.5pt;padding:2px 9px;border-radius:99px;display:inline-block;font-weight:500}
    .chip{font-size:8.5pt;color:#666;padding:2px 0}

    /* Two column layout */
    .two-col{display:grid;grid-template-columns:1fr 1.5fr;gap:28px;margin-top:22px}
    .col-title{font-size:8pt;font-weight:700;color:#598234;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #598234}

    /* Ingredients */
    .ing-item{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.5px solid #f0f0f0;font-size:10pt}
    .ing-name{color:#1a1a1a}
    .ing-qty{color:#666;font-size:9.5pt;text-align:right;padding-left:12px;white-space:nowrap}

    /* Steps */
    .step{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
    .snum{width:20px;height:20px;border-radius:50%;background:#598234;color:#fff;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
    .step-text{font-size:10pt;line-height:1.6;color:#1a1a1a}

    /* Source + note */
    .src-line{font-size:8.5pt;color:#888;margin-top:16px;padding-top:10px;border-top:.5px solid #eee}
    .src-line a{color:#598234}
    .note{font-size:9pt;color:#555;background:#f8f9f4;border-left:3px solid #AEBD38;padding:8px 12px;margin-top:12px;border-radius:0 6px 6px 0}

    /* Shopping list */
    .shop-title{font-size:22pt;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;margin-bottom:4px}
    .shop-sub{font-size:10pt;color:#888;margin-bottom:1cm}
    .shop-grid{columns:2;gap:20px}
    .shop-item-p{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.5px solid #f0f0f0;font-size:10pt;break-inside:avoid}
    .shop-name{color:#1a1a1a}
    .shop-recipes{font-size:8pt;color:#aaa;margin-left:5px}
    .shop-qty{color:#598234;font-weight:600;font-size:9.5pt;white-space:nowrap;padding-left:10px}
  </style></head><body>

  <!-- Cover -->
  <div class="page">
    <div class="cover-accent"></div>
    <div class="cover-kw">Wochenplan</div>
    <div class="cover-sub">${activeDays.length} Tage</div>
    <div class="week-grid">${plan.days.map(d => {
      if (!d.active || !d.recipeId) return `<div class="day-box"><div class="day-name">${d.day}</div><div class="day-inactive">—</div></div>`;
      const r = D.recipes.find(r => r.id === d.recipeId);
      if (!r) return '';
      return `<div class="day-box active" style="${r.img ? 'padding:0;overflow:hidden' : ''}">
        ${r.img ? `<div style="width:100%;height:80px;background-image:url('${r.img}');background-size:cover;background-position:center"></div><div style="padding:10px 14px">` : ''}
        <div class="day-name">${d.day}</div>
        <div class="day-recipe">${r.name}</div>
        <div class="day-tags">
          <span class="tag" style="background:${CC[r.cat]||'#888'}18;color:${CC[r.cat]||'#888'}">${r.cat}</span>
          <span class="tag" style="background:${AC[r.auf]||'#888'}18;color:${AC[r.auf]||'#888'}">${r.auf}</span>
        </div>
        ${d.note ? `<div class="day-note">${d.note}</div>` : ''}
        ${r.img ? '</div>' : ''}
      </div>`;
    }).join('')}</div>
  </div>

  <!-- Recipe pages -->
  ${recipePages}

  <!-- Shopping list -->
  <div class="page">
    <div class="cover-accent"></div>
    <div class="shop-title">Einkaufsliste</div>
    <div class="shop-sub">aggregiert</div>
    <div class="shop-grid">${shopItems.map(it => {
      const m = it.m > 0 ? (Number.isInteger(it.m) ? it.m : Math.round(it.m * 10) / 10) : '';
      const qty = m ? `${m} ${it.u}`.trim() : it.u || '';
      return `<div class="shop-item-p">
        <span class="shop-name">${it.n}<span class="shop-recipes">${it.recipes.join(' · ')}</span></span>
        <span class="shop-qty">${qty}</span>
      </div>`;
    }).join('')}</div>
  </div>

  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const pw = window.open(url, '_blank');
  if (pw) { pw.onload = () => { setTimeout(() => { pw.print(); URL.revokeObjectURL(url); }, 300); }; }
}

export function exportRecipePDF(id) {
  const r = D.recipes.find(r => r.id === id);
  if (!r) return;
  const CC = { pasta:'#854F0B',curry:'#993C1D',suppe:'#0F6E56',salat:'#3B6D11',auflauf:'#534AB7','frühstück':'#993556',sonstiges:'#5F5E5A' };
  const AC = { einfach:'#27500A',mittel:'#633806',schwer:'#712B13' };
  const ingsHTML = (r.ings || []).map(ing => {
    const m = ing.m > 0 ? (Number.isInteger(ing.m) ? ing.m : ing.m.toFixed(1)) : '';
    const qty = [m, ing.u].filter(Boolean).join(' ');
    return `<div class="ing-item"><span class="ing-name">${ing.n}</span><span class="ing-qty">${qty}</span></div>`;
  }).join('') || '<div class="ing-item"><span class="ing-name">—</span></div>';
  const srcLine = r.src && r.src.val
    ? (r.src.type === 'url' ? `<a href="${r.src.val}">${r.src.val}</a>` : `📖 ${r.src.val}${r.src.seite ? ', S. ' + r.src.seite : ''}`)
    : '';
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${r.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;font-size:11pt;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:2cm}
    .accent{height:4px;background:#598234;border-radius:2px;margin-bottom:1.5cm}
    .recipe-header{border-left:4px solid #598234;padding-left:14px;margin-bottom:18px}
    .recipe-name{font-size:22pt;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.1;margin-bottom:10px}
    .meta-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .tag{font-size:8.5pt;padding:2px 9px;border-radius:99px;display:inline-block;font-weight:500}
    .chip{font-size:8.5pt;color:#666;padding:2px 0}
    .two-col{display:grid;grid-template-columns:1fr 1.5fr;gap:28px;margin-top:22px}
    .col-title{font-size:8pt;font-weight:700;color:#598234;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #598234}
    .ing-item{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.5px solid #f0f0f0;font-size:10pt}
    .ing-name{color:#1a1a1a}.ing-qty{color:#666;font-size:9.5pt;white-space:nowrap;padding-left:12px}
    .step{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
    .snum{width:20px;height:20px;border-radius:50%;background:#598234;color:#fff;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
    .step-text{font-size:10pt;line-height:1.6}
    .src-line{font-size:8.5pt;color:#888;margin-top:16px;padding-top:10px;border-top:.5px solid #eee}
    .src-line a{color:#598234}
    @media print{@page{margin:0}body{margin:1.5cm}}
  </style></head><body>
  <div class="page">
    <div class="accent"></div>
    <div class="recipe-header">
      <div class="recipe-name">${r.name}</div>
      <div class="meta-row">
        <span class="tag" style="background:${CC[r.cat]||'#888'}18;color:${CC[r.cat]||'#888'}">${r.cat}</span>
        <span class="tag" style="background:${AC[r.auf]||'#888'}18;color:${AC[r.auf]||'#888'}">${r.auf}</span>
        ${r.time ? `<span class="chip">· ${r.time} min</span>` : ''}
        <span class="chip">· ${r.portions || 2} Portionen</span>
      </div>
    </div>
    <div class="two-col">
      <div>
        <div class="col-title">Zutaten</div>
        ${ingsHTML}
      </div>
      <div>
        <div class="col-title">Zubereitung</div>
        ${(r.steps || []).map((s, i) => `<div class="step"><span class="snum">${i+1}</span><span class="step-text">${s}</span></div>`).join('') || '<p>—</p>'}
      </div>
    </div>
    ${srcLine ? `<div class="src-line">${srcLine}</div>` : ''}
  </div>
  </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const pw = window.open(url, '_blank');
  if (pw) { pw.onload = () => { setTimeout(() => { pw.print(); URL.revokeObjectURL(url); }, 300); }; }
}
