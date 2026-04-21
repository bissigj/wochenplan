import { SUPA_URL, SUPA_KEY } from './config.js';
import { H, setToken, sbGet, sbInsert, sbUpdate } from './db.js';
import { setSyncStatus } from './ui.js';
import { loadData, D } from './data.js';
import { renderAll } from './app.js';

export let session = null;
let refreshTimer = null;

function scheduleRefresh(session) {
  clearTimeout(refreshTimer);
  // expires_at ist Unix-Timestamp in Sekunden
  const expiresIn = session.expires_at * 1000 - Date.now();
  // 2 Minuten vor Ablauf refreshen
  const refreshIn = expiresIn - 2 * 60 * 1000;
  if (refreshIn <= 0) {
    doRefresh(session.refresh_token);
    return;
  }
  refreshTimer = setTimeout(() => doRefresh(session.refresh_token), refreshIn);
}

async function doRefresh(refreshToken) {
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const d = await r.json();
    if (d.access_token) {
      session = d;
      setToken(d.access_token);
      localStorage.setItem('wp_session', JSON.stringify(d));
      scheduleRefresh(d); // nächsten Refresh planen
    } else {
      // Refresh fehlgeschlagen → neu anmelden
      doLogout();
    }
  } catch(e) {
    console.error('Token refresh failed', e);
  }
}

export async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pw = document.getElementById('l-pw').value;
  document.getElementById('l-err').textContent = '';
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
      body: JSON.stringify({ email, password: pw })
    });
    const d = await r.json();
    if (d.error || d.error_code) {
      document.getElementById('l-err').textContent = d.error_description || d.msg || d.error;
      return;
    }
    session = d;
    scheduleRefresh(session);
    setToken(d.access_token);
    await onLoggedIn();
  } catch (e) {
    document.getElementById('l-err').textContent = 'Verbindungsfehler: ' + e.message;
  }
}

export async function doRegister() {
  const email = document.getElementById('r-email').value.trim();
  const pw = document.getElementById('r-pw').value;
  document.getElementById('r-err').textContent = '';
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY },
      body: JSON.stringify({ email, password: pw })
    });
    const d = await r.json();
    if (d.error || d.error_code) {
      document.getElementById('r-err').textContent = d.error_description || d.msg || d.error;
      return;
    }
    if (d.access_token) { session = d; setToken(d.access_token); await onLoggedIn(); return; }
    document.getElementById('l-email').value = email;
    document.getElementById('l-pw').value = pw;
    showLogin();
    setTimeout(doLogin, 400);
  } catch (e) {
    document.getElementById('r-err').textContent = 'Verbindungsfehler: ' + e.message;
  }
}

export function doLogout() {
  session = null;
  setToken(SUPA_KEY);
  localStorage.removeItem('wp_session');
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

export function showRegister() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'flex';
}

export function showLogin() {
  document.getElementById('register-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function resolveFamily(userId) {
  const members = await sbGet('family_members', `user_id=eq.${userId}&select=family_id,role`);
  if (members && members.length) {
    D.familyId = members[0].family_id;
    return true; // has family
  }
  return false; // no family yet
}

export async function obCreateFamily() {
  const name = document.getElementById('ob-family-name').value.trim();
  const err = document.getElementById('ob-err');
  if (!name) { err.textContent = 'Bitte einen Familiennamen eingeben.'; return; }
  err.textContent = '';
  const fam = await sbInsert('families', { name });
  if (!fam || !fam[0]) { err.textContent = 'Fehler beim Erstellen.'; return; }
  D.familyId = fam[0].id;
  await sbInsert('family_members', { family_id: D.familyId, user_id: D.userId, role: 'admin', email: session.user.email });
  D.familyName = name;
  document.getElementById('onboarding-screen').style.display = 'none';
  await finishLogin();
}

export async function obJoinFamily() {
  const code = document.getElementById('ob-invite-code').value.trim().toUpperCase();
  const err = document.getElementById('ob-err');
  if (!code) { err.textContent = 'Bitte einen Einladungscode eingeben.'; return; }
  err.textContent = '';
  const inv = await sbGet('invitations', `code=eq.${code}&select=id,family_id,used_at,expires_at,role`);
  if (!inv || !inv.length) { err.textContent = '❌ Ungültiger Code.'; return; }
  const i = inv[0];
  if (i.used_at) { err.textContent = '❌ Code bereits verwendet.'; return; }
  if (new Date(i.expires_at) < new Date()) { err.textContent = '❌ Code abgelaufen.'; return; }
  D.familyId = i.family_id;
  await sbInsert('family_members', { family_id: D.familyId, user_id: D.userId, role: i.role || 'member', email: session.user.email });
  await sbUpdate('invitations', i.id, { used_by: D.userId, used_at: new Date().toISOString() });
  const fams = await sbGet('families', `id=eq.${D.familyId}&select=name`);
  if (fams && fams[0]) D.familyName = fams[0].name;
  document.getElementById('onboarding-screen').style.display = 'none';
  await finishLogin();
}

async function finishLogin() {
  document.getElementById('main-screen').style.display = '';
  setSyncStatus('spin', 'Lade…');
  await loadData();
  setSyncStatus('ok', 'Synchronisiert');
  renderAll();
}

export async function onLoggedIn() {
  localStorage.setItem('wp_session', JSON.stringify(session));
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'none';
  D.userId = session.user.id;
  D.userEmail = session.user.email;
  const hasFamily = await resolveFamily(session.user.id);
  if (!hasFamily) {
    document.getElementById('onboarding-screen').style.display = 'flex';
    return;
  }
  const fams = await sbGet('families', `id=eq.${D.familyId}&select=name`);
  if (fams && fams[0]) D.familyName = fams[0].name;
  await finishLogin();
}

export async function tryRestoreSession() {
  try {
    const saved = localStorage.getItem('wp_session');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.access_token && s.expires_at && Date.now() / 1000 < s.expires_at) {
        session = s;
        scheduleRefresh(session);
        setToken(s.access_token);
        await onLoggedIn();
        hideLoading();
        return true;
      }
    }
  } catch (e) {}
  hideLoading();
  return false;
}

function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (el) el.style.display = 'none';
}
