import { D } from './data.js';
import { saveWeekNow, saveRecipesDebounced } from './data.js';
import { sbInsert } from './db.js';
import { DAYS } from './config.js';
import { getCatLabel, getAufLabel } from './data.js';
import { kw, fmtIng, srcHTML, toast, showTab } from './ui.js';
import { renderShop } from './shopping.js';

export let expandedDays = new Set();
export let viewingArchive = null;
export function setViewingArchive(w) { viewingArchive = w; }
export let drawDiff = new Set(['auf_einfach', 'auf_mittel', 'auf_schwer']);
export let drawMaxTime = 0;

// ── Draw Modal ────────────────────────────────────────────────────────────────
export function openDrawModal() {
  updatePoolInfo();
  document.getElementById('draw-modal').style.display = 'flex';
}

export function closeDrawModal() {
  document.getElementById('draw-modal').style.display = 'none';
}

export function toggleDrawPill(btn) {
  const v = btn.dataset.v;
  if (drawDiff.has(v) && drawDiff.size > 1) { drawDiff.delete(v); btn.classList.remove('on'); }
  else { drawDiff.add(v); btn.classList.add('on'); }
  updatePoolInfo();
}

export function setTimePill(btn) {
  drawMaxTime = +btn.dataset.v;
  document.querySelectorAll('#draw-time-pills .pill').forEach(b => b.classList.toggle('on', b === btn));
  updatePoolInfo();
}

function updatePoolInfo() {
  const pool = getPool();
  const recent = getRecentIds();
  document.getElementById('draw-pool-info').textContent =
    `${pool.length} Rezepte im Pool (${pool.filter(r => !recent.includes(r.id)).length} nicht kürzlich verwendet)`;
}

export function getPool() {
  return D.recipes.filter(r => {
    if (!drawDiff.has(r.auf)) return false;
    if (drawMaxTime > 0 && r.time && r.time > drawMaxTime) return false;
    return true;
  });
}

function getRecentIds() {
  const ids = new Set();
  D.archive.slice(-2).forEach(w => (w.days || []).forEach(d => { if (d.recipeId) ids.add(d.recipeId); }));
  return [...ids];
}

export async function drawWeek() {
  const pool = getPool();
  if (pool.length < 1) { toast('Zu wenige Rezepte für diese Filter!'); return; }
  const recent = getRecentIds();
  const fresh = pool.filter(r => !recent.includes(r.id));
  const src = fresh.length >= 7 ? fresh : pool;
  const shuffled = [...src].sort(() => Math.random() - .5);
  const extra = [...pool].filter(r => !shuffled.find(s => s.id === r.id)).sort(() => Math.random() - .5);
  while (shuffled.length < 7 && extra.length) shuffled.push(extra.shift());
  const portions = +document.getElementById('draw-portions').value || 2;

  // Archive current week
  if (D.weekPlan.days && D.weekPlan.days.some(d => d.recipeId)) {
    const toArchive = JSON.parse(JSON.stringify(D.weekPlan));
    try {
      const ins = await sbInsert('archive', { data: toArchive, kw: toArchive.kw });
      if (ins && ins[0]) toArchive._dbid = ins[0].id;
      D.archive.push(toArchive);
    } catch (e) { console.error('Archive save error', e); }
  }

  const now = new Date();
  D.weekPlan = {
    kw: `KW ${kw()} / ${now.getFullYear()}`,
    year: now.getFullYear(),
    days: DAYS.map((day, i) => ({
      day, recipeId: shuffled[i] ? shuffled[i].id : null, active: true, portions, note: ''
    })),
    portions
  };
  expandedDays.clear();
  viewingArchive = null;
  closeDrawModal();
  await saveWeekNow();
  toast('Woche generiert!');
  renderWeek();
}

// ── Week rendering ────────────────────────────────────────────────────────────
export function backToCurrent() {
  viewingArchive = null;
  renderWeek();
}

export function renderWeek() {
  const banner = document.getElementById('archive-banner');
  const btnGen = document.getElementById('btn-generieren');
  const btnBack = document.getElementById('btn-zurueck');

  if (viewingArchive) {
    document.getElementById('week-title').textContent = viewingArchive.kw || 'Archivwoche';
    banner.style.display = 'flex';
    document.getElementById('archive-banner-kw').textContent = viewingArchive.kw || '';
    btnGen.style.display = 'none';
    btnBack.style.display = '';
    renderWeekPlan(viewingArchive, true);
  } else {
    document.getElementById('week-title').textContent = 'Wochenplan';
    banner.style.display = 'none';
    btnGen.style.display = '';
    btnBack.style.display = 'none';
    if (!D.weekPlan.days || !D.weekPlan.days.length) {
      document.getElementById('week-view').innerHTML = '<div class="empty">Noch keine Woche generiert.</div>';
    } else {
      renderWeekPlan(D.weekPlan, false);
    }
  }
}

function renderWeekPlan(plan, readonly = false) {
  const el = document.getElementById('week-view');
  if (!plan || !plan.days || !plan.days.length) { el.innerHTML = '<div class="empty">Keine Tage.</div>'; return; }
  el.innerHTML = '<div class="week-grid">' + plan.days.map((d, i) => {
    const r = D.recipes.find(r => r.id === d.recipeId);
    if (!r) return '';
    const isOpen = expandedDays.has(i);
    const isWeekend = i >= 5;
    const factor = (d.portions || plan.portions || 2) / (r.portions || 2);
    const ingsHTML = (r.ings || []).length
      ? r.ings.map((ing, i) => `<div class="ing-row">${fmtIng(ing, factor)}</div>`).join('')
      : '<span style="font-size:12px;color:var(--text3)">Keine Zutaten.</span>';
    const stepsHTML = (r.steps || []).length
      ? r.steps.map((s, si) => `<div class="step-mini"><span class="step-mini-num">${si + 1}</span><span style="font-size:12px">${s}</span></div>`).join('')
      : '<span style="font-size:12px;color:var(--text3)">Keine Schritte.</span>';
    return `<div class="day-card ${d.active ? '' : 'off'} ${isWeekend ? 'day-card-weekend' : ''}">
      ${r.img && d.active ? `<div class="day-card-img" style="background-image:url('${r.img}')"></div>` : ''}
      <div class="day-card-top" onclick="toggleDay(${i})">
        <div class="day-lbl ${isWeekend ? 'day-lbl-weekend' : ''}">${d.day}${!d.active ? '<span style="font-size:10px;background:var(--bg3);padding:1px 6px;border-radius:99px;margin-left:4px">ausgeblendet</span>' : ''}</div>
        ${d.active ? `<div class="day-recipe-name">${r.name}</div>
          <div class="day-meta">${r.time ? r.time + ' min · ' : ''}${getAufLabel(r.auf)}</div>
          <div class="row" style="gap:4px;flex-wrap:wrap">
            <span class="tag tag-${getCatLabel(r.cat)}">${getCatLabel(r.cat)}</span>
            <span style="font-size:11px;color:var(--text3);margin-left:auto">${isOpen ? '▲' : '▼'}</span>
          </div>` : '<div style="font-size:13px;color:var(--text3)">—</div>'}
      </div>
      ${!readonly ? `<div class="day-actions">
        <button class="icon-btn" onclick="toggleDayActive(${i},event)">👁</button>
        ${d.active ? `
        <button class="icon-btn" onclick="rerollDay(${i},event)">↺</button>
        <div class="portions-row">
          <span style="font-size:11px;color:var(--text3)">Port.</span>
          <input type="number" value="${d.portions || plan.portions}" min="1" max="20" onclick="event.stopPropagation()" onchange="setPortions(${i},+this.value)" />
      </div>` : ''}
      </div>` : ''}
      ${d.active && isOpen ? `<div class="day-detail open">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Zutaten (${d.portions || plan.portions} Port.)</div>
        <div class="ing-list" style="margin-bottom:10px">${ingsHTML}</div>
        <div class="divider"></div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;margin-top:8px">Zubereitung</div>
        ${stepsHTML}
        ${srcHTML(r.src) ? `<div class="divider"></div><div style="margin-top:8px">${srcHTML(r.src)}</div>` : ''}
        ${!readonly ? `<div class="divider"></div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;margin-top:8px">Notiz</div>
          <textarea class="day-note-input" placeholder="Notiz…" onclick="event.stopPropagation()" onchange="setNote(${i},this.value)">${d.note || ''}</textarea>`
          : d.note ? `<div class="divider"></div><div style="font-size:12px;color:var(--text2);margin-top:8px">📝 ${d.note}</div>` : ''}
      </div>` : ''}
    </div>`;
  }).join('') + '</div>';
}

export function toggleDay(i) {
  expandedDays.has(i) ? expandedDays.delete(i) : expandedDays.add(i);
  renderWeek();
}

export async function toggleDayActive(i, e) {
  e.stopPropagation();
  D.weekPlan.days[i].active = !D.weekPlan.days[i].active;
  await saveWeekNow();
  renderWeek();
}

export async function rerollDay(i, e) {
  e.stopPropagation();
  const pool = getPool();
  const usedIds = D.weekPlan.days.map(d => d.recipeId).filter(Boolean);
  const avail = pool.filter(r => !usedIds.includes(r.id));
  const src = avail.length ? avail : pool.filter(r => r.id !== D.weekPlan.days[i].recipeId);
  if (!src.length) return;
  D.weekPlan.days[i].recipeId = src[Math.floor(Math.random() * src.length)].id;
  await saveWeekNow();
  renderWeek();
}

export async function setPortions(i, v) {
  D.weekPlan.days[i].portions = v;
  await saveWeekNow();
}

export async function setNote(i, v) {
  D.weekPlan.days[i].note = v;
  await saveWeekNow();
}
