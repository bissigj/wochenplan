import { D } from './data.js';
import { showTab } from './ui.js';
import { viewingArchive, renderWeek, expandedDays } from './week.js';

export function getArchiveViewModel(archive, recipes) {
  return [...archive].reverse().map((w, i) => {
    const names = (w.days || [])
      .filter(d => d.active && d.recipeId)
      .map(d => {
        const r = recipes.find(r => r.id === d.recipeId);
        return r ? r.name : '';
      })
      .filter(Boolean)
      .join(', ');

    return {
      index: i,
      kw: w.kw || '—',
      names: names || '—'
    };
  });
}

export function renderArchiv() {
  const el = document.getElementById('archiv-view');

  const vm = getArchiveViewModel(D.archive, D.recipes);

  if (!vm.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">Noch kein Archiv</div>
        <div class="empty-state-sub">Archivierte Wochen erscheinen hier.</div>
      </div>
    `;
    return;
  }

  el.innerHTML =
    '<div class="card">' +
    vm.map(w => `
      <div class="archive-item">
        <span class="archive-kw">${w.kw}</span>
        <span class="archive-recipes">${w.names}</span>
        <button class="btn btn-sm" onclick="viewArchiveWeek(${D.archive.length - 1 - w.index})">
          Ansehen
        </button>
      </div>
    `).join('') +
    '</div>';
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
