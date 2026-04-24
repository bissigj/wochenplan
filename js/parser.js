import { SUPA_URL, SUPA_KEY } from './config.js';
import { toast } from './ui.js';

// ── URL-Import Modal öffnen ───────────────────────────────────────────────────
export function openUrlImport() {
  document.getElementById('url-import-modal').style.display = 'flex';
  document.getElementById('url-import-input').value = '';
  document.getElementById('url-import-err').textContent = '';
  document.getElementById('url-import-btn').textContent = 'Rezept laden';
  setTimeout(() => document.getElementById('url-import-input').focus(), 80);
}

export function closeUrlImport() {
  document.getElementById('url-import-modal').style.display = 'none';
}

// ── Edge Function aufrufen ────────────────────────────────────────────────────
export async function parseRecipeUrl() {
  const input  = document.getElementById('url-import-input');
  const errEl  = document.getElementById('url-import-err');
  const btn    = document.getElementById('url-import-btn');
  const url    = input.value.trim();

  if (!url) { errEl.textContent = 'Bitte eine URL eingeben.'; return; }

  errEl.textContent = '';
  btn.textContent   = 'Wird geladen…';
  btn.disabled      = true;

  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/parse-recipe`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPA_KEY}`,
        'apikey':        SUPA_KEY,
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      errEl.textContent = data.error ?? 'Unbekannter Fehler.';
      return;
    }

    closeUrlImport();
    // Fix 5: URL mitgeben damit sie als Quelle gesetzt werden kann
    openQEWithRecipe(data.recipe, url);

  } catch (e) {
    errEl.textContent = 'Netzwerkfehler – bist du online?';
  } finally {
    btn.textContent = 'Rezept laden';
    btn.disabled    = false;
  }
}

// ── Quick-Entry Modal mit geparsten Daten befüllen ───────────────────────────
function openQEWithRecipe(r, sourceUrl) {
  const modal = document.getElementById('qe-modal');

  // Fix 5: Quell-URL für saveQE bereitstellen
  modal.dataset.importSrc = sourceUrl ?? '';

  // Felder befüllen
  document.getElementById('qe-name').value     = r.name     ?? '';
  document.getElementById('qe-time').value     = r.time     ?? '';
  document.getElementById('qe-portions').value = r.portions ?? 2;

  // Zutaten als lesbaren Text – der User kann sie noch korrigieren,
  // saveQE parst sie dann nochmals (gewollter Review-Schritt)
  const ingText = (r.ings ?? []).map(ing => {
    const parts = [
      ing.m > 0 ? String(ing.m) : '',
      ing.u ?? '',
      ing.n ?? '',
    ].filter(Boolean);
    return parts.join(' ');
  }).join('\n');
  document.getElementById('qe-ings').value = ingText;

  // Schritte als nummerierte Liste
  const stepsText = (r.steps ?? [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
  document.getElementById('qe-steps').value = stepsText;

  if (r.img) {
    modal.dataset.importImg = r.img;
  } else {
    delete modal.dataset.importImg;
  }

  modal.style.display = 'flex';

  // Fix 6: Name-Feld fokussieren und selektieren → sofort editierbar
  setTimeout(() => {
    const nameEl = document.getElementById('qe-name');
    nameEl.focus();
    nameEl.select();
  }, 80);

  toast('Rezept geladen · Name prüfen, dann Kategorie & Aufwand wählen');
}
