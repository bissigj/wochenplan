export const state = {
  recipes: [],
  weekPlan: { kw: '', year: 0, days: [], portions: 2 },
  archive: [],
  nextId: 1,
  settings: { cats: [], aufwand: [], einheiten: [] },
  familyId: null,
  familyName: '',
  userId: null,
  userEmail: '',
  activeTab: 'rezepte',
  recipeFilter: ''
};

const listeners = [];

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
  renderApp(); // 🔥 wichtig
}
