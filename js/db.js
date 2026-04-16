import { SUPA_URL, SUPA_KEY } from './config.js';

export let H = {
  'Content-Type': 'application/json',
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY
};

export function setToken(t) {
  H['Authorization'] = 'Bearer ' + t;
}

export async function sbGet(table, filter = '') {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}&order=created_at.asc`, {
    headers: { ...H, 'Prefer': 'return=representation' }
  });
  if (!r.ok) { console.error('sbGet', table, r.status, await r.text()); return []; }
  return r.json();
}

export async function sbInsert(table, body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { console.error('sbInsert', table, r.status, await r.text()); return []; }
  return r.json();
}

export async function sbUpdate(table, id, body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { console.error('sbUpdate', table, r.status, await r.text()); return []; }
  return r.json();
}
