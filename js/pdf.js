import { D, getCatLabel, getAufLabel } from './data.js';
import { fmtIng, toast, esc, formatAmount } from './ui.js';
import { getActivePlan, aggregateIngredients } from './shopping.js';

// ── PDF Design Tokens ─────────────────────────────────────────────────────────
// Change these to restyle all PDF exports at once
const PDF = {
  brand:    '#598234',   // Meadow – accent bars, step numbers, col titles, links
  moss:     '#AEBD38',   // Moss – note border
  text:     '#1a1a1a',   // Main text
  muted:    '#888',      // Subtitles, chip text, source text
  subtle:   '#666',      // Secondary text, quantities
  faint:    '#aaa',      // Recipe attribution in shopping list
  line:     '#f0f0f0',   // Divider lines
  noteBg:   '#f8f9f4',   // Note background
  coverBg:  '#fafafa',   // Inactive day box background
  activeBg: '#f8f9f4',   // Active day box background
  font:     '-apple-system,"Helvetica Neue",Arial,sans-serif',
};

// ── Shared color helpers ──────────────────────────────────────────────────────
const catColor = (id) => { const c = D.settings.cats.find(c => c.id === id); return c ? c.color : PDF.muted; };
const aufColor = (id) => { const a = D.settings.aufwand.find(a => a.id === id); return a ? a.color : PDF.muted; };
const catBg    = (id) => { const c = D.settings.cats.find(c => c.id === id); return c ? c.bg : PDF.line; };
const aufBg    = (id) => { const a = D.settings.aufwand.find(a => a.id === id); return a ? a.bg : PDF.line; };

// ── URL escape helper (für background-image etc.) ─────────────────────────────
const escUrl = (u) => String(u ?? '').replace(/'/g, '%27').replace(/"/g, '%22');


export function exportShopPDF() {
  const plan = getActivePlan();
  if (!plan.days || !plan.days.some(d => d.active && d.recipeId)) {
    toast('Keine aktive Woche.');
    return;
  }
  const items = aggregateIngredients(plan);
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Einkaufsliste</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:${PDF.font};font-size:11pt;color:${PDF.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:2cm}
    .accent{height:4px;background:${PDF.brand};border-radius:2px;margin-bottom:1.5cm}
    .title{font-size:24pt;font-weight:700;color:${PDF.text};letter-spacing:-0.5px;margin-bottom:4px}
    .sub{font-size:10pt;color:${PDF.muted};margin-bottom:1cm}
    .col-title{font-size:8pt;font-weight:700;color:${PDF.brand};text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid ${PDF.brand}}
    .grid{columns:2;gap:20px}
    .item{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:.5px solid ${PDF.line};font-size:10.5pt;break-inside:avoid}
    .item-name{color:${PDF.text}}
    .item-recipes{font-size:8pt;color:${PDF.faint};margin-left:5px}
    .item-qty{color:${PDF.brand};font-weight:600;font-size:9.5pt;white-space:nowrap;padding-left:10px}
    @media print{@page{margin:0}body{margin:1.5cm}}
  </style></head><body>
  <div class="page">
    <div class="accent"></div>
    <div class="title">Einkaufsliste</div>
    <div class="sub">aggregiert · ${plan.days.filter(d => d.active && d.recipeId).length} Tage</div>
    <div class="col-title">Zutaten</div>
    <div class="grid">${items.map(it => {
      const m = formatAmount(it.m);
      const qty = m ? `${m} ${esc(it.u || '')}`.trim() : esc(it.u || '');
      return `<div class="item">
        <span class="item-name">${esc(it.n || '')}<span class="item-recipes">${it.recipes.map(esc).join(' · ')}</span></span>
        <span class="item-qty">${qty}</span>
      </div>`;
    }).join('')}</div>
  </div>
  </body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const pw = window.open(url, '_blank');
  if (pw) { pw.onload = () => { setTimeout(() => { pw.print(); URL.revokeObjectURL(url); }, 300); }; }
}

export function exportPDF() {
  const plan = getActivePlan();
  if (!plan.days || !plan.days.length) { toast('Keine Woche zum Exportieren.'); return; }
  const activeDays = plan.days.filter(d => d.active && d.recipeId);
  const shopItems = aggregateIngredients(plan);


  const recipePages = activeDays.map(d => {
    const r = D.recipes.find(r => r.id === d.recipeId);
    if (!r) return '';
    const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
    const srcLine = r.src && r.src.val
      ? (r.src.type === 'url' ? `<a href="${esc(r.src.val)}">${esc(r.src.val)}</a>` : `📖 ${esc(r.src.val)}${r.src.seite ? ', S. ' + esc(r.src.seite) : ''}`)
      : '';
    const ingsHTML = (r.ings || []).map(ing => {
      const m = formatAmount((ing.m || 0) * factor);
      const qty = [m, esc(ing.u || '')].filter(Boolean).join(' ');
      return `<div class="ing-item"><span class="ing-name">${esc(ing.n || '')}</span><span class="ing-qty">${qty}</span></div>`;
    }).join('') || '<div class="ing-item"><span class="ing-name">—</span></div>';
    return `<div class="page">
      ${r.img ? `<div class="recipe-img-full" style="background-image:url('${escUrl(r.img)}')"></div>` : ''}
      <div class="recipe-header">
        <div class="recipe-day">${esc(d.day)}</div>
        <div class="recipe-name">${esc(r.name)}</div>
        <div class="meta-row">
          <span class="tag" style="background:${catBg(r.cat)};color:${catColor(r.cat)}">${esc(getCatLabel(r.cat))}</span>
          <span class="tag" style="background:${aufBg(r.auf)};color:${aufColor(r.auf)}">${esc(getAufLabel(r.auf))}</span>
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
          ${(r.steps || []).map((s, i) => `<div class="step"><span class="snum">${i + 1}</span><span class="step-text">${esc(s)}</span></div>`).join('') || '<p>—</p>'}
        </div>
      </div>
      ${srcLine ? `<div class="src-line">${srcLine}</div>` : ''}
      ${d.note ? `<div class="note">${esc(d.note)}</div>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${esc(plan.kw)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:${PDF.font};font-size:11pt;color:${PDF.text};background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    /* Page */
    .page{padding:2cm 2cm 1.5cm;min-height:100vh;page-break-after:always;position:relative}
    .page:last-child{page-break-after:avoid}
    @media print{
     .page{padding:1.5cm 1.5cm 1cm}
     @page{margin:0}
     body{margin:1.5cm}
    }

    /* Cover page */
    .cover-accent{height:4px;background:${PDF.brand};border-radius:2px;margin-bottom:2cm}
    .cover-kw{font-size:28pt;font-weight:700;color:${PDF.text};letter-spacing:-1px;margin-bottom:4px}
    .cover-sub{font-size:11pt;color:${PDF.muted};margin-bottom:1.5cm}
    .week-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:1cm}
    .day-box{border-radius:8px;padding:12px 14px;border-left:3px solid #e0e0e0;background:${PDF.coverBg}}
    .day-box.active{background:${PDF.noteBg};border-left-color:${PDF.brand}}
    .day-name{font-size:8pt;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
    .day-recipe{font-size:11pt;font-weight:600;color:${PDF.text};margin-bottom:6px;line-height:1.3}
    .day-tags{display:flex;gap:5px;flex-wrap:wrap}
    .day-note{font-size:8.5pt;color:${PDF.subtle};margin-top:5px;font-style:italic}
    .day-inactive{color:#ccc;font-size:10pt}

    /* Recipe pages */
    .recipe-header{border-left:4px solid ${PDF.brand};padding-left:14px;margin-bottom:18px}
    .recipe-day{font-size:8pt;font-weight:700;color:${PDF.brand};text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
    .recipe-name{font-size:22pt;font-weight:700;color:${PDF.text};letter-spacing:-0.5px;line-height:1.1;margin-bottom:10px}
    .meta-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .tag{font-size:8.5pt;padding:2px 9px;border-radius:99px;display:inline-block;font-weight:500}
    .chip{font-size:8.5pt;color:${PDF.subtle};padding:2px 0}

    /* Two column layout */
    .two-col{display:grid;grid-template-columns:1fr 1.5fr;gap:28px;margin-top:22px}
    .col-title{font-size:8pt;font-weight:700;color:${PDF.brand};text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid ${PDF.brand}}

    /* Ingredients */
    .ing-item{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.5px solid ${PDF.line};font-size:10pt}
    .ing-name{color:${PDF.text}}
    .ing-qty{color:${PDF.subtle};font-size:9.5pt;text-align:right;padding-left:12px;white-space:nowrap}

    /* Steps */
    .step{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
    .snum{width:20px;height:20px;border-radius:50%;background:${PDF.brand};color:#fff;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
    .step-text{font-size:10pt;line-height:1.6;color:${PDF.text}}

    /* Source + note */
    .src-line{font-size:8.5pt;color:${PDF.muted};margin-top:16px;padding-top:10px;border-top:.5px solid ${PDF.line}}
    .src-line a{color:${PDF.brand}}
    .note{font-size:9pt;color:#555;background:${PDF.noteBg};border-left:3px solid ${PDF.moss};padding:8px 12px;margin-top:12px;border-radius:0 6px 6px 0}

    /* Images */
    .recipe-img-full{width:100%;aspect-ratio:16/7;background-size:cover;background-position:center;border-radius:8px;margin-bottom:18px}
    .cover-img{width:100%;aspect-ratio:16/7;background-size:cover;background-position:center}

    /* Shopping list */
    .shop-title{font-size:22pt;font-weight:700;color:${PDF.text};letter-spacing:-0.5px;margin-bottom:4px}
    .shop-sub{font-size:10pt;color:${PDF.muted};margin-bottom:1cm}
    .shop-grid{columns:2;gap:20px}
    .shop-item-p{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.5px solid ${PDF.line};font-size:10pt;break-inside:avoid}
    .shop-name{color:${PDF.text}}
    .shop-recipes{font-size:8pt;color:${PDF.faint};margin-left:5px}
    .shop-qty{color:${PDF.brand};font-weight:600;font-size:9.5pt;white-space:nowrap;padding-left:10px}
  </style></head><body>

  <!-- Cover -->
  <div class="page">
    <div class="cover-accent"></div>
    <div class="cover-kw">${esc(plan.kw || 'Wochenplan')}</div>
    <div class="cover-sub">${activeDays.length} Tage</div>
    <div class="week-grid">${plan.days.map(d => {
      if (!d.active || !d.recipeId) return `<div class="day-box"><div class="day-name">${esc(d.day)}</div><div class="day-inactive">—</div></div>`;
      const r = D.recipes.find(r => r.id === d.recipeId);
      if (!r) return '';
      return `<div class="day-box active" style="${r.img ? 'padding:0;overflow:hidden' : ''}">
        ${r.img ? `<div class="cover-img" style="background-image:url('${escUrl(r.img)}')"></div><div style="padding:10px 14px">` : ''}
        <div class="day-name">${esc(d.day)}</div>
        <div class="day-recipe">${esc(r.name)}</div>
        <div class="day-tags">
          <span class="tag" style="background:${catBg(r.cat)};color:${catColor(r.cat)}">${esc(getCatLabel(r.cat))}</span>
          <span class="tag" style="background:${aufBg(r.auf)};color:${aufColor(r.auf)}">${esc(getAufLabel(r.auf))}</span>
        </div>
        ${d.note ? `<div class="day-note">${esc(d.note)}</div>` : ''}
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
      const m = formatAmount(it.m);
      const qty = m ? `${m} ${esc(it.u || '')}`.trim() : esc(it.u || '');
      return `<div class="shop-item-p">
        <span class="shop-name">${esc(it.n || '')}<span class="shop-recipes">${it.recipes.map(esc).join(' · ')}</span></span>
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

  const ingsHTML = (r.ings || []).map(ing => {
    const m = formatAmount(ing.m);
    const qty = [m, esc(ing.u || '')].filter(Boolean).join(' ');
    return `<div class="ing-item"><span class="ing-name">${esc(ing.n || '')}</span><span class="ing-qty">${qty}</span></div>`;
  }).join('') || '<div class="ing-item"><span class="ing-name">—</span></div>';
  const srcLine = r.src && r.src.val
    ? (r.src.type === 'url' ? `<a href="${esc(r.src.val)}">${esc(r.src.val)}</a>` : `📖 ${esc(r.src.val)}${r.src.seite ? ', S. ' + esc(r.src.seite) : ''}`)
    : '';
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>${esc(r.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:${PDF.font};font-size:11pt;color:${PDF.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:2cm}
    .accent{height:4px;background:${PDF.brand};border-radius:2px;margin-bottom:1.5cm}
    .recipe-header{border-left:4px solid ${PDF.brand};padding-left:14px;margin-bottom:18px}
    .recipe-name{font-size:22pt;font-weight:700;color:${PDF.text};letter-spacing:-0.5px;line-height:1.1;margin-bottom:10px}
    .meta-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .tag{font-size:8.5pt;padding:2px 9px;border-radius:99px;display:inline-block;font-weight:500}
    .chip{font-size:8.5pt;color:${PDF.subtle};padding:2px 0}
    .two-col{display:grid;grid-template-columns:1fr 1.5fr;gap:28px;margin-top:22px}
    .col-title{font-size:8pt;font-weight:700;color:${PDF.brand};text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid ${PDF.brand}}
    .ing-item{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:.5px solid ${PDF.line};font-size:10pt}
    .ing-name{color:${PDF.text}}.ing-qty{color:${PDF.subtle};font-size:9.5pt;white-space:nowrap;padding-left:12px}
    .step{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
    .snum{width:20px;height:20px;border-radius:50%;background:${PDF.brand};color:#fff;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
    .step-text{font-size:10pt;line-height:1.6}
    .src-line{font-size:8.5pt;color:${PDF.muted};margin-top:16px;padding-top:10px;border-top:.5px solid ${PDF.line}}
    .src-line a{color:${PDF.brand}}
    .recipe-img-full{width:100%;aspect-ratio:16/7;background-size:cover;background-position:center;border-radius:8px;margin-bottom:18px}
    @media print{@page{margin:0}body{margin:1.5cm}}
  </style></head><body>
  <div class="page">
    <div class="accent"></div>
    ${r.img ? `<div class="recipe-img-full" style="background-image:url('${escUrl(r.img)}')"></div>` : ''}
    <div class="recipe-header">
      <div class="recipe-name">${esc(r.name)}</div>
      <div class="meta-row">
        <span class="tag" style="background:${catBg(r.cat)};color:${catColor(r.cat)}">${esc(getCatLabel(r.cat))}</span>
        <span class="tag" style="background:${aufBg(r.auf)};color:${aufColor(r.auf)}">${esc(getAufLabel(r.auf))}</span>
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
        ${(r.steps || []).map((s, i) => `<div class="step"><span class="snum">${i+1}</span><span class="step-text">${esc(s)}</span></div>`).join('') || '<p>—</p>'}
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
