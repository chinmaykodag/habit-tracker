import { writable, get } from 'svelte/store';
import { loadState, saveState, DEFAULT_STATE } from './storage.js';
import { supabase, supabaseEnabled } from './supabase.js';
import { pullUserData, pushAllUserData, pushDiff, flushOutbox, clearOutbox } from './sync.js';

// ─── Auth stores ─────────────────────────────────────────────────────────────

/** { id, email } when signed in, null when signed out. */
export const authUser = writable(null);

/** True while the initial session check + data pull is in progress. */
export const authLoading = writable(supabaseEnabled);

/** 'idle' | 'syncing' | 'error' | 'offline' */
export const syncStatus = writable('idle');

// ─── State store ─────────────────────────────────────────────────────────────

function createStateStore() {
  const { subscribe, set, update } = writable(loadState());

  function syncInBackground(oldState, newState) {
    const user = get(authUser);
    if (!supabaseEnabled || !user) return;
    syncStatus.set('syncing');
    pushDiff(user.id, oldState, newState)
      .then(() => syncStatus.set('idle'))
      .catch(() => syncStatus.set('error'));
  }

  return {
    subscribe,
    set: (v) => {
      saveState(v);
      set(v);
    },
    update: (fn) =>
      update((s) => {
        const next = fn(s);
        saveState(next);
        syncInBackground(s, next);
        return next;
      }),
    reset: () => {
      const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState(fresh);
      set(fresh);
      // Also clear the user's remote data
      const user = get(authUser);
      if (supabaseEnabled && user) {
        pushAllUserData(fresh).catch(() => {});
      }
    },
    replace: (incoming) => {
      saveState(incoming);
      set(incoming);
      // Push the imported data to Supabase too
      const user = get(authUser);
      if (supabaseEnabled && user) {
        pushAllUserData(incoming).catch(() => {});
      }
    },
  };
}

export const state = createStateStore();

// ─── Auth bootstrap ───────────────────────────────────────────────────────────

async function loadAndApplyRemoteData() {
  try {
    syncStatus.set('syncing');
    const remote = await pullUserData();

    // First-time migration: if remote is empty but local has habits, push local up.
    const local = loadState();
    if (remote.habits.length === 0 && local.habits.length > 0) {
      await pushAllUserData(local);
      // Keep using local data (it's now also in Supabase)
      syncStatus.set('idle');
      return;
    }

    // Otherwise apply remote data (merging completions as a union to avoid data loss)
    const mergedCompletions = { ...local.completions };
    for (const [id, dates] of Object.entries(remote.completions)) {
      const merged = new Set([...(mergedCompletions[id] ?? []), ...dates]);
      mergedCompletions[id] = [...merged].sort();
    }

    const merged = { ...remote, completions: mergedCompletions };
    saveState(merged);
    state.set(merged);
    syncStatus.set('idle');
  } catch {
    syncStatus.set('error');
  }
}

export async function initAuth() {
  if (!supabaseEnabled) {
    authLoading.set(false);
    return;
  }

  // Restore session from stored token (fast, no network)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    authUser.set({ id: session.user.id, email: session.user.email });
    await loadAndApplyRemoteData();
  }
  authLoading.set(false);

  // React to future sign-in / sign-out events
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      authUser.set({ id: session.user.id, email: session.user.email });
      authLoading.set(true);
      await loadAndApplyRemoteData();
      authLoading.set(false);
      await flushOutbox();
    } else if (event === 'SIGNED_OUT') {
      authUser.set(null);
      clearOutbox();
      // Reset to a blank local state so the next user starts clean
      const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState(fresh);
      state.set(fresh);
    }
  });

  // Re-pull when the tab regains focus (catches edits from other devices)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && get(authUser)) {
        loadAndApplyRemoteData();
      }
    });
    window.addEventListener('online', () => {
      if (get(authUser)) flushOutbox();
    });
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  // onAuthStateChange handles the rest
}

// ─── Routing ─────────────────────────────────────────────────────────────────

function parseHash() {
  if (typeof window === 'undefined') return { path: '/today', parts: ['today'] };
  const raw = window.location.hash || '#/today';
  const path = raw.startsWith('#') ? raw.slice(1) : raw;
  const parts = path.split('/').filter(Boolean);
  return { path, parts };
}

export const route = writable(parseHash());

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => route.set(parseHash()));
  if (!window.location.hash) {
    window.location.hash = '#/today';
  }
}

export function navigate(path) {
  if (typeof window === 'undefined') return;
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}
