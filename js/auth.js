import { SUPA_URL, SUPA_KEY } from './config.js';
import { H, setToken } from './db.js';
import { setSyncStatus } from './ui.js';
import { loadData } from './data.js';
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

export async function onLoggedIn() {
  localStorage.setItem('wp_session', JSON.stringify(session));
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('register-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = '';
  setSyncStatus('spin', 'Lade…');
  await loadData();
  setSyncStatus('ok', 'Synchronisiert');
  renderAll();
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
        return true;
      }
    }
  } catch (e) {}
  return false;
}
