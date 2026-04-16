import { sbGet, sbInsert, sbUpdate } from './db.js';
import { DEFAULTS } from './config.js';
import { setSyncStatus } from './ui.js';

export let D = {
  recipes: [],
  weekPlan: { kw: '', year: 0, days: [], portions: 2 },
  archive: [],
  nextId: 1
};

export let dbRecipeId = null;
export let dbWeekId = null;
let saveTimer = null;

export function setDbRecipeId(id) { dbRecipeId = id; }
export function setDbWeekId(id) { dbWeekId = id; }

export async function loadData() {
  try {
    // Recipes
    const recs = await sbGet('recipes', 'select=id,data');
    if (recs && recs.length) {
      dbRecipeId = recs[0].id;
      D.recipes = recs[0].data.recipes || [];
      D.nextId = recs[0].data.nextId || 1;
    } else {
      D.recipes = DEFAULTS.map(r => ({ ...r }));
      D.nextId = DEFAULTS.length + 1;
      const ins = await sbInsert('recipes', { data: { recipes: D.recipes, nextId: D.nextId } });
      if (ins && ins[0]) dbRecipeId = ins[0].id;
    }
    // Week plan – always exactly one row
    const weeks = await sbGet('week_plan', 'select=id,data,updated_at');
    if (weeks && weeks.length) {
      weeks.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      dbWeekId = weeks[0].id;
      const wp = weeks[0].data;
      if (wp && wp.days && wp.days.length) D.weekPlan = wp;
    }
    // Archive – multiple rows
    const arch = await sbGet('archive', 'select=id,data,kw,created_at');
    D.archive = Array.isArray(arch) ? arch.map(a => ({ ...a.data, _dbid: a.id })) : [];
  } catch (e) {
    setSyncStatus('err', 'Offline');
    console.error(e);
  }
}

export async function saveWeekNow() {
  setSyncStatus('spin', 'Speichern…');
  try {
    if (dbWeekId) {
      await sbUpdate('week_plan', dbWeekId, { data: D.weekPlan, updated_at: new Date().toISOString() });
    } else {
      const ins = await sbInsert('week_plan', { data: D.weekPlan });
      if (ins && ins[0]) dbWeekId = ins[0].id;
    }
    setSyncStatus('ok', 'Synchronisiert');
  } catch (e) {
    setSyncStatus('err', 'Fehler beim Speichern');
    console.error(e);
  }
}

export function saveRecipesDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    setSyncStatus('spin', 'Speichern…');
    try {
      const payload = { recipes: D.recipes, nextId: D.nextId };
      if (dbRecipeId) {
        await sbUpdate('recipes', dbRecipeId, { data: payload });
      } else {
        const ins = await sbInsert('recipes', { data: payload });
        if (ins && ins[0]) dbRecipeId = ins[0].id;
      }
      setSyncStatus('ok', 'Synchronisiert');
    } catch (e) {
      setSyncStatus('err', 'Fehler beim Speichern');
      console.error(e);
    }
  }, 800);
}
