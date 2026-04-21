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

let _renderApp = null;

export function registerRenderApp(fn) {
  _renderApp = fn;
}

export function setState(patch) {
  Object.assign(state, patch);
  if (_renderApp) _renderApp(state);
}
