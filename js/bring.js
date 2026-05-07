// ── bring.js ──────────────────────────────────────────────────────────────────
// Bring! Export via Supabase Edge Function (umgeht CORS)

import { SUPA_URL, SUPA_KEY } from './config.js';

export async function exportRecipeToBring(ings, factor, email, password) {
  if (!email || !password) throw new Error('Keine Bring!-Zugangsdaten hinterlegt');
  if (!ings || !ings.length) throw new Error('Keine Zutaten zum Exportieren');

  // Items aufbereiten: Name + skalierte Menge als Spezifikation
  const items = ings
    .map(ing => {
      const name = ing.n?.trim();
      if (!name) return null;
      const m = (ing.m || 0) * factor;
      const spec = m > 0
        ? `${+m.toFixed(2).replace(/\.?0+$/, '')} ${ing.u || ''}`.trim()
        : (ing.u || '');
      return { name, spec };
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
