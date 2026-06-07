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

// Completion rate over the last `days` calendar days.
// - For daily/weekdays habits: scheduled days within the window (after the
//   habit was created) form the denominator, completed days the numerator.
// - For times_per_week habits: we judge by week, so the denominator is the
//   number of *whole weeks* in the window the habit has existed, and the
//   numerator is the number of those weeks where the target was met.
//   The current (partial) week is included only if the target has already
//   been met (so a half-complete current week doesn't drag the rate down).
export function completionRate(habit, completions, days = 30, weekStartsOn = 1) {
  const end = today();
  const created = habit.createdAt ? habit.createdAt.slice(0, 10) : null;
  const f = habit.frequency ?? { type: 'daily' };

  if (f.type === 'times_per_week') {
    const windowStart = toISODate(addDays(end, -(days - 1)));
    const effectiveStart = created && created > windowStart ? created : windowStart;
    const seenWeeks = new Set();
    let scheduled = 0;
    let done = 0;
    const todayWeek = weekKey(end, weekStartsOn);
    for (let d = effectiveStart; d <= end; d = toISODate(addDays(d, 1))) {
      const wk = weekKey(d, weekStartsOn);
      if (seenWeeks.has(wk)) continue;
      seenWeeks.add(wk);
      const met = weeklyTargetMet(habit, completions, d, weekStartsOn);
      if (wk === todayWeek && !met) continue; // current week pending — don't count yet
      scheduled++;
      if (met) done++;
    }
    return scheduled === 0 ? 0 : done / scheduled;
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate helpers — operate across all habits, used by the Stats page.
// ─────────────────────────────────────────────────────────────────────────────

// "Daily-scoped" habits — daily or specific weekdays. We evaluate perfect
// days against these only, because times_per_week habits are judged weekly.
function dailyScopedHabits(habits) {
  return habits.filter((h) => {
    const t = h.frequency?.type;
    return t === 'daily' || t === 'weekdays' || t == null;
  });
}

// Returns { scheduled, done, level }. Level 0-4 used for heatmap shading.
// 0 = nothing scheduled, 1..4 = quartiles of completion. Level 0 also when
// nothing scheduled (renders blank-ish).
export function dailyAggregate(habits, completions, isoDate) {
  const daily = dailyScopedHabits(habits).filter((h) => !h.archivedAt);
  let scheduled = 0;
  let done = 0;
  for (const h of daily) {
    const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
    if (created && isoDate < created) continue;
    if (!isScheduledOn(h, isoDate)) continue;
    scheduled++;
    if ((completions[h.id] ?? []).includes(isoDate)) done++;
  }
  if (scheduled === 0) return { scheduled: 0, done: 0, level: 0 };
  const ratio = done / scheduled;
  let level;
  if (ratio === 0) level = 0;
  else if (ratio < 0.34) level = 1;
  else if (ratio < 0.67) level = 2;
  else if (ratio < 1) level = 3;
  else level = 4;
  return { scheduled, done, level };
}

// A day is "perfect" iff at least one daily/weekday habit is scheduled and
// every scheduled habit on that day was completed.
export function isPerfectDay(habits, completions, isoDate) {
  const agg = dailyAggregate(habits, completions, isoDate);
  return agg.scheduled > 0 && agg.done === agg.scheduled;
}

// Days with nothing scheduled are *skipped* (don't break the streak), but
// also don't count toward it.
export function currentPerfectStreak(habits, completions) {
  const todayISO = today();
  let cursor = todayISO;
  let count = 0;
  let first = true;
  while (true) {
    const agg = dailyAggregate(habits, completions, cursor);
    if (agg.scheduled === 0) {
      // skip — neither extends nor breaks
    } else if (agg.done === agg.scheduled) {
      count++;
    } else if (cursor === todayISO && first) {
      // today still in progress — don't break the streak
    } else {
      break;
    }
    first = false;
    cursor = toISODate(addDays(cursor, -1));
    if (diffDays(todayISO, cursor) > MAX_LOOKBACK_DAYS) break;
  }
  return count;
}

// Counts perfect days within [startIso, endIso] inclusive. Skips days
// where nothing was scheduled.
export function perfectDaysInRange(habits, completions, startIso, endIso) {
  let count = 0;
  for (let d = startIso; d <= endIso; d = toISODate(addDays(d, 1))) {
    if (isPerfectDay(habits, completions, d)) count++;
  }
  return count;
}

// Aggregate completion rate across multiple habits over a date range
// [startIso, endIso] inclusive. Honors each habit's frequency and
// created-on date. Returns 0..1.
export function periodCompletionRate(habits, completions, startIso, endIso, weekStartsOn = 1) {
  let scheduled = 0;
  let done = 0;
  const todayISO = today();
  const todayWeek = weekKey(todayISO, weekStartsOn);

  for (const h of habits) {
    if (h.archivedAt) continue;
    const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
    const f = h.frequency ?? { type: 'daily' };
    const set = new Set(completions[h.id] ?? []);

    if (f.type === 'times_per_week') {
      const seen = new Set();
      for (let d = startIso; d <= endIso; d = toISODate(addDays(d, 1))) {
        if (created && d < created) continue;
        if (d > todayISO) break;
        const wk = weekKey(d, weekStartsOn);
        if (seen.has(wk)) continue;
        seen.add(wk);
        const met = weeklyTargetMet(h, completions, d, weekStartsOn);
        if (wk === todayWeek && !met) continue;
        scheduled++;
        if (met) done++;
      }
    } else {
      for (let d = startIso; d <= endIso; d = toISODate(addDays(d, 1))) {
        if (created && d < created) continue;
        if (d > todayISO) break;
        if (!isScheduledOn(h, d)) continue;
        scheduled++;
        if (set.has(d)) done++;
      }
    }
  }
  return scheduled === 0 ? 0 : done / scheduled;
}

// Per-weekday completion rate for daily/weekday habits over the last `days`
// days. Returns an array of length 7 indexed by jsDay (0=Sun..6=Sat) with
// objects { day, rate, sampleSize }. Days with no samples have rate = null.
export function weekdayBreakdown(habits, completions, days = 90) {
  const daily = dailyScopedHabits(habits).filter((h) => !h.archivedAt);
  const sched = [0, 0, 0, 0, 0, 0, 0];
  const done = [0, 0, 0, 0, 0, 0, 0];
  const end = today();
  for (const h of daily) {
    const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
    const set = new Set(completions[h.id] ?? []);
    for (let i = 0; i < days; i++) {
      const d = toISODate(addDays(end, -i));
      if (created && d < created) continue;
      if (!isScheduledOn(h, d)) continue;
      const dow = fromISODate(d).getDay();
      sched[dow]++;
      if (set.has(d)) done[dow]++;
    }
  }
  return sched.map((s, i) => ({
    day: i,
    sampleSize: s,
    rate: s === 0 ? null : done[i] / s,
  }));
}

// All-time personal records, scanned in a single pass per habit.
// Returns: { longestPerfectStreak, mostCheckinsInDay: {date, count},
// mostCheckinsInWeek: {wk, count}, longestHabitStreak: {habit, length},
// ytdTotal }.
export function personalRecords(habits, completions, weekStartsOn = 1) {
  const allDates = new Set();
  const perDay = new Map();
  const perWeek = new Map();
  let ytdTotal = 0;
  const yearStart = today().slice(0, 4) + '-01-01';

  for (const h of habits) {
    for (const d of completions[h.id] ?? []) {
      allDates.add(d);
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
      const wk = weekKey(d, weekStartsOn);
      perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
      if (d >= yearStart) ytdTotal++;
    }
  }

  let mostDay = { date: null, count: 0 };
  for (const [d, c] of perDay) {
    if (c > mostDay.count) mostDay = { date: d, count: c };
  }
  let mostWk = { wk: null, count: 0 };
  for (const [wk, c] of perWeek) {
    if (c > mostWk.count) mostWk = { wk, count: c };
  }

  // Longest perfect-day streak (all-time)
  let longestPerfect = 0;
  if (allDates.size > 0) {
    const sortedDates = [...allDates].sort();
    const start = sortedDates[0];
    const end = today();
    let current = 0;
    for (let d = start; d <= end; d = toISODate(addDays(d, 1))) {
      const agg = dailyAggregate(habits, completions, d);
      if (agg.scheduled === 0) {
        // skip
      } else if (agg.done === agg.scheduled) {
        current++;
        if (current > longestPerfect) longestPerfect = current;
      } else {
        current = 0;
      }
    }
  }

  let longestHabit = { habit: null, length: 0 };
  for (const h of habits) {
    const len = longestStreak(h, completions, weekStartsOn);
    if (len > longestHabit.length) longestHabit = { habit: h, length: len };
  }

  return {
    longestPerfectStreak: longestPerfect,
    mostCheckinsInDay: mostDay,
    mostCheckinsInWeek: mostWk,
    longestHabitStreak: longestHabit,
    ytdTotal,
  };
}

// Generates a ranked list of insight strings. Each rule returns null or an
// object { text, score, kind }. Caller picks the top N by score.
export function generateInsights(habits, completions, weekStartsOn = 1) {
  const insights = [];
  const active = habits.filter((h) => !h.archivedAt);
  if (active.length === 0) return insights;

  // Best vs worst weekday gap
  const wk = weekdayBreakdown(active, completions, 60);
  const measurable = wk.filter((d) => d.rate !== null && d.sampleSize >= 3);
  if (measurable.length >= 4) {
    const sorted = [...measurable].sort((a, b) => b.rate - a.rate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.rate - worst.rate >= 0.2) {
      const names = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
      insights.push({
        text: `You're most consistent on **${names[best.day]}** (${Math.round(best.rate * 100)}%) and least on **${names[worst.day]}** (${Math.round(worst.rate * 100)}%).`,
        score: (best.rate - worst.rate) * 100,
        kind: 'weekday',
      });
    }
  }

  // Weekend vs weekday gap
  const weekendDays = wk.filter((d) => (d.day === 0 || d.day === 6) && d.rate !== null && d.sampleSize >= 3);
  const weekdayDays = wk.filter((d) => d.day >= 1 && d.day <= 5 && d.rate !== null && d.sampleSize >= 3);
  if (weekendDays.length > 0 && weekdayDays.length > 0) {
    const avg = (arr) => arr.reduce((s, x) => s + x.rate, 0) / arr.length;
    const we = avg(weekendDays);
    const wd = avg(weekdayDays);
    const diff = Math.abs(we - wd);
    if (diff >= 0.15) {
      const better = we > wd ? 'weekends' : 'weekdays';
      const worse = we > wd ? 'weekdays' : 'weekends';
      insights.push({
        text: `You're **${Math.round(diff * 100)}% more consistent on ${better}** than on ${worse}.`,
        score: diff * 80,
        kind: 'weekend',
      });
    }
  }

  // Most consistent habit (30d) — only if there's a clear leader
  const rates = active
    .map((h) => ({ h, rate: completionRate(h, completions, 30, weekStartsOn) }))
    .filter((x) => x.rate !== null);
  if (rates.length >= 2) {
    const sorted = [...rates].sort((a, b) => b.rate - a.rate);
    const top = sorted[0];
    const second = sorted[1];
    if (top.rate >= 0.8 && top.rate - second.rate >= 0.1) {
      insights.push({
        text: `**${top.h.name}** is your most consistent habit right now (${Math.round(top.rate * 100)}% in the last 30 days).`,
        score: top.rate * 50,
        kind: 'top-habit',
      });
    }
    const bottom = sorted[sorted.length - 1];
    if (bottom.rate < 0.5 && bottom.h !== top.h) {
      insights.push({
        text: `**${bottom.h.name}** needs some love — only ${Math.round(bottom.rate * 100)}% completion in the last 30 days.`,
        score: (0.7 - bottom.rate) * 40,
        kind: 'struggling',
      });
    }
  }

  // Current perfect-day streak
  const perfectStreak = currentPerfectStreak(active, completions);
  if (perfectStreak >= 3) {
    insights.push({
      text: `🔥 You're on a **${perfectStreak}-day perfect streak** — every scheduled habit done.`,
      score: Math.min(100, perfectStreak * 5 + 30),
      kind: 'streak',
    });
  }

  // Trend (30d vs prior 30d) — if it changed meaningfully
  const todayISO = today();
  const cur = periodCompletionRate(active, completions, toISODate(addDays(todayISO, -29)), todayISO, weekStartsOn);
  const prev = periodCompletionRate(active, completions, toISODate(addDays(todayISO, -59)), toISODate(addDays(todayISO, -30)), weekStartsOn);
  if (prev > 0) {
    const delta = cur - prev;
    if (Math.abs(delta) >= 0.1) {
      if (delta > 0) {
        insights.push({
          text: `📈 You're up **${Math.round(delta * 100)} points** vs the previous 30 days — keep going.`,
          score: delta * 60,
          kind: 'trend-up',
        });
      } else {
        insights.push({
          text: `📉 You're down **${Math.round(-delta * 100)} points** vs the previous 30 days — small reset, easy to recover.`,
          score: -delta * 60,
          kind: 'trend-down',
        });
      }
    }
  }

  // Upcoming streak milestone for the longest active habit streak
  const habitStreaks = active
    .map((h) => ({ h, s: currentStreak(h, completions, weekStartsOn) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (habitStreaks.length > 0) {
    const { h, s } = habitStreaks[0];
    const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
    const next = milestones.find((m) => m > s);
    if (next && next - s <= 5) {
      const unit = h.frequency?.type === 'times_per_week' ? 'weeks' : 'days';
      insights.push({
        text: `🎯 **${next - s} more ${unit}** to hit a ${next}-${unit.slice(0, -1)} streak on **${h.name}**.`,
        score: 70 - (next - s) * 5,
        kind: 'milestone',
      });
    }
  }

  return insights.sort((a, b) => b.score - a.score);
}
