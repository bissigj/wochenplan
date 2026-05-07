// ── bring.js ──────────────────────────────────────────────────────────────────
import { SUPA_URL, SUPA_KEY } from './config.js';

// Deterministisch UUID aus seed ableiten:
// Gleicher seed → gleiche UUID → Bring! überschreibt statt neu anzulegen
function deterministicUuid(seed) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h |= 0;
  }
  const hex = (Math.abs(h) >>> 0).toString(16).padStart(8, '0');
  const hex2 = ((Math.abs(h) * 2654435761) >>> 0).toString(16).padStart(8, '0');
  return `${hex}-${hex2.slice(0,4)}-4${hex.slice(1,4)}-8${hex2.slice(1,4)}-${hex}${hex2.slice(0,4)}`;
}

export async function exportRecipeToBring(ings, factor, recipeName, recipeId, day, email, password) {
  if (!email || !password) throw new Error('Keine Bring!-Zugangsdaten hinterlegt');
  if (!ings || !ings.length) throw new Error('Keine Zutaten zum Exportieren');

  const items = ings
    .map(ing => {
      const name = ing.n?.trim();
      if (!name) return null;
      const m = (ing.m || 0) * factor;
      const qty = m > 0
        ? `${+m.toFixed(2).replace(/\.?0+$/, '')} ${ing.u || ''}`.trim()
        : (ing.u || '');
      const spec = [qty, recipeName].filter(Boolean).join(' — ');
      // UUID deterministisch aus Rezept-ID + Tag + Zutatname
      // → nochmals exportieren = überschreiben, nicht duplizieren
      const uuid = deterministicUuid(`${recipeId}-${day}-${name}`);
      return { name, spec, uuid };
    })
    .filter(Boolean);

  if (!items.length) throw new Error('Keine gültigen Zutaten');

  const r = await fetch(`${SUPA_URL}/functions/v1/bring-export`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPA_KEY}`,
      'apikey':        SUPA_KEY,
    },
    body: JSON.stringify({ email, password, items }),
  });

  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error(d.error || `Fehler (${r.status})`);
  return d.count;
}
