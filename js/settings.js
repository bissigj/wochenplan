import { D } from './data.js';
import { saveSettingsNow, applyTagStyles } from './data.js';
import { toast } from './ui.js';
import { renderRFilters, renderRecipes } from './recipes.js';
import { renderWeek } from './week.js';

// ── Render Settings Tab ───────────────────────────────────────────────────────
export function renderSettings() {
  const el = document.getElementById('tab-einstellungen');
  if (!el) return;

  const cats = D.settings.cats;
  const auf = D.settings.aufwand;

  el.innerHTML = `
    <div class="card" style="margin-bottom:1rem">
      <div class="section-title" style="margin-top:0">Kategorien</div>
      <div id="cats-list">
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
    </div>

    <div class="card" style="margin-bottom:1rem">
      <div class="section-title" style="margin-top:0">Einheiten</div>
      <div id="einh-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
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
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0">Aufwand</div>
      <div id="auf-list">
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
    </div>
  `;
}

// ── Default color palette for new entries ─────────────────────────────────────
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

// ── Category CRUD ─────────────────────────────────────────────────────────────
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
