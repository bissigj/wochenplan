import { SUPA_URL, SUPA_KEY } from './config.js';

export let H = {
  'Content-Type': 'application/json',
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY
};

export function setToken(t) {
  H['Authorization'] = 'Bearer ' + t;
}

function getAuthHeader() {
  try {
    const s = JSON.parse(localStorage.getItem('wp_session'));
    if (s?.access_token) return 'Bearer ' + s.access_token;
  } catch(e) {}
  return H['Authorization'];
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

export async function sbDelete(table, id) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: H
  });
  if (!r.ok) { console.error('sbDelete', table, r.status, await r.text()); }
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

// Resize image to max 1200px wide, 16:9 crop, JPEG 0.85
export async function resizeImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
        resolve(new File([blob], 'rezept.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export async function sbUploadImage(file) {
  // Resize before upload
  let uploadFile = file;
  try { uploadFile = await resizeImage(file); } catch(e) { console.warn('Resize failed, using original', e); }
  const auth = getAuthHeader();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const r = await fetch(`${SUPA_URL}/storage/v1/object/rezeptbilder/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': auth,
      'Content-Type': 'image/jpeg'
    },
    body: uploadFile
  });
  if (!r.ok) { console.error('Upload failed', r.status, await r.text()); return null; }
  return `${SUPA_URL}/storage/v1/object/public/rezeptbilder/${path}`;
}

export async function sbDeleteImage(url) {
  if (!url) return;
  const path = url.split('/rezeptbilder/')[1];
  if (!path) return;
  const auth = getAuthHeader();
  const r = await fetch(`${SUPA_URL}/storage/v1/object/rezeptbilder/${path}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPA_KEY, 'Authorization': auth }
  });
  if (!r.ok) console.warn('Delete image failed', r.status, await r.text());
}
