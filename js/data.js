import { sbGet, sbInsert, sbUpdate, sbDelete } from './db.js';
import { DEFAULT_SETTINGS, DEFAULT_EINHEITEN, TAG_FALLBACK } from './config.js';
import { setSyncStatus } from './ui.js';

export let D = {
  recipes: [],
  weekPlan: { kw: '', year: 0, days: [], portions: 2 },
  archive: [],
  nextId: 1,
  settings: { cats: [], aufwand: [], einheiten: [] },
  familyId: null,
  familyName: '',
  userId: null,
  userEmail: ''
};

export let dbSettingsId = null;
export let dbWeekId = null;
let saveTimer = null;

// Fix #5 / Safety: stellt sicher, dass settings immer vollständig sind
function ensureSettingsComplete() {
  if (!D.settings || typeof D.settings !== 'object') {
    D.settings = { cats: [], aufwand: [], einheiten: [] };
  }
  if (!Array.isArray(D.settings.cats)) D.settings.cats = [];
  if (!Array.isArray(D.settings.aufwand)) D.settings.aufwand = [];
  if (!Array.isArray(D.settings.einheiten)) D.settings.einheiten = [...DEFAULT_EINHEITEN];
}

export async function loadData() {
  try {
    const fid = D.familyId;

    // Fix #20: Parallele Queries statt sequentiell (schneller beim Login)
    const [recs, weeks, arch, sets] = await Promise.all([
      sbGet('recipes_v2', `select=id,recipe_id,data,public&family_id=eq.${fid}&order=recipe_id.asc`),
      sbGet('week_plan',  `select=id,data,updated_at&family_id=eq.${fid}`),
      sbGet('archive',    `select=id,data,kw,created_at&family_id=eq.${fid}`),
      sbGet('settings',   `select=id,data&family_id=eq.${fid}`),
    ]);

    // ── Recipes – one row per recipe ─────────────────────────────────────────
    if (Array.isArray(recs) && recs.length) {
      D.recipes = recs.map(r => ({ ...r.data, _dbid: r.id, public: r.public }));
      D.nextId = Math.max(...D.recipes.map(r => r.id)) + 1;
      // Mark image ownership – only delete images we uploaded ourselves
      D.recipes.forEach(r => {
        if (r.img && r.img_owned === undefined) r.img_owned = true;
      });
    } else {
      D.recipes = [];
      D.nextId = 1;
    }

    // ── Week plan ─────────────────────────────────────────────────────────────
    if (Array.isArray(weeks) && weeks.length) {
      weeks.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      dbWeekId = weeks[0].id;
      const wp = weeks[0].data;
      if (wp && wp.days && wp.days.length) D.weekPlan = wp;
    }

    // ── Archive ───────────────────────────────────────────────────────────────
    D.archive = Array.isArray(arch) ? arch.map(a => ({ ...a.data, _dbid: a.id })) : [];

    // ── Settings ──────────────────────────────────────────────────────────────
    if (Array.isArray(sets) && sets.length) {
      dbSettingsId = sets[0].id;
      D.settings = sets[0].data || {};
      ensureSettingsComplete();
      if (!sets[0].data || !sets[0].data.einheiten) {
        // Einheiten waren nicht gespeichert – jetzt speichern
        saveSettingsNow();
      }
    } else {
      D.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      D.settings.einheiten = [...DEFAULT_EINHEITEN];
      const ins = await sbInsert('settings', { data: D.settings, family_id: fid });
      if (ins && ins[0]) dbSettingsId = ins[0].id;
    }

    // ── Migrate cat/auf string labels → ids ───────────────────────────────────
    let needsSave = [];
    D.recipes.forEach(r => {
      let changed = false;
      if (r.cat && !r.cat.startsWith('cat_')) {
        const found = D.settings.cats.find(c => c.label === r.cat);
        if (found) { r.cat = found.id; changed = true; }
      }
      if (r.auf && !r.auf.startsWith('auf_')) {
        const found = D.settings.aufwand.find(a => a.label === r.auf);
        if (found) { r.auf = found.id; changed = true; }
      }
      if (changed) needsSave.push(r);
    });
    for (const r of needsSave) await saveRecipeNow(r);

  } catch (e) {
    setSyncStatus('err', 'Offline');
    console.error(e);
  }
}

// ── Recipe persistence ────────────────────────────────────────────────────────
export async function saveRecipeNow(recipe) {
  const { _dbid, public: pub, ...data } = recipe;
  try {
    if (_dbid) {
      await sbUpdate('recipes_v2', _dbid, { data, public: pub ?? true });
    } else {
      const ins = await sbInsert('recipes_v2', {
        family_id: D.familyId,
        recipe_id: recipe.id,
        data,
        public: pub ?? true
      });
      if (ins && ins[0]) recipe._dbid = ins[0].id;
    }
  } catch (e) { console.error('saveRecipe error', e); }
}

export async function deleteRecipeFromDB(recipe) {
  if (!recipe._dbid) return;
  try {
    await sbDelete('recipes_v2', recipe._dbid);
  } catch (e) { console.error('deleteRecipe error', e); }
}

// Fix #16: Fallback-Branch entfernt – die Funktion wurde nie ohne recipe aufgerufen
export function saveRecipesDebounced(recipe) {
  if (!recipe) return; // Sicherheitsnetz
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    setSyncStatus('spin', 'Speichern…');
    try {
      await saveRecipeNow(recipe);
      setSyncStatus('ok', 'Synchronisiert');
    } catch (e) {
      setSyncStatus('err', 'Fehler beim Speichern');
      console.error(e);
    }
  }, 800);
}

// ── Week plan ─────────────────────────────────────────────────────────────────
// Fix #2: updated_at nicht selbst setzen – Supabase-Trigger erledigt das
export async function saveWeekNow() {
  setSyncStatus('spin', 'Speichern…');
  try {
    if (dbWeekId) {
      await sbUpdate('week_plan', dbWeekId, { data: D.weekPlan });
    } else {
      const ins = await sbInsert('week_plan', { data: D.weekPlan, family_id: D.familyId });
      if (ins && ins[0]) dbWeekId = ins[0].id;
    }
    setSyncStatus('ok', 'Synchronisiert');
  } catch (e) {
    setSyncStatus('err', 'Fehler beim Speichern');
    console.error(e);
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
export async function saveSettingsNow() {
  try {
    if (dbSettingsId) {
      await sbUpdate('settings', dbSettingsId, { data: D.settings });
    } else {
      const ins = await sbInsert('settings', { data: D.settings, family_id: D.familyId });
      if (ins && ins[0]) dbSettingsId = ins[0].id;
    }
  } catch (e) { console.error('saveSettings error', e); }
}

// ── Tag lookups ───────────────────────────────────────────────────────────────
export function getCat(id) {
  if (!id) return null;
  return D.settings.cats.find(c => c.id === id) || null;
}

export function getAuf(id) {
  if (!id) return null;
  return D.settings.aufwand.find(a => a.id === id) || null;
}

export function getCatLabel(id) {
  const c = getCat(id);
  return c ? c.label : (id || '');
}

export function getAufLabel(id) {
  const a = getAuf(id);
  return a ? a.label : (id || '');
}

// ── Tag style (used inline: style="${tagStyle(cat_id)}") ──────────────────────
// Ersetzt das alte applyTagStyles() – keine globalen Injections mehr nötig.
// Gibt einen style-String zurück der --tag-c und --tag-bg setzt,
// die von .tag und .pill in CSS konsumiert werden.
export function tagStyle(id) {
  const entry = getCat(id) || getAuf(id) || TAG_FALLBACK;
  return `--tag-c:${entry.color};--tag-bg:${entry.bg}`;
}
