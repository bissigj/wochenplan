import { D } from './data.js';
import { showTab } from './ui.js';
import { viewingArchive, renderWeek, expandedDays } from './week.js';

export function renderArchiv() {
  const el = document.getElementById('archiv-view');
  if (!D.archive.length) { el.innerHTML = '<div class="empty">Noch keine archivierten Wochen.</div>'; return; }
  el.innerHTML = '<div class="card">' + [...D.archive].reverse().map((w, i) => {
    const names = (w.days || [])
      .filter(d => d.active && d.recipeId)
      .map(d => { const r = D.recipes.find(r => r.id === d.recipeId); return r ? r.name : ''; })
      .filter(Boolean).join(', ');
    return `<div class="archive-item">
      <span class="archive-kw">${w.kw || '—'}</span>
      <span class="archive-recipes">${names || '—'}</span>
      <button class="btn btn-sm" onclick="viewArchiveWeek(${D.archive.length - 1 - i})">Ansehen</button>
    </div>`;
  }).join('') + '</div>';
}

export function viewArchiveWeek(idx) {
  // viewingArchive is exported from week.js but needs to be set there
  // We use a setter pattern via the week module
  import('./week.js').then(w => {
    w.setViewingArchive(D.archive[idx]);
    expandedDays.clear();
    showTab('woche');
    renderWeek();
  });
}
