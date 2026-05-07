// ── parser.js ─────────────────────────────────────────────────────────────────
// Zentraler Zutaten-Parser für Wochenplan.
// Wird verwendet für:
//   1. Quick Entry (manuell eingetippte Zutaten)
//   2. URL-Import (Strings aus der Edge Function)
//
// Gibt immer { m: number, u: string, n: string } zurück.
// Niemals null — Fallback ist { m: 0, u: '', n: originalLine }.

// ── Einheiten-Map ─────────────────────────────────────────────────────────────
// Key: lowercase-Schreibweise wie sie im Text erscheint
// Value: kanonische Anzeige-Einheit
const UNITS = new Map([
  // Volumen
  ['dl', 'dl'], ['cl', 'cl'], ['ml', 'ml'],
  ['l', 'l'], ['liter', 'l'], ['litre', 'l'],
  // Masse
  ['g', 'g'], ['gr', 'g'], ['gram', 'g'], ['gramm', 'g'],
  ['kg', 'kg'], ['kilogramm', 'kg'],
  // Kücheneinheiten
  ['el', 'EL'], ['essl', 'EL'], ['esslöffel', 'EL'],
  ['tl', 'TL'], ['teel', 'TL'], ['teelöffel', 'TL'],
  // Stückeinheiten
  ['stück', 'Stück'], ['stk', 'Stück'], ['stk.', 'Stück'],
  ['prise', 'Prise'], ['prisen', 'Prise'],
  ['bund', 'Bund'],
  ['dose', 'Dose'], ['dosen', 'Dose'],
  ['pck.', 'Pck.'], ['pck', 'Pck.'], ['päckchen', 'Pck.'], ['packung', 'Pck.'],
  ['becher', 'Becher'],
  ['glas', 'Glas'], ['gläser', 'Glas'],
  ['zehe', 'Zehe'], ['zehen', 'Zehe'], ['zehe/n', 'Zehe'],
  ['scheibe', 'Scheibe'], ['scheiben', 'Scheibe'],
  ['zweig', 'Zweig'], ['zweige', 'Zweig'],
  ['blatt', 'Blatt'], ['blätter', 'Blatt'],
  ['handvoll', 'Handvoll'],
  ['msp.', 'Msp.'], ['msp', 'Msp.'], ['messerspitze', 'Msp.'],
  ['würfel', 'Würfel'],
  ['knolle', 'Knolle'], ['knollen', 'Knolle'],
  ['kopf', 'Kopf'], ['köpfe', 'Kopf'],
  ['stange', 'Stange'], ['stangen', 'Stange'],
  ['tasse', 'Tasse'], ['tassen', 'Tasse'],
  ['pkg.', 'Pkg.'], ['pkg', 'Pkg.'],
]);

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
  // "2 1/2" → 2.5
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  // "1/2" → 0.5
  const simple = s.match(/^(\d+)\/(\d+)$/);
  if (simple) return +simple[1] / +simple[2];
  return null;
}

// ── Haupt-Parser ──────────────────────────────────────────────────────────────
export function parseIngredientLine(raw) {
  if (!raw || !raw.trim()) return null;

  // 1. Unicode-Brüche ersetzen: ½ → 1/2
  let line = raw.trim();
  for (const [char, frac] of Object.entries(UNICODE_FRACTIONS)) {
    line = line.replace(new RegExp(char, 'g'), frac);
  }

  // 2. Deutsches Dezimalkomma → Punkt (nur zwischen Ziffern: 1,5 → 1.5)
  line = line.replace(/(\d),(\d)/g, '$1.$2');

  // 3. Tokenisieren: Zahl(en) am Anfang, dann optionale Einheit, dann Name
  //    Regex erfasst: optionale führende Menge, dann Rest
  //    Mengen-Formate: "500", "1.5", "2 1/2", "1/2", "1-2"
  const quantityRe = /^((?:\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+(?:[.,]\d+)?)\s*(?:-\s*(?:\d+\/\d+|\d+(?:[.,]\d+)?))?)/;
  const qMatch = line.match(quantityRe);

  let m = 0;
  let rest = line;

  if (qMatch) {
    const qStr = qMatch[1].trim();
    rest = line.slice(qMatch[1].length).trim();

    // Range "1-2" → nimm den Maximalwert (konsistent mit bisherigem Verhalten)
    const rangeMatch = qStr.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      m = parseFloat(rangeMatch[2]);
    } else {
      const frac = parseFraction(qStr);
      m = frac !== null ? frac : parseFloat(qStr) || 0;
    }
  }

  // 4. Einheit aus dem Rest extrahieren
  //    Erstes Token des Rests gegen UNITS-Map prüfen
  let u = '';
  if (rest) {
    // Token bis zum ersten Leerzeichen (oder Ende)
    const tokenMatch = rest.match(/^([^\s,]+)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      const canonical = UNITS.get(token.toLowerCase());
      if (canonical) {
        u = canonical;
        rest = rest.slice(token.length).trim();
      }
    }
  }

  // 5. Rest ist der Name — trim und führende Satzzeichen entfernen
  const n = rest.replace(/^[.,;:]\s*/, '').trim();

  // Fallback: wenn kein Name erkannt, ganzen Original-String als Name
  if (!n) return { m: 0, u: '', n: raw.trim() };

  return { m, u, n };
}

// ── Hilfsfunktion für Textarea (mehrere Zeilen) ────────────────────────────────
export function parseIngredientLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseIngredientLine)
    .filter(Boolean);
}
