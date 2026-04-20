import { sbGet, sbInsert, sbUpdate } from './db.js';
import { DEFAULTS, DEFAULT_SETTINGS, DEFAULT_EINHEITEN } from './config.js';
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

export let dbRecipeId = null;
export let dbWeekId = null;
let saveTimer = null;

export async function loadData() {
  try {
    const fid = D.familyId;
    // Recipes
    const recs = await sbGet('recipes', `select=id,data&family_id=eq.${fid}`);
    if (recs && recs.length) {
      dbRecipeId = recs[0].id;
      D.recipes = recs[0].data.recipes || [];
      D.nextId = recs[0].data.nextId || 1;
    } else {
      D.recipes = DEFAULTS.map(r => ({ ...r }));
      D.nextId = DEFAULTS.length + 1;
      const ins = await sbInsert('recipes', { data: { recipes: D.recipes, nextId: D.nextId }, family_id: D.familyId });
      if (ins && ins[0]) dbRecipeId = ins[0].id;
    }
    // Week plan – always exactly one row
    const weeks = await sbGet('week_plan', `select=id,data,updated_at&family_id=eq.${fid}`);
    if (weeks && weeks.length) {
      weeks.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      dbWeekId = weeks[0].id;
      const wp = weeks[0].data;
      if (wp && wp.days && wp.days.length) D.weekPlan = wp;
    }
    // Archive – multiple rows
    const arch = await sbGet('archive', `select=id,data,kw,created_at&family_id=eq.${fid}`);
    D.archive = Array.isArray(arch) ? arch.map(a => ({ ...a.data, _dbid: a.id })) : [];

    // Settings – categories and aufwand
    const sets = await sbGet('settings', `select=id,data&family_id=eq.${fid}`);
    if (sets && sets.length) {
      dbSettingsId = sets[0].id;
      D.settings = sets[0].data;
      // Migrate: add einheiten if missing (existing installs)
      if (!D.settings.einheiten) {
        D.settings.einheiten = [...DEFAULT_EINHEITEN];
        saveSettingsNow();
      }
    } else {
      D.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      D.settings.einheiten = [...DEFAULT_EINHEITEN];
      const ins = await sbInsert('settings', { data: D.settings, family_id: D.familyId });
      if (ins && ins[0]) dbSettingsId = ins[0].id;
    }

    // Migrate old recipes: cat/auf as string label → id
    let needsSave = false;
    D.recipes.forEach(r => {
      if (r.cat && !r.cat.startsWith('cat_')) {
        const found = D.settings.cats.find(c => c.label === r.cat);
        if (found) { r.cat = found.id; needsSave = true; }
      }
      if (r.auf && !r.auf.startsWith('auf_')) {
        const found = D.settings.aufwand.find(a => a.label === r.auf);
        if (found) { r.auf = found.id; needsSave = true; }
      }
    });
    if (needsSave) saveRecipesDebounced();
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
      const ins = await sbInsert('week_plan', { data: D.weekPlan, family_id: D.familyId });
      if (ins && ins[0]) dbWeekId = ins[0].id;
    }
    setSyncStatus('ok', 'Synchronisiert');
  } catch (e) {
    setSyncStatus('err', 'Fehler beim Speichern');
    console.error(e);
  }
}

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
  // Category tags
  D.settings.cats.forEach(c => {
    css += `.tag-${c.id}{background:${c.bg};color:${c.color};}\n`;
    css += `.pill.tag-${c.id}{background:transparent;color:${c.color};border-color:${c.color};}\n`;
    css += `.pill.tag-${c.id}.on{background:${c.bg};}\n`;
  });
  // Aufwand tags
  D.settings.aufwand.forEach(a => {
    css += `.tag-${a.id}{background:${a.bg};color:${a.color};}\n`;
    css += `.pill.tag-${a.id}{background:transparent;color:${a.color};border-color:${a.color};}\n`;
    css += `.pill.tag-${a.id}.on{background:${a.bg};}\n`;
  });
  let el = document.getElementById('dynamic-tag-styles');
  if (!el) {
    el = document.createElement('style');
    el.id = 'dynamic-tag-styles';
    document.head.appendChild(el);
  }
  el.textContent = css;
}
