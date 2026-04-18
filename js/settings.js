import { D } from './data.js';
import { saveSettingsNow } from './data.js';
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
          <div class="settings-row" id="cat-row-${c.id}">
            <input type="text" value="${c.label}" class="settings-input"
              onchange="updateCat('${c.id}', this.value)" />
            <button class="btn btn-d btn-sm" onclick="deleteCat('${c.id}')">×</button>
          </div>`).join('')}
      </div>
      <div class="row" style="gap:6px;margin-top:8px">
        <input type="text" id="new-cat-input" placeholder="Neue Kategorie…" style="flex:1" 
          onkeydown="if(event.key==='Enter')addCat()" />
        <button class="btn btn-sm" onclick="addCat()">+</button>
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0">Aufwand</div>
      <div id="auf-list">
        ${auf.map(a => `
          <div class="settings-row" id="auf-row-${a.id}">
            <input type="text" value="${a.label}" class="settings-input"
              onchange="updateAuf('${a.id}', this.value)" />
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

// ── Category CRUD ─────────────────────────────────────────────────────────────
export async function addCat() {
  const input = document.getElementById('new-cat-input');
  const label = input.value.trim().toLowerCase();
  if (!label) return;
  if (D.settings.cats.find(c => c.label === label)) { toast('Kategorie existiert bereits'); return; }
  const id = 'cat_' + Date.now();
  D.settings.cats.push({ id, label });
  input.value = '';
  await saveSettingsNow();
  renderSettings();
  renderRFilters();
  toast(`Kategorie "${label}" hinzugefügt`);
}

export async function updateCat(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  const cat = D.settings.cats.find(c => c.id === id);
  if (cat) { cat.label = newLabel; }
  await saveSettingsNow();
  renderRFilters();
  renderRecipes();
}

export async function deleteCat(id) {
  const cat = D.settings.cats.find(c => c.id === id);
  if (!cat) return;
  const inUse = D.recipes.some(r => r.cat === id);
  if (inUse && !confirm(`Kategorie "${cat.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  D.settings.cats = D.settings.cats.filter(c => c.id !== id);
  await saveSettingsNow();
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
  D.settings.aufwand.push({ id, label });
  input.value = '';
  await saveSettingsNow();
  renderSettings();
  toast(`Aufwand "${label}" hinzugefügt`);
}

export async function updateAuf(id, newLabel) {
  newLabel = newLabel.trim().toLowerCase();
  if (!newLabel) return;
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (auf) { auf.label = newLabel; }
  await saveSettingsNow();
  renderWeek();
  renderRecipes();
}

export async function deleteAuf(id) {
  const auf = D.settings.aufwand.find(a => a.id === id);
  if (!auf) return;
  const inUse = D.recipes.some(r => r.auf === id);
  if (inUse && !confirm(`Aufwand "${auf.label}" wird von Rezepten verwendet. Trotzdem löschen?`)) return;
  D.settings.aufwand = D.settings.aufwand.filter(a => a.id !== id);
  await saveSettingsNow();
  renderSettings();
}
