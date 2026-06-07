<script>
  import { state } from '../lib/stores.js';
  import { today, toISODate, addDays, fromISODate, weekKey, shortWeekday } from '../lib/date.js';
  import { isScheduledOn, completionRate } from '../lib/habits.js';

  $: weekStartsOn = $state.settings.weekStartsOn;
  $: activeHabits = $state.habits.filter((h) => !h.archivedAt);
  $: completions = $state.completions;
  $: categories = $state.categories;

  // Overall completion rate over the last 30 days.
  $: overallRate30 = computeOverallRate(activeHabits, completions, 30);

  // Weekly check-in count for the last 12 weeks (count of all completions
  // across all active habits in that week).
  $: weeklyBars = buildWeeklyBars(activeHabits, completions, 12, weekStartsOn);

  // Best day of week — proportion of completions per weekday.
  $: bestDayOfWeek = computeBestDayOfWeek(activeHabits, completions);

  // Per-category rolling 30-day completion rate.
  $: categoryStats = computeCategoryStats(activeHabits, completions, categories);

  function computeOverallRate(habits, completions, days) {
    if (habits.length === 0) return 0;
    const end = today();
    let scheduled = 0;
    let done = 0;
    for (const h of habits) {
      const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
      const set = new Set(completions[h.id] ?? []);
      for (let i = 0; i < days; i++) {
        const d = toISODate(addDays(end, -i));
        if (created && d < created) continue;
        if (!isScheduledOn(h, d)) continue;
        scheduled++;
        if (set.has(d)) done++;
      }
    }
    return scheduled === 0 ? 0 : done / scheduled;
  }

  function buildWeeklyBars(habits, completions, weeks, weekStartsOn) {
    const todayISO = today();
    const result = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const ref = toISODate(addDays(todayISO, -w * 7));
      const wk = weekKey(ref, weekStartsOn);
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = toISODate(addDays(wk, i));
        if (d > todayISO) break;
        for (const h of habits) {
          if ((completions[h.id] ?? []).includes(d)) count++;
        }
      }
      const start = fromISODate(wk);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      result.push({ wk, count, label });
    }
    return result;
  }

  function computeBestDayOfWeek(habits, completions) {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const todayISO = today();
    // Look at the past 90 days
    for (const h of habits) {
      const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
      const set = new Set(completions[h.id] ?? []);
      for (let i = 0; i < 90; i++) {
        const d = toISODate(addDays(todayISO, -i));
        if (created && d < created) continue;
        if (!isScheduledOn(h, d)) continue;
        const dow = fromISODate(d).getDay();
        dayTotals[dow]++;
        if (set.has(d)) dayCounts[dow]++;
      }
    }
    let best = -1;
    let bestPct = -1;
    for (let i = 0; i < 7; i++) {
      if (dayTotals[i] === 0) continue;
      const pct = dayCounts[i] / dayTotals[i];
      if (pct > bestPct) {
        bestPct = pct;
        best = i;
      }
    }
    return best === -1
      ? null
      : { day: best, label: shortWeekday(best), pct: bestPct };
  }

  function computeCategoryStats(habits, completions, categories) {
    const map = new Map();
    for (const cat of categories) map.set(cat.id, { ...cat, habits: [] });
    map.set('__uncat', { id: '__uncat', name: 'Uncategorized', color: '#94a3b8', habits: [] });
    for (const h of habits) {
      const key = h.categoryId && map.has(h.categoryId) ? h.categoryId : '__uncat';
      map.get(key).habits.push(h);
    }
    return [...map.values()]
      .filter((g) => g.habits.length > 0)
      .map((g) => {
        let scheduled = 0,
          done = 0;
        const end = today();
        for (const h of g.habits) {
          const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
          const set = new Set(completions[h.id] ?? []);
          for (let i = 0; i < 30; i++) {
            const d = toISODate(addDays(end, -i));
            if (created && d < created) continue;
            if (!isScheduledOn(h, d)) continue;
            scheduled++;
            if (set.has(d)) done++;
          }
        }
        return {
          ...g,
          rate: scheduled === 0 ? 0 : done / scheduled,
          habitCount: g.habits.length,
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }

  $: maxWeeklyBar = Math.max(1, ...weeklyBars.map((b) => b.count));
</script>

<header class="header">
  <h1>Stats</h1>
  <p class="muted">How you've been doing</p>
</header>

{#if activeHabits.length === 0}
  <div class="empty card-surface">
    <p>Add some habits to see your stats here.</p>
    <a class="btn btn-primary" href="#/habits">Add a habit</a>
  </div>
{:else}
  <section class="grid">
    <div class="big card-surface">
      <span class="big-label">Last 30 days</span>
      <span class="big-value">{Math.round(overallRate30 * 100)}%</span>
      <span class="big-sub">overall completion</span>
    </div>
    {#if bestDayOfWeek}
      <div class="big card-surface">
        <span class="big-label">Best day</span>
        <span class="big-value">{bestDayOfWeek.label}</span>
        <span class="big-sub">{Math.round(bestDayOfWeek.pct * 100)}% completion (90d)</span>
      </div>
    {/if}
  </section>

  <section class="block">
    <h2 class="section-title">Check-ins per week — last 12 weeks</h2>
    <div class="bars card-surface">
      <div class="bars-row">
        {#each weeklyBars as b}
          <div class="bar-col" title={`${b.label}: ${b.count} check-ins`}>
            <div
              class="bar"
              style="height: {(b.count / maxWeeklyBar) * 100}%"
            ></div>
          </div>
        {/each}
      </div>
      <div class="bars-axis">
        {#each weeklyBars as b, i}
          <span class="bars-tick" class:hidden={i % 2 === 1}>{b.label}</span>
        {/each}
      </div>
    </div>
  </section>

  <section class="block">
    <h2 class="section-title">By category — last 30 days</h2>
    <div class="cats">
      {#each categoryStats as c (c.id)}
        <div class="cat card-surface" style="--cat-color: {c.color}">
          <div class="cat-row">
            <span class="cat-dot"></span>
            <span class="cat-name">{c.name}</span>
            <span class="cat-meta">{c.habitCount} {c.habitCount === 1 ? 'habit' : 'habits'}</span>
            <span class="cat-pct">{Math.round(c.rate * 100)}%</span>
          </div>
          <div class="cat-bar">
            <div class="cat-fill" style="width: {c.rate * 100}%"></div>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .header {
    padding: 24px 16px 12px;
  }

  .header h1 {
    font-size: 28px;
    letter-spacing: -0.02em;
  }

  .header p {
    margin: 4px 0 0;
  }

  .empty {
    margin: 16px;
    padding: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 0 16px 16px;
  }

  .big {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .big-label {
    font-size: 12px;
    color: var(--fg-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .big-value {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .big-sub {
    color: var(--fg-muted);
    font-size: 12px;
  }

  .block {
    padding: 0 16px 20px;
  }

  .section-title {
    font-size: 13px;
    text-transform: uppercase;
    color: var(--fg-muted);
    letter-spacing: 0.06em;
    font-weight: 600;
    margin: 0 0 8px 6px;
  }

  .bars {
    padding: 14px;
  }

  .bars-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 120px;
  }

  .bar-col {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }

  .bar {
    width: 100%;
    background: var(--accent);
    border-radius: 4px 4px 0 0;
    min-height: 2px;
  }

  .bars-axis {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }

  .bars-tick {
    flex: 1;
    text-align: center;
    font-size: 10px;
    color: var(--fg-muted);
  }

  .bars-tick.hidden {
    visibility: hidden;
  }

  .cats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cat {
    padding: 12px 14px;
  }

  .cat-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .cat-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--cat-color, var(--accent));
  }

  .cat-name {
    font-weight: 600;
    flex: 1;
  }

  .cat-meta {
    color: var(--fg-muted);
    font-size: 12px;
  }

  .cat-pct {
    font-weight: 700;
    margin-left: 8px;
  }

  .cat-bar {
    height: 6px;
    background: var(--bg-soft);
    border-radius: 999px;
    margin-top: 8px;
    overflow: hidden;
  }

  .cat-fill {
    height: 100%;
    background: var(--cat-color, var(--accent));
    border-radius: 999px;
    transition: width 0.3s ease;
  }
</style>
