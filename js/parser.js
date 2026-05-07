// ── parser.js ─────────────────────────────────────────────────────────────────
// Zentraler Zutaten-Parser für Wochenplan.
// Einheiten kommen aus settings.einheiten — keine hardcodierte Liste.

// ── UNITS-Map aus Settings aufbauen ──────────────────────────────────────────
export function buildUnitsMap(einheiten) {
  const map = new Map();
  for (const e of (einheiten || [])) {
    if (!e || !e.canonical) continue;
    map.set(e.canonical.toLowerCase(), e.canonical);
    for (const v of (e.variants || [])) {
      map.set(v.toLowerCase(), e.canonical);
    }
  }
  return map;
}

// ── Unicode-Brüche ────────────────────────────────────────────────────────────
const UNICODE_FRACTIONS = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3',
  '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

// ── Bruch-Parsing ─────────────────────────────────────────────────────────────
function parseFraction(s) {
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const simple = s.match(/^(\d+)\/(\d+)$/);
  if (simple) return +simple[1] / +simple[2];
  return null;
}

// ── Haupt-Parser ──────────────────────────────────────────────────────────────
// einheiten: settings.einheiten aus dem Store
export function parseIngredientLine(raw, einheiten) {
  if (!raw || !raw.trim()) return null;
  const unitsMap = buildUnitsMap(einheiten);

  // 1. Unicode-Brüche ersetzen
  let line = raw.trim();
  for (const [char, frac] of Object.entries(UNICODE_FRACTIONS)) {
    line = line.replace(new RegExp(char, 'g'), frac);
  }

  // 2. Deutsches Dezimalkomma → Punkt (nur zwischen Ziffern: 1,5 → 1.5)
  line = line.replace(/(\d),(\d)/g, '$1.$2');

  // 3. Menge parsen: "500" | "1.5" | "1/2" | "2 1/2" | "1-2"
  const quantityRe = /^((?:\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+(?:[.,]\d+)?)\s*(?:-\s*(?:\d+\/\d+|\d+(?:[.,]\d+)?))?)/;
  const qMatch = line.match(quantityRe);
  let m = 0;
  let rest = line;

  if (qMatch) {
    const qStr = qMatch[1].trim();
    rest = line.slice(qMatch[1].length).trim();
    const rangeMatch = qStr.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      m = parseFloat(rangeMatch[2]);
    } else {
      const frac = parseFraction(qStr);
      m = frac !== null ? frac : parseFloat(qStr) || 0;
    }
  }

  // 4. Einheit matchen — erstes Token gegen Settings-Map
  let u = '';
  if (rest) {
    const tokenMatch = rest.match(/^([^\s,]+)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      const canonical = unitsMap.get(token.toLowerCase());
      if (canonical) {
        u = canonical;
        rest = rest.slice(token.length).trim();
      }
    }
  }

  // 5. Rest = Name — führende Satzzeichen entfernen
  const n = rest.replace(/^[.,;:]\s*/, '').trim();
  if (!n) return { m: 0, u: '', n: raw.trim() };

  return { m, u, n };
}

// ── Mehrere Zeilen (Textarea) ─────────────────────────────────────────────────
export function parseIngredientLines(text, einheiten) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => parseIngredientLine(line, einheiten))
    .filter(Boolean);
}
