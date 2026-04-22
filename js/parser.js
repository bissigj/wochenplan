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
    openQEWithRecipe(data.recipe);

  } catch (e) {
    errEl.textContent = 'Netzwerkfehler – bist du online?';
  } finally {
    btn.textContent = 'Rezept laden';
    btn.disabled    = false;
  }
}

// ── Quick-Entry Modal mit geparsten Daten befüllen ───────────────────────────
function openQEWithRecipe(r) {
  // Name
  document.getElementById('qe-name').value = r.name ?? '';

  // Zeit + Portionen
  document.getElementById('qe-time').value     = r.time ?? '';
  document.getElementById('qe-portions').value = r.portions ?? 2;

  // Zutaten als Textblock (eine Zeile pro Zutat)
  // Das QE-Modal parst sie beim Speichern selbst via parseIngredientLine
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

  // Kategorie + Aufwand auf leer/erste Option setzen (manuell wählen)
  // cat und auf sind null aus der Edge Function

  // Modal öffnen
  document.getElementById('qe-modal').style.display = 'flex';

  // Bild-Hinweis falls vorhanden
  if (r.img) {
    // Wir speichern die Bild-URL temporär als data-Attribut –
    // beim Speichern kann man sie übernehmen oder ignorieren
    document.getElementById('qe-modal').dataset.importImg = r.img;
    toast('Rezept geladen · Kategorie & Aufwand noch auswählen');
  } else {
    delete document.getElementById('qe-modal').dataset.importImg;
    toast('Rezept geladen · Kategorie & Aufwand noch auswählen');
  }
}
