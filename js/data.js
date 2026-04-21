import { sbGet, sbInsert, sbUpdate, sbDelete } from './db.js';
import { DEFAULT_SETTINGS, DEFAULT_EINHEITEN } from './config.js';
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

export async function loadData() {
  try {
    const fid = D.familyId;

    // ── Recipes – one row per recipe ─────────────────────────────────────────
    const recs = await sbGet('recipes_v2',
      `select=id,recipe_id,data,public&family_id=eq.${fid}&order=recipe_id.asc`);

    if (recs && recs.length) {
      D.recipes = recs.map(r => ({ ...r.data, _dbid: r.id, public: r.public }));
      D.nextId = Math.max(...D.recipes.map(r => r.id)) + 1;
      // Mark image ownership – only delete images we uploaded ourselves
      D.recipes.forEach(r => {
        if (r.img && r.img_owned === undefined) r.img_owned = true;
      });
    } else {
      // New family – start empty
      D.recipes = [];
      D.nextId = 1;
    }

    // ── Week plan ─────────────────────────────────────────────────────────────
    const weeks = await sbGet('week_plan', `select=id,data,updated_at&family_id=eq.${fid}`);
    if (weeks && weeks.length) {
      weeks.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      dbWeekId = weeks[0].id;
      const wp = weeks[0].data;
      if (wp && wp.days && wp.days.length) D.weekPlan = wp;
    }

    // ── Archive ───────────────────────────────────────────────────────────────
    const arch = await sbGet('archive', `select=id,data,kw,created_at&family_id=eq.${fid}`);
    D.archive = Array.isArray(arch) ? arch.map(a => ({ ...a.data, _dbid: a.id })) : [];

    // ── Settings ──────────────────────────────────────────────────────────────
    const sets = await sbGet('settings', `select=id,data&family_id=eq.${fid}`);
    if (sets && sets.length) {
      dbSettingsId = sets[0].id;
      D.settings = sets[0].data;
      if (!D.settings.einheiten) {
        D.settings.einheiten = [...DEFAULT_EINHEITEN];
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

export function saveRecipesDebounced(recipe) {
  if (!recipe) { console.warn('saveRecipesDebounced called without recipe'); return; }
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
export async function saveWeekNow() {
  setSyncStatus('spin', 'Speichern…');
  try {
    if (dbWeekId) {
      await sbUpdate('week_plan', dbWeekId, { data: D.weekPlan, updated_at: new Date().toISOString() });
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

// ── Label lookup helpers ──────────────────────────────────────────────────────
export function getCatLabel(id) {
  if (!id) return '';
  const found = D.settings.cats.find(c => c.id === id);
  return found ? found.label : id;
}

export function getAufLabel(id) {
  if (!id) return '';
  const found = D.settings.aufwand.find(a => a.id === id);
  return found ? found.label : id;
}

// ── Dynamic tag styles ────────────────────────────────────────────────────────
export function applyTagStyles() {
  let css = '';
  const allEntries = [...D.settings.cats, ...D.settings.aufwand];

  allEntries.forEach(e => {
    css += `.tag-${e.id}{background:${e.bg};color:${e.color};}\n`;
    const borderAlpha = e.color + '60';
    css += `.pill.tag-${e.id}{background:transparent;color:${e.color};border-color:${borderAlpha};}\n`;
    css += `.pill.tag-${e.id}.on{background:${e.bg};border-color:${e.color};}\n`;
  });

  let el = document.getElementById('dynamic-tag-styles');
  if (!el) {
    el = document.createElement('style');
    el.id = 'dynamic-tag-styles';
    document.head.appendChild(el);
  }
  el.textContent = css;
}
