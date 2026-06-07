import { writable } from 'svelte/store';
import { loadState, saveState, DEFAULT_STATE } from './storage.js';

function createStateStore() {
  const { subscribe, set, update } = writable(loadState());
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
        return next;
      }),
    reset: () => {
      const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState(fresh);
      set(fresh);
    },
    replace: (incoming) => {
      saveState(incoming);
      set(incoming);
    },
  };
}

export const state = createStateStore();

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
