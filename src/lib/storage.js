const STORAGE_KEY = 'habit-tracker:v1';

// Canonical default ordering for the Stats page. Add new section ids to
// the end — user-saved orders that don't include a new id will get that
// id appended at render time (forward compat). Removed ids are filtered
// out gracefully.
export const DEFAULT_STATS_ORDER = [
  'hero',
  'insights',
  'annual',
  'weekly',
  'dow',
  'leaderboard',
  'records',
  'categories',
];

export const DEFAULT_STATE = {
  version: 1,
  habits: [],
  categories: [],
  completions: {},
  settings: {
    theme: 'system',
    weekStartsOn: 1, // 0 = Sunday, 1 = Monday
    statsOrder: [...DEFAULT_STATS_ORDER],
  },
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function migrate(state) {
  return {
    ...DEFAULT_STATE,
    ...state,
    habits: Array.isArray(state.habits) ? state.habits : [],
    categories: Array.isArray(state.categories) ? state.categories : [],
    completions:
      state.completions && typeof state.completions === 'object' ? state.completions : {},
    settings: { ...DEFAULT_STATE.settings, ...(state.settings ?? {}) },
  };
}

export function loadState() {
  if (typeof localStorage === 'undefined') return clone(DEFAULT_STATE);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_STATE);
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.error('habit-tracker: failed to load state, using defaults', err);
    return clone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('habit-tracker: failed to save state', err);
  }
}

export function newId(prefix = 'h') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export { STORAGE_KEY };
