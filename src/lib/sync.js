/**
 * sync.js — Supabase ↔ localStorage sync layer
 *
 * Strategy:
 *   • Reads/writes always hit localStorage first (instant, offline-safe).
 *   • After each state change, a diff is computed and pushed to Supabase
 *     asynchronously in the background.
 *   • Failed writes are queued in an outbox (also in localStorage) and
 *     retried when the device comes back online.
 *   • On sign-in (or tab becoming visible), a full pull from Supabase
 *     overwrites localStorage to catch remote changes.
 */

import { supabase } from './supabase.js';
import { DEFAULT_STATE } from './storage.js';

// ─── Shape transformers ───────────────────────────────────────────────────────

function habitFromDB(row) {
  return {
    id:          row.id,
    name:        row.name,
    color:       row.color ?? null,
    icon:        row.icon ?? null,
    categoryId:  row.category_id ?? null,
    frequency:   row.frequency ?? { type: 'daily' },
    createdAt:   row.created_at,
    archivedAt:  row.archived_at ?? null,
  };
}

function habitToDB(habit, userId) {
  return {
    id:          habit.id,
    user_id:     userId,
    name:        habit.name,
    color:       habit.color ?? null,
    icon:        habit.icon ?? null,
    category_id: habit.categoryId ?? null,
    frequency:   habit.frequency ?? { type: 'daily' },
    created_at:  habit.createdAt,
    archived_at: habit.archivedAt ?? null,
    updated_at:  new Date().toISOString(),
  };
}

function categoryFromDB(row) {
  return { id: row.id, name: row.name, color: row.color };
}

function categoryToDB(cat, userId) {
  return {
    id:         cat.id,
    user_id:    userId,
    name:       cat.name,
    color:      cat.color,
    updated_at: new Date().toISOString(),
  };
}

function settingsFromDB(row) {
  if (!row) return { ...DEFAULT_STATE.settings };
  return {
    theme:        row.theme        ?? DEFAULT_STATE.settings.theme,
    accent:       row.accent       ?? DEFAULT_STATE.settings.accent,
    weekStartsOn: row.week_starts_on ?? DEFAULT_STATE.settings.weekStartsOn,
    statsOrder:   row.stats_order  ?? DEFAULT_STATE.settings.statsOrder,
  };
}

function settingsToDB(settings, userId) {
  return {
    user_id:       userId,
    theme:         settings.theme,
    accent:        settings.accent,
    week_starts_on: settings.weekStartsOn,
    stats_order:   settings.statsOrder ?? null,
    updated_at:    new Date().toISOString(),
  };
}

// ─── Pull (Supabase → state shape) ───────────────────────────────────────────

export async function pullUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const userId = user.id;

  const [habitsRes, catsRes, completionsRes, settingsRes] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('completions').select('habit_id, date').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  for (const res of [habitsRes, catsRes, completionsRes]) {
    if (res.error) throw res.error;
  }

  // Group completions: { habitId → ['YYYY-MM-DD', ...] }
  const completions = {};
  for (const row of completionsRes.data ?? []) {
    if (!completions[row.habit_id]) completions[row.habit_id] = [];
    // Supabase returns DATE as 'YYYY-MM-DD' string already
    completions[row.habit_id].push(String(row.date));
  }
  // Sort each list for consistency
  for (const k of Object.keys(completions)) completions[k].sort();

  return {
    version:     1,
    habits:      (habitsRes.data ?? []).map(habitFromDB),
    categories:  (catsRes.data ?? []).map(categoryFromDB),
    completions,
    settings:    settingsFromDB(settingsRes.data),
  };
}

// ─── Push entire state (used for first-time migration / full import) ──────────

export async function pushAllUserData(state) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const userId = user.id;

  // Run in parallel where possible
  const habitRows = state.habits.map((h) => habitToDB(h, userId));
  const catRows   = state.categories.map((c) => categoryToDB(c, userId));

  const completionRows = [];
  for (const [habitId, dates] of Object.entries(state.completions ?? {})) {
    for (const date of dates ?? []) {
      completionRows.push({ user_id: userId, habit_id: habitId, date });
    }
  }

  const settingsRow = settingsToDB(state.settings, userId);

  // Upsert everything
  await Promise.all([
    habitRows.length ? supabase.from('habits').upsert(habitRows) : Promise.resolve(),
    catRows.length   ? supabase.from('categories').upsert(catRows) : Promise.resolve(),
    completionRows.length
      ? supabase.from('completions').upsert(completionRows, { onConflict: 'user_id,habit_id,date' })
      : Promise.resolve(),
    supabase.from('user_settings').upsert(settingsRow),
  ]);
}

// ─── Diff + push (called on every state.update) ───────────────────────────────

export async function pushDiff(userId, oldState, newState) {
  const ops = computeOps(userId, oldState, newState);
  if (ops.length === 0) return;

  const failed = [];
  for (const op of ops) {
    try {
      await executeOp(op);
    } catch {
      failed.push(op);
    }
  }
  if (failed.length) addToOutbox(failed);
}

function computeOps(userId, oldState, newState) {
  const ops = [];

  // ── Completions (most frequent change) ──
  const allHabitIds = new Set([
    ...Object.keys(oldState.completions ?? {}),
    ...Object.keys(newState.completions ?? {}),
  ]);
  for (const habitId of allHabitIds) {
    const oldSet = new Set(oldState.completions?.[habitId] ?? []);
    const newSet = new Set(newState.completions?.[habitId] ?? []);
    for (const d of newSet) {
      if (!oldSet.has(d)) ops.push({ type: 'completion_add', userId, habitId, date: d });
    }
    for (const d of oldSet) {
      if (!newSet.has(d)) ops.push({ type: 'completion_del', userId, habitId, date: d });
    }
  }

  // ── Habits ──
  const oldById = new Map((oldState.habits ?? []).map((h) => [h.id, h]));
  const newById = new Map((newState.habits ?? []).map((h) => [h.id, h]));
  for (const h of newState.habits ?? []) {
    const old = oldById.get(h.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(h)) {
      ops.push({ type: 'habit_upsert', userId, habit: h });
    }
  }
  for (const h of oldState.habits ?? []) {
    if (!newById.has(h.id)) {
      ops.push({ type: 'habit_delete', userId, habitId: h.id });
    }
  }

  // ── Categories ──
  const oldCatById = new Map((oldState.categories ?? []).map((c) => [c.id, c]));
  const newCatById = new Map((newState.categories ?? []).map((c) => [c.id, c]));
  for (const c of newState.categories ?? []) {
    const old = oldCatById.get(c.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(c)) {
      ops.push({ type: 'category_upsert', userId, category: c });
    }
  }
  for (const c of oldState.categories ?? []) {
    if (!newCatById.has(c.id)) {
      ops.push({ type: 'category_delete', userId, categoryId: c.id });
    }
  }

  // ── Settings ──
  if (JSON.stringify(oldState.settings) !== JSON.stringify(newState.settings)) {
    ops.push({ type: 'settings_upsert', userId, settings: newState.settings });
  }

  return ops;
}

async function executeOp(op) {
  switch (op.type) {
    case 'completion_add':
      await supabase.from('completions')
        .upsert({ user_id: op.userId, habit_id: op.habitId, date: op.date },
                 { onConflict: 'user_id,habit_id,date' });
      break;
    case 'completion_del':
      await supabase.from('completions')
        .delete()
        .match({ user_id: op.userId, habit_id: op.habitId, date: op.date });
      break;
    case 'habit_upsert':
      await supabase.from('habits').upsert(habitToDB(op.habit, op.userId));
      break;
    case 'habit_delete':
      await supabase.from('habits').delete().match({ id: op.habitId, user_id: op.userId });
      await supabase.from('completions').delete().match({ user_id: op.userId, habit_id: op.habitId });
      break;
    case 'category_upsert':
      await supabase.from('categories').upsert(categoryToDB(op.category, op.userId));
      break;
    case 'category_delete':
      await supabase.from('categories').delete().match({ id: op.categoryId, user_id: op.userId });
      break;
    case 'settings_upsert':
      await supabase.from('user_settings').upsert(settingsToDB(op.settings, op.userId));
      break;
  }
}

// ─── Outbox (offline write queue) ────────────────────────────────────────────

const OUTBOX_KEY = 'habit-tracker:outbox';

function getOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]'); } catch { return []; }
}

function addToOutbox(ops) {
  const outbox = getOutbox();
  outbox.push(...ops.map((op) => ({ ...op, ts: Date.now() })));
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
}

export async function flushOutbox() {
  const outbox = getOutbox();
  if (outbox.length === 0) return;
  const failed = [];
  for (const op of outbox) {
    try { await executeOp(op); } catch { failed.push(op); }
  }
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(failed));
}

export function clearOutbox() {
  localStorage.removeItem(OUTBOX_KEY);
}
