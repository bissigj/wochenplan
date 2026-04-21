import { D, getCatLabel, getAufLabel } from './data.js';
import { saveRecipeNow } from './data.js';
import { sbGet } from './db.js';
import { toast } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';

let allPublicRecipes = [];
let discoverSearch = '';
let discoverCat = '';
let discoverAuf = '';
let discoverExpanded = null;
const PAGE_SIZE = 20;
let discoverPage = 1;

// ── Open / Close ──────────────────────────────────────────────────────────────
export function openDiscover() {
  document.getElementById('discover-modal').style.display = 'flex';
  loadPublicRecipes();
}

export function closeDiscover() {
  document.getElementById('discover-modal').style.display = 'none';
}

export function toggleDiscoverR(dbId) {
  discoverExpanded = discoverExpanded === dbId ? null : dbId;
  renderDiscoverList();
}

export function filterDiscover() {
  discoverSearch = document.getElementById('discover-search')?.value.toLowerCase().trim() || '';
  discoverPage = 1;
  renderDiscoverList();
}

export function setDiscoverCat(val) {
  discoverCat = discoverCat === val ? '' : val;
  discoverPage = 1;
  renderDiscoverFilters();
  renderDiscoverList();
}

export function setDiscoverAuf(val) {
  discoverAuf = discoverAuf === val ? '' : val;
  discoverPage = 1;
  renderDiscoverFilters();
  renderDiscoverList();
}

export function discoverLoadMore() {
  discoverPage++;
  renderDiscoverList(true);
}

// ── Load public recipes from other families ───────────────────────────────────
async function loadPublicRecipes() {
  const el = document.getElementById('discover-list');
  el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Laden…</div></div>';

  const recs = await sbGet('recipes_v2',
    `select=id,recipe_id,data,public,family_id&public=eq.true&family_id=neq.${D.familyId}&order=created_at.desc&limit=500`
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

// ── Render single card ───────────────────────────────────────────────────────
function renderDiscoverCard(row, alreadyImported) {
  const r = row.data;
  const isOpen = discoverExpanded === row.id;

  const ingsHtml = (r.ings || []).map(ing => {
    const amt = ing.m ? `${ing.m}${ing.u ? ' ' + ing.u : ''}` : '';
    return `<div class="ing-row"><span class="ing-amt">${amt ? `<b>${amt}</b> ` : ''}${ing.n}</span></div>`;
  }).join('');

  const stepsHtml = (r.steps || []).map((st, i) =>
    `<li class="step-item">
      <span class="step-num">${i + 1}</span>
      <span class="step-text">${st}</span>
    </li>`
  ).join('');

  return `
    <div class="discover-card">
      ${r.img ? `<div class="discover-img" style="background-image:url('${r.img}')"></div>` : ''}
      <div class="discover-body">
        <div class="discover-card-top" onclick="toggleDiscoverR('${row.id}')" style="cursor:pointer">
          <div class="discover-meta">
            <span class="discover-family">🏠 ${row.familyName}</span>
            ${r.time ? `<span class="discover-time">⏱ ${r.time} min</span>` : ''}
            <span style="margin-left:auto;font-size:11px;color:var(--text3)">${isOpen ? '▲' : '▼'}</span>
          </div>
          <div class="discover-name">${r.name}</div>
          <div class="row" style="gap:5px;margin-top:6px">
            <span class="tag tag-${r.cat}">${getCatLabel(r.cat)}</span>
            <span class="tag tag-${r.auf}">${getAufLabel(r.auf)}</span>
          </div>
        </div>
        ${isOpen ? `
          <div class="recipe-detail" style="margin-top:10px">
            <div class="detail-grid">
              <div>
                <div class="section-title">Zutaten${r.portions ? ` (${r.portions} Port.)` : ''}</div>
                <div class="ing-list">${ingsHtml}</div>
              </div>
              <div>
                <div class="section-title">Zubereitung</div>
                <ol class="steps-list">${stepsHtml}</ol>
              </div>
            </div>
          </div>` : ''}
        <div style="margin-top:10px">
          ${alreadyImported
            ? '<div class="discover-imported">✓ Bereits importiert</div>'
            : `<button class="btn btn-p btn-sm" onclick="importRecipe('${row.id}')">+ Importieren</button>`
          }
        </div>
      </div>
    </div>`;
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

  const total = filtered.length;
  const paged = filtered.slice(0, discoverPage * PAGE_SIZE);
  const hasMore = paged.length < total;

  const cards = paged.map(row => {
    const alreadyImported = importedIds.has(row.id);
    return renderDiscoverCard(row, alreadyImported);
  }).join('');

  const footer = hasMore
    ? `<div class="discover-more"><button class="btn" onclick="discoverLoadMore()">Mehr laden (${total - paged.length} weitere)</button></div>`
    : `<div class="discover-more" style="color:var(--text3);font-size:12px">Alle ${total} Rezepte geladen</div>`;

  el.innerHTML = cards + footer;
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
