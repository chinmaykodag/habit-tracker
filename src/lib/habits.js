import {
  today,
  toISODate,
  fromISODate,
  addDays,
  diffDays,
  weekKey,
} from './date.js';

export function isScheduledOn(habit, isoDate) {
  const f = habit.frequency ?? { type: 'daily' };
  switch (f.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return (f.weekdays ?? []).includes(fromISODate(isoDate).getDay());
    case 'times_per_week':
      // A "times per week" habit isn't tied to a specific weekday — it shows
      // every day until the weekly target is met.
      return true;
    default:
      return true;
  }
}

export function weeklyTargetMet(habit, completions, refDate = today(), weekStartsOn = 1) {
  const f = habit.frequency;
  if (!f || f.type !== 'times_per_week') return false;
  const target = f.timesPerWeek ?? 1;
  const wk = weekKey(refDate, weekStartsOn);
  const set = new Set(completions[habit.id] ?? []);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (set.has(toISODate(addDays(wk, i)))) count++;
  }
  return count >= target;
}

export function weeklyCount(habit, completions, refDate = today(), weekStartsOn = 1) {
  const wk = weekKey(refDate, weekStartsOn);
  const set = new Set(completions[habit.id] ?? []);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (set.has(toISODate(addDays(wk, i)))) count++;
  }
  return count;
}

export function isCompletedOn(completions, habitId, isoDate) {
  return (completions[habitId] ?? []).includes(isoDate);
}

// Returns a new state object with the completion toggled.
export function toggleCompletion(state, habitId, isoDate) {
  const list = state.completions[habitId] ?? [];
  const next = list.includes(isoDate)
    ? list.filter((d) => d !== isoDate)
    : [...list, isoDate].sort();
  return {
    ...state,
    completions: { ...state.completions, [habitId]: next },
  };
}

const MAX_LOOKBACK_DAYS = 365 * 5;

export function currentStreak(habit, completions, weekStartsOn = 1) {
  const list = completions[habit.id] ?? [];
  if (list.length === 0) return 0;
  const f = habit.frequency ?? { type: 'daily' };
  const todayISO = today();
  const createdDay = habit.createdAt ? habit.createdAt.slice(0, 10) : null;

  if (f.type === 'times_per_week') {
    let count = 0;
    let cursor = todayISO;
    let first = true;
    while (true) {
      if (weeklyTargetMet(habit, completions, cursor, weekStartsOn)) {
        count++;
      } else if (!first) {
        break;
      }
      const wk = weekKey(cursor, weekStartsOn);
      cursor = toISODate(addDays(wk, -1));
      first = false;
      if (createdDay && cursor < createdDay) break;
      if (diffDays(todayISO, cursor) > MAX_LOOKBACK_DAYS) break;
    }
    return count;
  }

  const set = new Set(list);
  let count = 0;
  let cursor = todayISO;
  let first = true;
  while (true) {
    if (isScheduledOn(habit, cursor)) {
      if (set.has(cursor)) {
        count++;
      } else if (cursor === todayISO && first) {
        // Don't penalize the user for not having completed today yet.
      } else {
        break;
      }
    }
    first = false;
    cursor = toISODate(addDays(cursor, -1));
    if (createdDay && cursor < createdDay) break;
    if (diffDays(todayISO, cursor) > MAX_LOOKBACK_DAYS) break;
  }
  return count;
}

export function longestStreak(habit, completions, weekStartsOn = 1) {
  const list = (completions[habit.id] ?? []).slice().sort();
  if (list.length === 0) return 0;
  const f = habit.frequency ?? { type: 'daily' };

  if (f.type === 'times_per_week') {
    const target = f.timesPerWeek ?? 1;
    const weekCounts = new Map();
    for (const d of list) {
      const wk = weekKey(d, weekStartsOn);
      weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
    }
    const hitWeeks = [...weekCounts.entries()]
      .filter(([, c]) => c >= target)
      .map(([wk]) => wk)
      .sort();
    let longest = 0,
      current = 0,
      prev = null;
    for (const wk of hitWeeks) {
      if (prev === null) {
        current = 1;
      } else {
        const weeksApart = Math.round(diffDays(wk, prev) / 7);
        current = weeksApart === 1 ? current + 1 : 1;
      }
      if (current > longest) longest = current;
      prev = wk;
    }
    return longest;
  }

  const set = new Set(list);
  const end = today();
  let cursor = list[0];
  let longest = 0,
    current = 0;
  while (cursor <= end) {
    if (isScheduledOn(habit, cursor)) {
      if (set.has(cursor)) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }
    cursor = toISODate(addDays(cursor, 1));
  }
  return longest;
}

// Completion rate over the last `days` calendar days (only counting
// scheduled days within that window and after the habit was created).
export function completionRate(habit, completions, days = 30) {
  const end = today();
  const created = habit.createdAt ? habit.createdAt.slice(0, 10) : null;
  const set = new Set(completions[habit.id] ?? []);
  let scheduled = 0,
    done = 0;
  for (let i = 0; i < days; i++) {
    const d = toISODate(addDays(end, -i));
    if (created && d < created) continue;
    if (!isScheduledOn(habit, d)) continue;
    scheduled++;
    if (set.has(d)) done++;
  }
  return scheduled === 0 ? 0 : done / scheduled;
}

export function totalCompletions(habit, completions) {
  return (completions[habit.id] ?? []).length;
}

export function frequencyLabel(habit) {
  const f = habit.frequency ?? { type: 'daily' };
  if (f.type === 'daily') return 'Every day';
  if (f.type === 'weekdays') {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = (f.weekdays ?? []).slice().sort();
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
    if (days.length === 2 && [0, 6].every((d) => days.includes(d))) return 'Weekends';
    return days.map((d) => names[d]).join(', ');
  }
  if (f.type === 'times_per_week') {
    const t = f.timesPerWeek ?? 1;
    return `${t}× per week`;
  }
  return '';
}
