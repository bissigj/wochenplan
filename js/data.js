import { sbGet, sbInsert, sbUpdate, sbDelete } from './db.js';
import { DEFAULT_SETTINGS, DEFAULT_EINHEITEN, TAG_FALLBACK } from './config.js';
import { setSyncStatus } from './ui.js';
import { getState, setState } from './store.js';

let dbSettingsId = null;
let dbWeekId = null;
const saveTimers = {};

// Stellt sicher dass alle settings-Felder vorhanden sind (Fallback für ältere DB-Einträge)
function ensureSettingsComplete(s) {
  const settings = (s && typeof s === 'object') ? { ...s } : {};
  if (!Array.isArray(settings.cats))    settings.cats    = [];
  if (!Array.isArray(settings.aufwand)) settings.aufwand = [];
  if (!Array.isArray(settings.pantry))  settings.pantry  = [];

  // Einheiten: Upgrade von alter flacher String-Liste auf strukturierte Form
  if (!Array.isArray(settings.einheiten) || settings.einheiten.length === 0) {
    settings.einheiten = JSON.parse(JSON.stringify(DEFAULT_EINHEITEN));
  } else if (typeof settings.einheiten[0] === 'string') {
    // Alte Struktur: ['g', 'kg', 'EL', ...] → neue Struktur mit canonical + variants
    settings.einheiten = settings.einheiten.map(str => {
      // Suche ob es einen passenden Default-Eintrag gibt
      const def = DEFAULT_EINHEITEN.find(d => d.canonical === str);
      if (def) return { ...def };
      // Unbekannte Einheit: canonical = str, variants = [str.toLowerCase()]
      return { canonical: str, variants: [str.toLowerCase()] };
    });
  }
  return settings;
}

export async function loadData() {
  const fid = getState().familyId;

  // Jeder Query einzeln abgesichert – ein Fehler bricht nicht alles ab
  const [recs, weeks, arch, sets] = await Promise.all([
    sbGet('recipes_v2', `select=id,recipe_id,data,public&family_id=eq.${fid}&order=recipe_id.asc`).catch(e => { console.error('recipes load error', e); return null; }),
    sbGet('week_plan',  `select=id,data,updated_at&family_id=eq.${fid}`).catch(e => { console.error('week_plan load error', e); return null; }),
    sbGet('archive',    `select=id,data,kw,created_at&family_id=eq.${fid}`).catch(e => { console.error('archive load error', e); return null; }),
    sbGet('settings',   `select=id,data&family_id=eq.${fid}`).catch(e => { console.error('settings load error', e); return null; }),
  ]);

  // ── Recipes ───────────────────────────────────────────────────────────────
  let recipes, nextId;
  if (Array.isArray(recs) && recs.length) {
    recipes = recs.map(r => ({ ...r.data, _dbid: r.id, public: r.public }));
    recipes.forEach(r => { if (r.img && r.img_owned === undefined) r.img_owned = true; });
    nextId = Math.max(...recipes.map(r => r.id)) + 1;
  } else {
    recipes = [];
    nextId = 1;
  }

  // ── Week plan ─────────────────────────────────────────────────────────────
  let weekPlan = getState().weekPlan;
  if (Array.isArray(weeks) && weeks.length) {
    weeks.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    dbWeekId = weeks[0].id;
    const wp = weeks[0].data;
    if (wp && wp.days && wp.days.length) weekPlan = wp;
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  const archive = Array.isArray(arch) ? arch.map(a => ({ ...a.data, _dbid: a.id })) : [];

  // ── Settings ──────────────────────────────────────────────────────────────
  let settings;
  if (Array.isArray(sets) && sets.length) {
    dbSettingsId = sets[0].id;
    settings = ensureSettingsComplete(sets[0].data);
  } else {
    settings = ensureSettingsComplete(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    const ins = await sbInsert('settings', { data: settings, family_id: fid });
    if (ins && ins[0]) dbSettingsId = ins[0].id;
  }

  // ── Alles in einem einzigen setState-Call → nur ein notify ────────────────
  setState(() => ({ recipes, nextId, weekPlan, archive, settings }));
}

// ── Recipe persistence ────────────────────────────────────────────────────────
export async function saveRecipeNow(recipe) {
  const { _dbid, public: pub, ...data } = recipe;
  try {
    if (_dbid) {
      await sbUpdate('recipes_v2', _dbid, { data, public: pub ?? true });
    } else {
      const ins = await sbInsert('recipes_v2', {
        family_id: getState().familyId,
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

export function saveRecipesDebounced(recipe) {
  if (!recipe) return;
  const key = recipe.id ?? '_unknown';
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(async () => {
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
// updated_at wird via Supabase-Trigger gesetzt, nicht manuell
export async function saveWeekNow() {
  setSyncStatus('spin', 'Speichern…');
  try {
    if (dbWeekId) {
      await sbUpdate('week_plan', dbWeekId, { data: getState().weekPlan });
    } else {
      const ins = await sbInsert('week_plan', { data: getState().weekPlan, family_id: getState().familyId });
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
      await sbUpdate('settings', dbSettingsId, { data: getState().settings });
    } else {
      const ins = await sbInsert('settings', { data: getState().settings, family_id: getState().familyId });
      if (ins && ins[0]) dbSettingsId = ins[0].id;
    }
  } catch (e) { console.error('saveSettings error', e); }
}

// ── Tag lookups ───────────────────────────────────────────────────────────────
function getCat(id) {
  if (!id) return null;
  return getState().settings.cats.find(c => c.id === id) || null;
}

function getAuf(id) {
  if (!id) return null;
  return getState().settings.aufwand.find(a => a.id === id) || null;
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
