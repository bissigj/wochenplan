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

  // Get fresh token from localStorage
  let auth = H['Authorization'];
  try {
    const s = JSON.parse(localStorage.getItem('wp_session'));
    if (s && s.access_token) auth = 'Bearer ' + s.access_token;
  } catch(e) {}

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
