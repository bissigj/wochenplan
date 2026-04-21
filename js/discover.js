import { D, getCatLabel, getAufLabel } from './data.js';
import { saveRecipeNow } from './data.js';
import { sbGet } from './db.js';
import { toast } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';

let allPublicRecipes = [];
let discoverSearch = '';
let discoverCat = '';
let discoverAuf = '';

// ── Open / Close ──────────────────────────────────────────────────────────────
export function openDiscover() {
  document.getElementById('discover-modal').style.display = 'flex';
  loadPublicRecipes();
}

export function closeDiscover() {
  document.getElementById('discover-modal').style.display = 'none';
}

export function filterDiscover() {
  discoverSearch = document.getElementById('discover-search')?.value.toLowerCase().trim() || '';
  renderDiscoverList();
}

export function setDiscoverCat(val) {
  discoverCat = discoverCat === val ? '' : val;
  renderDiscoverFilters();
  renderDiscoverList();
}

export function setDiscoverAuf(val) {
  discoverAuf = discoverAuf === val ? '' : val;
  renderDiscoverFilters();
  renderDiscoverList();
}

// ── Load public recipes from other families ───────────────────────────────────
async function loadPublicRecipes() {
  const el = document.getElementById('discover-list');
  el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Laden…</div></div>';

  const recs = await sbGet('recipes_v2',
    `select=id,recipe_id,data,public,family_id&public=eq.true&family_id=neq.${D.familyId}&order=created_at.desc&limit=100`
  );

  if (!recs || !recs.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div class="empty-state-title">Noch keine öffentlichen Rezepte</div><div class="empty-state-sub">Andere Familien haben noch nichts geteilt.</div></div>';
    return;
  }

  // Load family names
  const familyIds = [...new Set(recs.map(r => r.family_id))];
  const families = {};
  for (const fid of familyIds) {
    const fam = await sbGet('families', `id=eq.${fid}&select=id,name`);
    if (fam && fam[0]) families[fid] = fam[0].name;
  }

  // Attach family name to each recipe
  allPublicRecipes = recs.map(r => ({ ...r, familyName: families[r.family_id] || 'Unbekannte Familie' }));

  renderDiscoverFilters();
  renderDiscoverList();
}

// ── Render filters ────────────────────────────────────────────────────────────
function renderDiscoverFilters() {
  const el = document.getElementById('discover-filters');
  if (!el) return;

  const cats = D.settings.cats.map(c =>
    `<button class="pill tag-${c.id} ${discoverCat === c.id ? 'on' : ''}"
      onclick="setDiscoverCat('${c.id}')">${c.label}</button>`
  ).join('');

  const aufs = D.settings.aufwand.map(a =>
    `<button class="pill tag-${a.id} ${discoverAuf === a.id ? 'on' : ''}"
      onclick="setDiscoverAuf('${a.id}')">${a.label}</button>`
  ).join('');

  el.innerHTML = cats + aufs;
}

// ── Render list ───────────────────────────────────────────────────────────────
function renderDiscoverList() {
  const el = document.getElementById('discover-list');

  const importedIds = new Set(
    D.recipes
      .filter(r => r.src?.type === 'import' && r.src?.originalId)
      .map(r => r.src.originalId)
  );

  let filtered = allPublicRecipes;

  if (discoverSearch) {
    filtered = filtered.filter(row =>
      row.data.name.toLowerCase().includes(discoverSearch) ||
      getCatLabel(row.data.cat).toLowerCase().includes(discoverSearch) ||
      row.familyName.toLowerCase().includes(discoverSearch)
    );
  }
  if (discoverCat) filtered = filtered.filter(row => row.data.cat === discoverCat);
  if (discoverAuf) filtered = filtered.filter(row => row.data.auf === discoverAuf);

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Keine Treffer</div><div class="empty-state-sub">Versuche einen anderen Filter.</div></div>';
    return;
  }

  el.innerHTML = filtered.map(row => {
    const r = row.data;
    const alreadyImported = importedIds.has(row.id);
    return `
      <div class="discover-card">
        ${r.img ? `<div class="discover-img" style="background-image:url('${r.img}')"></div>` : ''}
        <div class="discover-body">
          <div class="discover-meta">
            <span class="discover-family">🏠 ${row.familyName}</span>
            ${r.time ? `<span class="discover-time">⏱ ${r.time} min</span>` : ''}
          </div>
          <div class="discover-name">${r.name}</div>
          <div class="row" style="gap:5px;margin-top:6px">
            <span class="tag tag-${r.cat}">${getCatLabel(r.cat)}</span>
            <span class="tag tag-${r.auf}">${getAufLabel(r.auf)}</span>
          </div>
          ${alreadyImported
            ? '<div class="discover-imported">✓ Bereits importiert</div>'
            : `<button class="btn btn-p btn-sm" style="margin-top:10px" onclick="importRecipe('${row.id}')">+ Importieren</button>`
          }
        </div>
      </div>`;
  }).join('');
}

// ── Import recipe ─────────────────────────────────────────────────────────────
export async function importRecipe(dbId) {
  const row = allPublicRecipes.find(r => r.id === dbId);
  if (!row) { toast('Rezept nicht gefunden'); return; }

  const imported = {
    ...row.data,
    id: D.nextId++,
    public: false,
    img_owned: false,
    src: {
      type: 'import',
      val: `Familie ${row.familyName}`,
      originalId: dbId
    }
  };

  D.recipes.push(imported);
  await saveRecipeNow(imported);
  renderRFilters();
  renderRecipes();
  toast(`"${imported.name}" importiert`);
  renderDiscoverList(); // refresh to show "already imported"
}
