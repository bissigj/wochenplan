// ── store.js ──────────────────────────────────────────────────────────────────
// Zentraler State-Container für Wochenplan.
// Phase 1: Store einführen, D in data.js als Proxy-Shim weiterhin exportieren
// damit alle bestehenden Module ohne Änderung funktionieren.
//
// API:
//   getState()         → aktueller State (readonly behandeln)
//   setState(updater)  → updater(state) gibt partielles Objekt zurück, wird gemergt
//   subscribe(fn)      → fn(state) wird bei jeder Änderung aufgerufen
//   unsubscribe(fn)    → Listener entfernen

const _initialState = {
  recipes:    [],
  weekPlan:   { kw: '', year: 0, days: [], portions: 2 },
  archive:    [],
  nextId:     1,
  settings:   { cats: [], aufwand: [], einheiten: [] },
  familyId:   null,
  familyName: '',
  userId:     null,
  userEmail:  '',
};

let _state = { ..._initialState };
const _listeners = new Set();

export function getState() {
  return _state;
}

export function setState(updater) {
  const patch = updater(_state);
  _state = { ..._state, ...patch };
  _listeners.forEach(fn => fn(_state));
}

export function subscribe(fn) {
  _listeners.add(fn);
}

export function unsubscribe(fn) {
  _listeners.delete(fn);
}

// Direkt einen flachen Wert setzen ohne Updater-Funktion
// Kurzform: setKey('familyId', 'abc-123')
export function setKey(key, value) {
  setState(() => ({ [key]: value }));
}
