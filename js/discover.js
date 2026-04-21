import { D, saveRecipeNow } from './data.js';
import { sbGet } from './db.js';
import { toast } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';

// ── Open / Close ──────────────────────────────────────────────────────────────
export function openDiscover() {
  document.getElementById('discover-modal').style.display = 'flex';
  loadPublicRecipes();
}

export function closeDiscover() {
  document.getElementById('discover-modal').style.display = 'none';
}

// ── Load public recipes from other families ───────────────────────────────────
async function loadPublicRecipes() {
  const el = document.getElementById('discover-list');
  el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-title">Laden…</div></div>';

  // Load public recipes not from own family
  const recs = await sbGet('recipes_v2',
    `select=id,recipe_id,data,public,family_id&public=eq.true&family_id=neq.${D.familyId}&order=created_at.desc&limit=50`
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

  el.innerHTML = recs.map(row => {
    const r = row.data;
    const famName = families[row.family_id] || 'Unbekannte Familie';
    const alreadyImported = D.recipes.some(
      own => own.src?.type === 'import' && own.src?.originalId === row.id
    );
    return `
      <div class="discover-card">
        ${r.img ? `<div class="discover-img" style="background-image:url('${r.img}')"></div>` : ''}
        <div class="discover-body">
          <div class="discover-meta">
            <span class="discover-family">🏠 ${famName}</span>
            ${r.time ? `<span class="discover-time">⏱ ${r.time} min</span>` : ''}
          </div>
          <div class="discover-name">${r.name}</div>
          <div class="row" style="gap:5px;margin-top:6px">
            <span class="tag tag-${r.cat}" style="font-size:10px">${r.cat}</span>
            <span class="tag tag-${r.auf}" style="font-size:10px">${r.auf}</span>
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
  // Find the recipe row
  const recs = await sbGet('recipes_v2', `id=eq.${dbId}&select=id,data,family_id`);
  if (!recs || !recs[0]) { toast('Rezept nicht gefunden'); return; }

  const source = recs[0];
  const sourceData = source.data;

  // Get family name for attribution
  const fam = await sbGet('families', `id=eq.${source.family_id}&select=name`);
  const famName = fam && fam[0] ? fam[0].name : 'Unbekannte Familie';

  // Build imported recipe
  const imported = {
    ...sourceData,
    id: D.nextId++,
    public: false,        // imported recipes start as private
    img_owned: false,     // don't delete original image
    src: {
      type: 'import',
      val: `Familie ${famName}`,
      originalId: dbId
    }
  };

  D.recipes.push(imported);
  await saveRecipeNow(imported);
  renderRFilters();
  renderRecipes();
  toast(`"${imported.name}" importiert`);

  // Refresh discover list to show "already imported"
  loadPublicRecipes();
}
