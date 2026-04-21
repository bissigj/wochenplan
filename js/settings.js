import { D, saveSettingsNow, applyTagStyles } from './data.js';
import { sbGet, sbInsert, sbUpdate } from './db.js';
import { toast } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';
import { renderWeek } from './week.js';

// ── Render Settings Tab ───────────────────────────────────────────────────────
function accordion(id, title, content, open = false) {
  return `<div class="acc-item ${open ? 'open' : ''}">
    <button class="acc-header" onclick="toggleAcc('${id}')">
      <span>${title}</span>
      <svg class="acc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="acc-body" id="acc-${id}">${content}</div>
  </div>`;
}

export function toggleAcc(id) {
  const item = document.getElementById('acc-' + id).closest('.acc-item');
  item.classList.toggle('open');
}

export function renderSettings() {
  const el = document.getElementById('tab-einstellungen');
  if (!el) return;

  const cats = D.settings.cats;
  const auf = D.settings.aufwand;

  el.innerHTML = `<div class="acc-wrap">
    ${accordion('familie', 'Familie', `<div id="family-section">
        <div class="settings-row">
          <input type="text" id="family-name-input" class="settings-input" value="${D.familyName || ''}" placeholder="Familienname" />
          <button class="btn btn-sm" onclick="saveFamilyName()">Speichern</button>
        </div>
        <div style="margin-top:12px">
          <div class="section-title">Mitglieder</div>
          <div id="members-list" style="font-size:13px;color:var(--text2)">Wird geladen…</div>
        </div>
        <div style="margin-top:12px">
          <div class="section-title">Einladen</div>
          <div class="row" style="gap:6px;margin-bottom:6px">
            <select id="invite-role" style="width:auto">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button class="btn btn-sm" onclick="createInvitation()">Einladungscode erstellen</button>
          </div>
          <div id="invitation-result" style="margin-top:8px;font-size:13px"></div>
        </div>
        <div style="margin-top:12px">
          <div class="section-title">Familie beitreten</div>
          <div class="row" style="gap:6px">
            <input type="text" id="invite-code-input" placeholder="Einladungscode…" style="flex:1;max-width:200px" />
            <button class="btn btn-sm" onclick="joinFamily()">Beitreten</button>
          </div>
          <div id="join-result" style="margin-top:8px;font-size:13px"></div>
        </div>
    </div>\`, true)}
    ${accordion('kategorien', 'Kategorien', `<div id="cats-list">
        ${cats.map(c => `
          <div class="settings-row">
            <input type="color" value="${c.color}" class="settings-color"
              onchange="updateCatColor('${c.id}', this.value)" title="Textfarbe" />
            <input type="color" value="${c.bg}" class="settings-color settings-color-bg"
              onchange="updateCatBg('${c.id}', this.value)" title="Hintergrundfarbe" />
            <input type="text" value="${c.label}" class="settings-input"
              onchange="updateCat('${c.id}', this.value)" />
            <span class="tag tag-${c.id}" style="flex-shrink:0">${c.label}</span>
            <button class="btn btn-d btn-sm" onclick="deleteCat('${c.id}')">×</button>
          </div>`).join('')}
      </div>
      <div class="row" style="gap:6px;margin-top:8px">
        <input type="text" id="new-cat-input" placeholder="Neue Kategorie…" style="flex:1"
          onkeydown="if(event.key==='Enter')addCat()" />
        <button class="btn btn-sm" onclick="addCat()">+</button>
      </div>
    </div>\`)}
    ${accordion('aufwand', 'Aufwand', `<div id="auf-list">
        ${auf.map(a => `
          <div class="settings-row">
            <input type="color" value="${a.color}" class="settings-color"
              onchange="updateAufColor('${a.id}', this.value)" title="Textfarbe" />
            <input type="color" value="${a.bg}" class="settings-color settings-color-bg"
              onchange="updateAufBg('${a.id}', this.value)" title="Hintergrundfarbe" />
            <input type="text" value="${a.label}" class="settings-input"
              onchange="updateAuf('${a.id}', this.value)" />
            <span class="tag tag-${a.id}" style="flex-shrink:0">${a.label}</span>
            <button class="btn btn-d btn-sm" onclick="deleteAuf('${a.id}')">×</button>
          </div>`).join('')}
      </div>
      <div class="row" style="gap:6px;margin-top:8px">
        <input type="text" id="new-auf-input" placeholder="Neuer Aufwand…" style="flex:1"
          onkeydown="if(event.key==='Enter')addAuf()" />
        <button class="btn btn-sm" onclick="addAuf()">+</button>
      </div>
    </div>\`)}
    ${accordion('einheiten', 'Einheiten', `<div id="einh-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        ${D.settings.einheiten.map(e => `
          <div class="einh-tag">
            <span>${e}</span>
            <button class="xbtn" onclick="deleteEinh('${e}')">×</button>
          </div>`).join('')}
      </div>
      <div class="row" style="gap:6px">
        <input type="text" id="new-einh-input" placeholder="Neue Einheit…" style="flex:1;max-width:160px"
          onkeydown="if(event.key==='Enter')addEinh()" />
        <button class="btn btn-sm" onclick="addEinh()">+</button>
      </div>
    </div>\`)}
  </div>`;
  loadFamilyMembers();
}


// ── Color palette for new entries ────────────────────────────────────────────
const PALETTE = [
  { color: '#1a6b4a', bg: '#e0f0e8' },
  { color: '#6b4a1a', bg: '#f0e8e0' },
  { color: '#1a4a6b', bg: '#e0e8f0' },
  { color: '#6b1a4a', bg: '#f0e0e8' },
  { color: '#4a6b1a', bg: '#e8f0e0' },
  { color: '#4a1a6b', bg: '#e8e0f0' },
  { color: '#6b6b1a', bg: '#f0f0e0' },
];

function nextColor(arr) {
  return PALETTE[arr.length % PALETTE.length];
}

export async function addCat() {
  const input = document.getElementById('new-cat-input');
  const label = input.value.trim().toLowerCase();
  if (!label) return;
  if (D.settings.cats.find(c => c.label === label)) { toast('Kategorie existiert bereits'); return; }
  const id = 'cat_' + Date.now();
  const { color, bg } = nextColor(D.settings.cats);
  D.settings.cats.push({ id, label, color, bg });
  input.value = '';
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
  renderRFilters();
  toast(`"${label}" hinzugefügt`);
}

export async function updateCat(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) cat.label = newLabel;
  await saveSettingsNow();
  applyTagStyles();
  renderRFilters();
  renderRecipes();
  renderSettings();
}

export async function updateCatColor(id, color) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) cat.color = color;
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
}

export async function updateCatBg(id, bg) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) cat.bg = bg;
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
}

export async function deleteCat(id) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (!cat) return;
  const inUse = D.recipes.some(r => r.cat === id);
  if (inUse && !confirm(`"${cat.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  D.settings.cats = D.settings.cats.filter(c => c.id !== id);
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
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
  const { color, bg } = nextColor(D.settings.aufwand);
  D.settings.aufwand.push({ id, label, color, bg });
  input.value = '';
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
  toast(`"${label}" hinzugefügt`);
}

export async function updateAuf(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) auf.label = newLabel;
  await saveSettingsNow();
  applyTagStyles();
  renderWeek();
  renderRecipes();
  renderSettings();
}

export async function updateAufColor(id, color) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) auf.color = color;
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
}

export async function updateAufBg(id, bg) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) auf.bg = bg;
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
}

export async function deleteAuf(id) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (!auf) return;
  const inUse = D.recipes.some(r => r.auf === id);
  if (inUse && !confirm(`"${auf.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  D.settings.aufwand = D.settings.aufwand.filter(a => a.id !== id);
  await saveSettingsNow();
  applyTagStyles();
  renderSettings();
  renderRFilters();
  renderRecipes();
}

// ── Einheiten CRUD ────────────────────────────────────────────────────────────
export async function addEinh() {
  const input = document.getElementById('new-einh-input');
  const val = input.value.trim();
  if (!val) return;
  if (D.settings.einheiten.includes(val)) { toast('Einheit existiert bereits'); return; }
  D.settings.einheiten.push(val);
  input.value = '';
  await saveSettingsNow();
  renderSettings();
  toast(`"${val}" hinzugefügt`);
}

export async function deleteEinh(val) {
  D.settings.einheiten = D.settings.einheiten.filter(e => e !== val);
  await saveSettingsNow();
  renderSettings();
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
  if (!members || !members.length) { el.textContent = 'Keine Mitglieder gefunden.'; return; }
  el.innerHTML = members.map(m =>
    `<div class="settings-row" style="border:none;padding:3px 0">
      <span style="flex:1;font-size:13px">${m.email || m.user_id.slice(0,8) + '…'}</span>
      <span class="tag" style="font-size:11px">${m.role}</span>
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
  el.innerHTML = `Code: <strong style="font-family:monospace;font-size:15px;letter-spacing:2px">${code}</strong>
    <span style="color:var(--text3);font-size:11px"> · gültig 7 Tage</span>`;
  toast('Einladungscode erstellt');
}

export async function joinFamily() {
  const code = document.getElementById('invite-code-input').value.trim().toUpperCase();
  const el = document.getElementById('join-result');
  if (!code) return;
  const inv = await sbGet('invitations', `code=eq.${code}&select=id,family_id,used_at,expires_at,role`);
  if (!inv || !inv.length) { el.textContent = '❌ Ungültiger Code.'; return; }
  const i = inv[0];
  if (i.used_at) { el.textContent = '❌ Code bereits verwendet.'; return; }
  if (new Date(i.expires_at) < new Date()) { el.textContent = '❌ Code abgelaufen.'; return; }
  // Join family
  await sbInsert('family_members', { family_id: i.family_id, user_id: D.userId, role: i.role || 'member', email: D.userEmail });
  // Mark invitation as used
  await sbUpdate('invitations', i.id, { used_by: D.userId, used_at: new Date().toISOString() });
  D.familyId = i.family_id;
  el.innerHTML = '✓ Erfolgreich beigetreten!';
  toast('Familie beigetreten');
}
