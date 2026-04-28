export function setSyncStatus(s, l) {
  const dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.className = 'dot' + (s === 'ok' ? ' ok' : s === 'err' ? ' err' : s === 'spin' ? ' spin' : '');
  dot.title = l;
}

export function toast(msg) {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

// Fix #3: 'woche' war doppelt im Array
export function showTab(t) {
  ['rezepte', 'woche', 'einkauf', 'archiv', 'einstellungen'].forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) el.style.display = id === t ? '' : 'none';
  });
}

export function kw(d) {
  const dt = new Date(d || Date.now());
  const jan4 = new Date(dt.getFullYear(), 0, 4);
  const sw = jan4.getTime() - (((jan4.getDay() + 6) % 7) * 86400000);
  return Math.floor((dt.getTime() - sw) / 604800000) + 1;
}

// Fix #25: Zentrale Mengen-Formatierung – ganze Zahlen ohne Kommastellen, sonst 1 Nachkommastelle
export function formatAmount(m) {
  if (m == null || !(m > 0)) return '';
  return Number.isInteger(m) ? String(m) : (Math.round(m * 10) / 10).toString();
}

export function fmtIng(ing, factor = 1) {
  const m = ing.m && ing.m > 0 ? ing.m * factor : null;
  const mStr = formatAmount(m);
  return `${mStr} ${esc(ing.u || '')} ${esc(ing.n || '')}`.trim();
}

// Fix #26: HTML-Escape-Helper gegen XSS (wichtig für Discover-importierte Rezepte)
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export function srcHTML(src) {
  if (!src || !src.val) return '';
  if (src.type === 'url') {
    const l = src.val.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return `<span class="src-display">🔗 <a href="${esc(src.val)}" target="_blank" rel="noopener">${esc(l)}</a></span>`;
  }
  return `<span class="src-display">📖 ${esc(src.val)}${src.seite ? ', S. ' + esc(src.seite) : ''}</span>`;
}

// ── Theme (Light / Dark / System) ────────────────────────────────────────────
const THEME_KEY = 'wp_theme';

export function getTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function setTheme(t) {
  if (t === 'system') {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.removeAttribute('data-theme');
  } else {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.setAttribute('data-theme', t);
  }
}

// Call on boot to apply saved theme before first paint if possible
export function initTheme() {
  const t = getTheme();
  if (t !== 'system') {
    document.documentElement.setAttribute('data-theme', t);
  }
}
