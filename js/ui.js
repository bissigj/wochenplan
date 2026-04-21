export function setSyncStatus(s, l) {
  const dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.className = 'dot' + (s === 'ok' ? ' ok' : s === 'err' ? ' err' : s === 'spin' ? ' spin' : '');
  dot.title = l;
}

export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

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

export function fmtIng(ing, factor = 1) {
  const m = ing.m && ing.m > 0 ? ing.m * factor : null;
  const mStr = m === null ? '' : (Number.isInteger(m) ? m : m.toFixed(1));
  return `${mStr} ${ing.u} ${ing.n}`.trim();
}

export function srcHTML(src) {
  if (!src || !src.val) return '';
  if (src.type === 'url') {
    const l = src.val.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return `<span class="src-display">🔗 <a href="${src.val}" target="_blank">${l}</a></span>`;
  }
  return `<span class="src-display">📖 ${src.val}${src.seite ? ', S. ' + src.seite : ''}</span>`;
}
