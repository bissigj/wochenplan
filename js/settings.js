import { saveSettingsNow, tagStyle } from './data.js';
import { getState, setState } from './store.js';
import { CAT_PALETTE, AUF_PALETTE } from './config.js';
import { sbGet, sbInsert, sbUpdate } from './db.js';
import { toast, esc, getTheme, setTheme } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';
import { renderWeek } from './week.js';
import { joinFamilyByCode } from './auth.js';

// ── updateSettings: atomares Update des settings-Objekts im Store ─────────────
// patchFn(settings) → gibt ein partielles settings-Objekt zurück das gemergt wird
function updateSettings(patchFn) {
  setState(s => ({ settings: { ...s.settings, ...patchFn(s.settings) } }));
}

// ── Accordion state preservation ──────────────────────────────────────────────
function getOpenAccordions() {
  return Array.from(document.querySelectorAll('.acc-item.open')).map(el => {
    const body = el.querySelector('.acc-body');
    return body ? body.id.replace(/^acc-/, '') : null;
  }).filter(Boolean);
}

function restoreOpenAccordions(ids) {
  ids.forEach(id => {
    const body = document.getElementById('acc-' + id);
    if (body) body.closest('.acc-item')?.classList.add('open');
  });
}

export function rerenderSettings() {
  const open = getOpenAccordions();
  renderSettings();
  restoreOpenAccordions(open);
}

// ── Accordion helper ──────────────────────────────────────────────────────────
function accordion(id, title, content, open = false) {
  return `<div class="acc-item ${open ? 'open' : ''}">
    <button class="acc-header" data-action="toggle-acc" data-id="${esc(id)}">
      <span>${esc(title)}</span>
      <svg class="acc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="acc-body" id="acc-${esc(id)}">${content}</div>
  </div>`;
}

export function toggleAcc(id) {
  const item = document.getElementById('acc-' + id).closest('.acc-item');
  item.classList.toggle('open');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export function changeTheme(t) {
  setTheme(t);
  rerenderSettings();
  toast(t === 'system' ? 'Theme: System' : (t === 'dark' ? 'Theme: Dunkel' : 'Theme: Hell'));
}

// ── Render Settings Tab ───────────────────────────────────────────────────────
export function renderSettings() {
  const el = document.getElementById('tab-einstellungen');
  if (!el) return;

  const { settings, familyName } = getState();
  const cats  = settings.cats;
  const auf   = settings.aufwand;
  const theme = getTheme();

  const familyContent = `
    <div id="family-section">
      <div class="settings-row">
        <input type="text" id="family-name-input" class="settings-input" value="${esc(familyName || '')}" placeholder="Familienname" />
        <button class="btn btn--sm" data-action="save-family-name">Speichern</button>
      </div>
      <div class="settings-section">
        <div class="section-title">Mitglieder</div>
        <div id="members-list" class="settings-members">Wird geladen…</div>
      </div>
      <div class="settings-section">
        <div class="section-title">Einladen</div>
        <div class="settings-invite-row">
          <select id="invite-role" class="settings-invite-role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button class="btn btn--sm" data-action="create-invitation">Einladungscode erstellen</button>
        </div>
        <div id="invitation-result" class="settings-result"></div>
      </div>
      <div class="settings-section">
        <div class="section-title">Familie beitreten</div>
        <div class="settings-add-row">
          <input type="text" id="invite-code-input" class="settings-invite-input" placeholder="Einladungscode…" />
          <button class="btn btn--sm" data-action="join-family">Beitreten</button>
        </div>
        <div id="join-result" class="settings-result"></div>
      </div>
    </div>`;

  const themeContent = `
    <div class="section-title section-title--flush">Erscheinungsbild</div>
    <div class="theme-segment">
      <button class="${theme === 'system' ? 'on' : ''}" data-action="change-theme" data-theme="system">Auto</button>
      <button class="${theme === 'light'  ? 'on' : ''}" data-action="change-theme" data-theme="light">Hell</button>
      <button class="${theme === 'dark'   ? 'on' : ''}" data-action="change-theme" data-theme="dark">Dunkel</button>
    </div>`;

  const catsContent = `
    <div id="cats-list">
      ${cats.map(c => `
        <div class="settings-row">
          <input type="color" value="${esc(c.color)}" class="settings-color"
            data-change="update-cat-field" data-id="${esc(c.id)}" data-field="color" title="Textfarbe" />
          <input type="color" value="${esc(c.bg)}" class="settings-color settings-color-bg"
            data-change="update-cat-field" data-id="${esc(c.id)}" data-field="bg" title="Hintergrundfarbe" />
          <input type="text" value="${esc(c.label)}" class="settings-input"
            data-change="update-cat" data-id="${esc(c.id)}" />
          <span class="tag" style="${tagStyle(c.id)};flex-shrink:0">${esc(c.label)}</span>
          <button class="btn btn--danger btn--sm" data-action="del-cat" data-id="${esc(c.id)}">×</button>
        </div>`).join('')}
    </div>
    <div class="settings-add-row">
      <input type="text" id="new-cat-input" class="settings-add-input" placeholder="Neue Kategorie…"
        data-submit="add-cat" />
      <button class="btn btn--sm" data-action="add-cat">+</button>
    </div>`;

  const aufContent = `
    <div id="auf-list">
      ${auf.map(a => `
        <div class="settings-row">
          <input type="color" value="${esc(a.color)}" class="settings-color"
            data-change="update-auf-field" data-id="${esc(a.id)}" data-field="color" title="Textfarbe" />
          <input type="color" value="${esc(a.bg)}" class="settings-color settings-color-bg"
            data-change="update-auf-field" data-id="${esc(a.id)}" data-field="bg" title="Hintergrundfarbe" />
          <input type="text" value="${esc(a.label)}" class="settings-input"
            data-change="update-auf" data-id="${esc(a.id)}" />
          <span class="tag" style="${tagStyle(a.id)};flex-shrink:0">${esc(a.label)}</span>
          <button class="btn btn--danger btn--sm" data-action="del-auf" data-id="${esc(a.id)}">×</button>
        </div>`).join('')}
    </div>
    <div class="settings-add-row">
      <input type="text" id="new-auf-input" class="settings-add-input" placeholder="Neuer Aufwand…"
        data-submit="add-auf" />
      <button class="btn btn--sm" data-action="add-auf">+</button>
    </div>`;

  const einhContent = `
    <div class="einh-list" id="einh-list">
      ${(settings.einheiten || []).map(e => `
        <div class="einh-tag">
          <span>${esc(e)}</span>
          <button class="xbtn" data-einh="${esc(e)}" data-action="del-einh" data-val="${esc(e)}">×</button>
        </div>`).join('')}
    </div>
    <div class="settings-add-row">
      <input type="text" id="new-einh-input" class="settings-einh-add" placeholder="Neue Einheit…"
        data-submit="add-einh" />
      <button class="btn btn--sm" data-action="add-einh">+</button>
    </div>`;

  el.innerHTML = `<div class="acc-wrap">
    ${accordion('familie',    'Familie',           familyContent, true)}
    ${accordion('theme',      'Erscheinungsbild',  themeContent)}
    ${accordion('kategorien', 'Kategorien',        catsContent)}
    ${accordion('aufwand',    'Aufwand',           aufContent)}
    ${accordion('einheiten',  'Einheiten',         einhContent)}
  </div>`;

  loadFamilyMembers();
}

// ── Color palette helpers ─────────────────────────────────────────────────────
function nextCatColor(arr) { return CAT_PALETTE[arr.length % CAT_PALETTE.length]; }
function nextAufColor(arr) { return AUF_PALETTE[arr.length % AUF_PALETTE.length]; }

// ── Kategorien CRUD ───────────────────────────────────────────────────────────
export async function addCat() {
  const input = document.getElementById('new-cat-input');
  const label = input.value.trim().toLowerCase();
  if (!label) return;
  const { cats } = getState().settings;
  if (cats.find(c => c.label === label)) { toast('Kategorie existiert bereits'); return; }
  const id = 'cat_' + Date.now();
  const { color, bg } = nextCatColor(cats);
  updateSettings(s => ({ cats: [...s.cats, { id, label, color, bg }] }));
  input.value = '';
  await saveSettingsNow();
  rerenderSettings();
  renderRFilters();
  toast(`"${label}" hinzugefügt`);
}

export async function updateCat(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  updateSettings(s => ({ cats: s.cats.map(c => c.id === id ? { ...c, label: newLabel } : c) }));
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  rerenderSettings();
}

export async function updateCatField(id, field, value) {
  updateSettings(s => ({ cats: s.cats.map(c => c.id === id ? { ...c, [field]: value } : c) }));
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function deleteCat(id) {
  const { settings, recipes } = getState();
  const cat = settings.cats.find(c => c.id === id);
  if (!cat) return;
  const inUse = recipes.some(r => r.cat === id);
  if (inUse && !confirm(`"${cat.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  updateSettings(s => ({ cats: s.cats.filter(c => c.id !== id) }));
  await saveSettingsNow();
  rerenderSettings();
  renderRFilters();
  renderRecipes();
}

// ── Aufwand CRUD ──────────────────────────────────────────────────────────────
export async function addAuf() {
  const input = document.getElementById('new-auf-input');
  const label = input.value.trim().toLowerCase();
  if (!label) return;
  const { aufwand } = getState().settings;
  if (aufwand.find(a => a.label === label)) { toast('Aufwand existiert bereits'); return; }
  const id = 'auf_' + Date.now();
  const { color, bg } = nextAufColor(aufwand);
  updateSettings(s => ({ aufwand: [...s.aufwand, { id, label, color, bg }] }));
  input.value = '';
  await saveSettingsNow();
  rerenderSettings();
  renderRFilters();
  toast(`"${label}" hinzugefügt`);
}

export async function updateAuf(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  updateSettings(s => ({ aufwand: s.aufwand.map(a => a.id === id ? { ...a, label: newLabel } : a) }));
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
}

export async function updateAufField(id, field, value) {
  updateSettings(s => ({ aufwand: s.aufwand.map(a => a.id === id ? { ...a, [field]: value } : a) }));
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function deleteAuf(id) {
  const { settings, recipes } = getState();
  const auf = settings.aufwand.find(a => a.id === id);
  if (!auf) return;
  const inUse = recipes.some(r => r.auf === id);
  if (inUse && !confirm(`"${auf.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  updateSettings(s => ({ aufwand: s.aufwand.filter(a => a.id !== id) }));
  await saveSettingsNow();
  rerenderSettings();
  renderRFilters();
  renderRecipes();
}

// ── Einheiten CRUD ────────────────────────────────────────────────────────────
export async function addEinh() {
  const input = document.getElementById('new-einh-input');
  const val = input.value.trim();
  if (!val) return;
  if ((getState().settings.einheiten || []).includes(val)) { toast('Einheit existiert bereits'); return; }
  updateSettings(s => ({ einheiten: [...(s.einheiten || []), val] }));
  input.value = '';
  await saveSettingsNow();
  rerenderSettings();
  toast(`"${val}" hinzugefügt`);
}

export async function deleteEinh(val) {
  updateSettings(s => ({ einheiten: (s.einheiten || []).filter(e => e !== val) }));
  await saveSettingsNow();
  rerenderSettings();
}

// ── Family Management ─────────────────────────────────────────────────────────
export async function saveFamilyName() {
  const name = document.getElementById('family-name-input').value.trim();
  if (!name) return;
  await sbUpdate('families', getState().familyId, { name });
  setState(() => ({ familyName: name }));
  toast(`Familie umbenannt zu "${name}"`);
}

async function loadFamilyMembers() {
  const el = document.getElementById('members-list');
  if (!el) return;
  const members = await sbGet('family_members', `family_id=eq.${getState().familyId}&select=user_id,role,email`);
  if (!Array.isArray(members) || !members.length) { el.textContent = 'Keine Mitglieder gefunden.'; return; }
  el.innerHTML = members.map(m =>
    `<div class="settings-row settings-row--bare">
      <span class="settings-add-input">${esc(m.email || m.user_id.slice(0, 8) + '…')}</span>
      <span class="tag">${esc(m.role)}</span>
    </div>`
  ).join('');
}

export async function createInvitation() {
  const role = document.getElementById('invite-role')?.value || 'member';
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await sbInsert('invitations', {
    family_id: getState().familyId,
    code,
    created_by: getState().userId,
    role
  });
  const el = document.getElementById('invitation-result');
  el.innerHTML = `Code: <strong class="invitation-code">${esc(code)}</strong>
    <span class="invitation-hint"> · gültig 7 Tage</span>`;
  toast('Einladungscode erstellt');
}

export async function joinFamily() {
  const code = document.getElementById('invite-code-input').value.trim().toUpperCase();
  const el = document.getElementById('join-result');
  if (!code) return;
  const ok = await joinFamilyByCode(code, el);
  if (ok) {
    el.innerHTML = '✓ Erfolgreich beigetreten!';
    toast('Familie beigetreten');
  }
}
