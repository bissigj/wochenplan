import { D, saveSettingsNow, tagStyle } from './data.js';
import { CAT_PALETTE, AUF_PALETTE } from './config.js';
import { sbGet, sbInsert, sbUpdate } from './db.js';
import { toast, esc, getTheme, setTheme } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';
import { renderWeek } from './week.js';
import { joinFamilyByCode } from './auth.js';

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

function rerenderSettings() {
  const open = getOpenAccordions();
  renderSettings();
  restoreOpenAccordions(open);
}

// ── Accordion helper ──────────────────────────────────────────────────────────
function accordion(id, title, content, open = false) {
  return `<div class="acc-item ${open ? 'open' : ''}">
    <button class="acc-header" onclick="toggleAcc('${esc(id)}')">
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
  const openIds = getOpenAccordions();
  rerenderSettings();
  restoreOpenAccordions(openIds);
  toast(t === 'system' ? 'Theme: System' : (t === 'dark' ? 'Theme: Dunkel' : 'Theme: Hell'));
}

// ── Render Settings Tab ───────────────────────────────────────────────────────
export function renderSettings() {
  const el = document.getElementById('tab-einstellungen');
  if (!el) return;

  const cats  = D.settings.cats;
  const auf   = D.settings.aufwand;
  const theme = getTheme();

  const familyContent = `
    <div id="family-section">
      <div class="settings-row">
        <input type="text" id="family-name-input" class="settings-input" value="${esc(D.familyName || '')}" placeholder="Familienname" />
        <button class="btn btn--sm" onclick="saveFamilyName()">Speichern</button>
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
          <button class="btn btn--sm" onclick="createInvitation()">Einladungscode erstellen</button>
        </div>
        <div id="invitation-result" class="settings-result"></div>
      </div>
      <div class="settings-section">
        <div class="section-title">Familie beitreten</div>
        <div class="settings-add-row">
          <input type="text" id="invite-code-input" class="settings-invite-input" placeholder="Einladungscode…" />
          <button class="btn btn--sm" onclick="joinFamily()">Beitreten</button>
        </div>
        <div id="join-result" class="settings-result"></div>
      </div>
    </div>`;

  const themeContent = `
    <div class="section-title section-title--flush">Erscheinungsbild</div>
    <div class="theme-segment">
      <button class="${theme === 'system' ? 'on' : ''}" onclick="changeTheme('system')">Auto</button>
      <button class="${theme === 'light'  ? 'on' : ''}" onclick="changeTheme('light')">Hell</button>
      <button class="${theme === 'dark'   ? 'on' : ''}" onclick="changeTheme('dark')">Dunkel</button>
    </div>`;

  const catsContent = `
    <div id="cats-list">
      ${cats.map(c => `
        <div class="settings-row">
          <input type="color" value="${esc(c.color)}" class="settings-color"
            onchange="updateCatColor('${esc(c.id)}', this.value)" title="Textfarbe" />
          <input type="color" value="${esc(c.bg)}" class="settings-color settings-color-bg"
            onchange="updateCatBg('${esc(c.id)}', this.value)" title="Hintergrundfarbe" />
          <input type="text" value="${esc(c.label)}" class="settings-input"
            onchange="updateCat('${esc(c.id)}', this.value)" />
          <span class="tag" style="${tagStyle(c.id)};flex-shrink:0">${esc(c.label)}</span>
          <button class="btn btn--danger btn--sm" onclick="deleteCat('${esc(c.id)}')">×</button>
        </div>`).join('')}
    </div>
    <div class="settings-add-row">
      <input type="text" id="new-cat-input" class="settings-add-input" placeholder="Neue Kategorie…"
        onkeydown="if(event.key==='Enter')addCat()" />
      <button class="btn btn--sm" onclick="addCat()">+</button>
    </div>`;

  const aufContent = `
    <div id="auf-list">
      ${auf.map(a => `
        <div class="settings-row">
          <input type="color" value="${esc(a.color)}" class="settings-color"
            onchange="updateAufColor('${esc(a.id)}', this.value)" title="Textfarbe" />
          <input type="color" value="${esc(a.bg)}" class="settings-color settings-color-bg"
            onchange="updateAufBg('${esc(a.id)}', this.value)" title="Hintergrundfarbe" />
          <input type="text" value="${esc(a.label)}" class="settings-input"
            onchange="updateAuf('${esc(a.id)}', this.value)" />
          <span class="tag" style="${tagStyle(a.id)};flex-shrink:0">${esc(a.label)}</span>
          <button class="btn btn--danger btn--sm" onclick="deleteAuf('${esc(a.id)}')">×</button>
        </div>`).join('')}
    </div>
    <div class="settings-add-row">
      <input type="text" id="new-auf-input" class="settings-add-input" placeholder="Neuer Aufwand…"
        onkeydown="if(event.key==='Enter')addAuf()" />
      <button class="btn btn--sm" onclick="addAuf()">+</button>
    </div>`;

  const einhContent = `
    <div class="einh-list" id="einh-list">
      ${(D.settings.einheiten || []).map(e => `
        <div class="einh-tag">
          <span>${esc(e)}</span>
          <button class="xbtn" data-einh="${esc(e)}" onclick="deleteEinh(this.dataset.einh)">×</button>
        </div>`).join('')}
    </div>
    <div class="settings-add-row">
      <input type="text" id="new-einh-input" class="settings-einh-add" placeholder="Neue Einheit…"
        onkeydown="if(event.key==='Enter')addEinh()" />
      <button class="btn btn--sm" onclick="addEinh()">+</button>
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
  if (D.settings.cats.find(c => c.label === label)) { toast('Kategorie existiert bereits'); return; }
  const id = 'cat_' + Date.now();
  const { color, bg } = nextCatColor(D.settings.cats);
  D.settings.cats.push({ id, label, color, bg });
  input.value = '';
  await saveSettingsNow();
  rerenderSettings();
  renderRFilters();
  toast(`"${label}" hinzugefügt`);
}

export async function updateCat(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) cat.label = newLabel;
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  rerenderSettings();
}

export async function updateCatColor(id, color) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) cat.color = color;
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function updateCatBg(id, bg) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) cat.bg = bg;
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function deleteCat(id) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (!cat) return;
  const inUse = D.recipes.some(r => r.cat === id);
  if (inUse && !confirm(`"${cat.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  D.settings.cats = D.settings.cats.filter(c => c.id !== id);
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
  if (D.settings.aufwand.find(a => a.label === label)) { toast('Aufwand existiert bereits'); return; }
  const id = 'auf_' + Date.now();
  const { color, bg } = nextAufColor(D.settings.aufwand);
  D.settings.aufwand.push({ id, label, color, bg });
  input.value = '';
  await saveSettingsNow();
  rerenderSettings();
  renderRFilters();
  toast(`"${label}" hinzugefügt`);
}

export async function updateAuf(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) auf.label = newLabel;
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
}

export async function updateAufColor(id, color) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) auf.color = color;
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function updateAufBg(id, bg) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) auf.bg = bg;
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
  renderWeek();
}

export async function deleteAuf(id) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (!auf) return;
  const inUse = D.recipes.some(r => r.auf === id);
  if (inUse && !confirm(`"${auf.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  D.settings.aufwand = D.settings.aufwand.filter(a => a.id !== id);
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
  if ((D.settings.einheiten || []).includes(val)) { toast('Einheit existiert bereits'); return; }
  if (!D.settings.einheiten) D.settings.einheiten = [];
  D.settings.einheiten.push(val);
  input.value = '';
  await saveSettingsNow();
  rerenderSettings();
  toast(`"${val}" hinzugefügt`);
}

export async function deleteEinh(val) {
  D.settings.einheiten = (D.settings.einheiten || []).filter(e => e !== val);
  await saveSettingsNow();
  rerenderSettings();
}

// ── Family Management ─────────────────────────────────────────────────────────
export async function saveFamilyName() {
  const name = document.getElementById('family-name-input').value.trim();
  if (!name) return;
  await sbUpdate('families', D.familyId, { name });
  D.familyName = name;
  toast(`Familie umbenannt zu "${name}"`);
}

async function loadFamilyMembers() {
  const el = document.getElementById('members-list');
  if (!el) return;
  const members = await sbGet('family_members', `family_id=eq.${D.familyId}&select=user_id,role,email`);
  if (!Array.isArray(members) || !members.length) { el.textContent = 'Keine Mitglieder gefunden.'; return; }
  el.innerHTML = members.map(m =>
    `<div class="settings-row" style="border:none;padding:3px 0">
      <span class="settings-add-input">${esc(m.email || m.user_id.slice(0, 8) + '…')}</span>
      <span class="tag">${esc(m.role)}</span>
    </div>`
  ).join('');
}

export async function createInvitation() {
  const role = document.getElementById('invite-role')?.value || 'member';
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await sbInsert('invitations', {
    family_id: D.familyId,
    code,
    created_by: D.userId,
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
