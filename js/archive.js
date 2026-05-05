import { getState } from './store.js';
import { showTab, esc } from './ui.js';
import { setViewingArchive, renderWeek, expandedDays } from './week.js';

export function renderArchiv() {
  const { archive, recipes } = getState();
  const el = document.getElementById('archiv-view');
  if (!archive.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">Noch kein Archiv</div><div class="empty-state-sub">Archivierte Wochen erscheinen hier.</div></div>';
    return;
  }
  el.innerHTML = '<div class="card">' + [...archive].reverse().map((w, i) => {
    const names = (w.days || [])
      .filter(d => d.active && d.recipeId)
      .map(d => { const r = recipes.find(r => r.id === d.recipeId); return r ? r.name : ''; })
      .filter(Boolean).join(', ');
    return `<div class="archive-item">
      <span class="archive-kw">${esc(w.kw || '—')}</span>
      <span class="archive-recipes">${esc(names || '—')}</span>
      <button class="btn btn--sm" data-action="view-archive-week" data-idx="${archive.length - 1 - i}">Ansehen</button>
    </div>`;
  }).join('') + '</div>';
}

export function viewArchiveWeek(idx) {
  setViewingArchive(getState().archive[idx]);
  expandedDays.clear();
  showTab('woche');
  renderWeek();
}
