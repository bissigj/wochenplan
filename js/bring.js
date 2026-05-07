// ── bring.js ──────────────────────────────────────────────────────────────────
// Bring! Shopping List Integration
// Inoffizielle API — https://github.com/foxriver76/node-bring-api

const BRING_BASE = 'https://api.getbring.com/rest/v2';
const BRING_HEADERS = {
  'X-BRING-API-KEY':     'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Uo',
  'X-BRING-CLIENT':      'webApp',
  'X-BRING-CLIENT-SOURCE': 'webApp',
  'X-BRING-COUNTRY':     'CH',
  'X-BRING-VERSION':     '3.0.0',
};

// Session-Token — bleibt bis Seite neu geladen wird
let _session = null; // { token, userUuid, expiresAt }

// ── Login ─────────────────────────────────────────────────────────────────────
async function bringLogin(email, password) {
  const r = await fetch(`${BRING_BASE}/bringauth`, {
    method: 'POST',
    headers: { ...BRING_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `Login fehlgeschlagen (${r.status})`);
  }
  const d = await r.json();
  _session = {
    token:     d.access_token,
    userUuid:  d.uuid,
    expiresAt: Date.now() + (d.expires_in ?? 3600) * 1000,
  };
  return _session;
}

// ── Session sicherstellen ─────────────────────────────────────────────────────
async function ensureSession(email, password) {
  if (_session && Date.now() < _session.expiresAt - 60_000) return _session;
  return bringLogin(email, password);
}

// ── Erste Liste laden ─────────────────────────────────────────────────────────
async function getFirstList(session) {
  const r = await fetch(`${BRING_BASE}/bringlists/${session.userUuid}`, {
    headers: { ...BRING_HEADERS, 'Authorization': `Bearer ${session.token}` },
  });
  if (!r.ok) throw new Error(`Listen laden fehlgeschlagen (${r.status})`);
  const d = await r.json();
  const lists = d.lists ?? [];
  if (!lists.length) throw new Error('Keine Bring!-Liste gefunden');
  return lists[0].listUuid;
}

// ── Item hinzufügen ───────────────────────────────────────────────────────────
async function addItem(session, listUuid, name, spec) {
  const params = new URLSearchParams({
    purchase:      name,
    recently:      '',
    specification: spec || '',
    remove:        'false',
    sender:        'null',
  });
  const r = await fetch(`${BRING_BASE}/bringlists/${listUuid}`, {
    method: 'PUT',
    headers: {
      ...BRING_HEADERS,
      'Authorization':  `Bearer ${session.token}`,
      'Content-Type':   'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!r.ok) throw new Error(`Item "${name}" konnte nicht hinzugefügt werden (${r.status})`);
}

// ── Hauptfunktion: Rezept-Zutaten nach Bring! exportieren ─────────────────────
// ings:    Array von { m, u, n } — nur toBuy-Zutaten
// factor:  Portionsfaktor
// email, password: Bring!-Credentials aus Settings
export async function exportRecipeToBring(ings, factor, email, password) {
  if (!email || !password) throw new Error('Keine Bring!-Zugangsdaten hinterlegt');
  if (!ings || !ings.length) throw new Error('Keine Zutaten zum Exportieren');

  const session  = await ensureSession(email, password);
  const listUuid = await getFirstList(session);

  let count = 0;
  for (const ing of ings) {
    const name = ing.n?.trim();
    if (!name) continue;

    // Menge skalieren und als Spezifikation formatieren
    const m = (ing.m || 0) * factor;
    const spec = m > 0
      ? `${+m.toFixed(2).replace(/\.?0+$/, '')} ${ing.u || ''}`.trim()
      : (ing.u || '');

    await addItem(session, listUuid, name, spec);
    count++;
  }
  return count;
}
