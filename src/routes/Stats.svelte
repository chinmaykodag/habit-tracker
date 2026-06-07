<script>
  import { state } from '../lib/stores.js';
  import { today, toISODate, addDays, fromISODate, weekKey } from '../lib/date.js';
  import {
    isScheduledOn,
    periodCompletionRate,
    weekdayBreakdown,
    dailyAggregate,
    currentPerfectStreak,
    perfectDaysInRange,
    personalRecords,
    completionRate,
    currentStreak,
    generateInsights,
    weeklyTargetMet,
    weeklyCount,
    frequencyLabel,
  } from '../lib/habits.js';

  $: weekStartsOn = $state.settings.weekStartsOn;
  $: activeHabits = $state.habits.filter((h) => !h.archivedAt);
  $: completions = $state.completions;
  $: categories = $state.categories;

  $: todayISO = today();

  // ── Hero row ────────────────────────────────────────────────────────────
  $: rate30 = periodCompletionRate(
    activeHabits,
    completions,
    toISODate(addDays(todayISO, -29)),
    todayISO,
    weekStartsOn
  );
  $: ratePrev30 = periodCompletionRate(
    activeHabits,
    completions,
    toISODate(addDays(todayISO, -59)),
    toISODate(addDays(todayISO, -30)),
    weekStartsOn
  );
  $: trend30 = ratePrev30 === 0 && rate30 === 0 ? null : Math.round((rate30 - ratePrev30) * 100);

  // ── Perfect days ────────────────────────────────────────────────────────
  $: monthStart = todayISO.slice(0, 7) + '-01';
  $: perfectThisMonth = perfectDaysInRange(activeHabits, completions, monthStart, todayISO);
  $: perfectStreak = currentPerfectStreak(activeHabits, completions);

  // ── Smart insights ──────────────────────────────────────────────────────
  $: insights = generateInsights(activeHabits, completions, weekStartsOn).slice(0, 3);

  // ── Annual heatmap ──────────────────────────────────────────────────────
  $: annualGrid = buildAnnualGrid(activeHabits, completions, weekStartsOn);

  function buildAnnualGrid(habits, completions, weekStartsOn) {
    const weeks = 52;
    const todayISO = today();
    const startWeek = weekKey(toISODate(addDays(todayISO, -7 * (weeks - 1))), weekStartsOn);
    const cols = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = toISODate(addDays(startWeek, w * 7 + d));
        const future = date > todayISO;
        if (future) {
          col.push({ date, level: -1, scheduled: 0, done: 0, future: true });
        } else {
          const agg = dailyAggregate(habits, completions, date);
          col.push({ date, ...agg, future: false });
        }
      }
      cols.push(col);
    }
    return cols;
  }

  function annualMonthLabels(grid) {
    const out = [];
    let lastMonth = -1;
    grid.forEach((col, i) => {
      const m = fromISODate(col[0].date).getMonth();
      if (m !== lastMonth) {
        out.push({ col: i, label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] });
        lastMonth = m;
      }
    });
    return out;
  }

  $: annualMonths = annualMonthLabels(annualGrid);

  function annualTooltip(cell) {
    const date = fromISODate(cell.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (cell.future) return `${date} — upcoming`;
    if (cell.scheduled === 0) return `${date} — nothing scheduled`;
    return `${date} — ${cell.done}/${cell.scheduled} done`;
  }

  // ── Weekly check-ins chart (existing) ───────────────────────────────────
  $: weeklyBars = buildWeeklyBars(activeHabits, completions, 12, weekStartsOn);

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

  $: maxWeeklyBar = Math.max(1, ...weeklyBars.map((b) => b.count));

  // ── Day-of-week breakdown ───────────────────────────────────────────────
  $: dow = weekdayBreakdown(activeHabits, completions, 90);
  $: dowOrdered = orderDow(dow, weekStartsOn);
  $: dowMax = Math.max(0.0001, ...dow.map((d) => d.rate ?? 0));
  $: bestDay = bestDow(dow);

  function orderDow(arr, weekStartsOn) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      out.push(arr[(weekStartsOn + i) % 7]);
    }
    return out;
  }

  function bestDow(arr) {
    let best = null;
    for (const d of arr) {
      if (d.rate === null) continue;
      if (!best || d.rate > best.rate) best = d;
    }
    return best;
  }

  $: annualDowLabels = weekStartsOn === 1
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const dowShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // ── Leaderboard ─────────────────────────────────────────────────────────
  $: ranked = activeHabits
    .map((h) => ({ h, rate: completionRate(h, completions, 30, weekStartsOn), spark: sparklineFor(h) }))
    .sort((a, b) => b.rate - a.rate);
  $: topThree = ranked.slice(0, 3);
  // Only flag habits truly needing attention (<70%). Cap at 3.
  $: needsAttention = ranked
    .filter((r) => r.rate < 0.7)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);

  function sparklineFor(habit) {
    const todayISO = today();
    const out = [];
    for (let w = 3; w >= 0; w--) {
      const ref = toISODate(addDays(todayISO, -w * 7));
      const wk = weekKey(ref, weekStartsOn);
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = toISODate(addDays(wk, i));
        if (d > todayISO) break;
        if ((completions[habit.id] ?? []).includes(d)) count++;
      }
      out.push(count);
    }
    return out;
  }

  // ── Personal records ────────────────────────────────────────────────────
  $: records = personalRecords(activeHabits, completions, weekStartsOn);

  // ── By category (existing) ──────────────────────────────────────────────
  $: categoryStats = computeCategoryStats(activeHabits, completions, categories);

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
      .map((g) => ({
        ...g,
        rate: periodCompletionRate(
          g.habits,
          completions,
          toISODate(addDays(todayISO, -29)),
          todayISO,
          weekStartsOn
        ),
        habitCount: g.habits.length,
      }))
      .sort((a, b) => b.rate - a.rate);
  }

  function pct(v) {
    return `${Math.round(v * 100)}%`;
  }

  function fmtRelative(iso) {
    if (!iso) return '—';
    const d = fromISODate(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Renders insight text with **bold** markdown converted to <strong>.
  function renderInsight(text) {
    return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
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
  <!-- Hero row: 30d rate with trend + perfect days -->
  <section class="hero">
    <div class="big card-surface">
      <span class="big-label">Last 30 days</span>
      <span class="big-value">{pct(rate30)}</span>
      <span class="big-sub">
        overall completion
        {#if trend30 !== null && trend30 !== 0}
          <span class="trend" class:up={trend30 > 0} class:down={trend30 < 0}>
            {trend30 > 0 ? '▲' : '▼'} {Math.abs(trend30)} pts
          </span>
        {/if}
      </span>
    </div>
    <div class="big card-surface">
      <span class="big-label">Perfect days</span>
      <span class="big-value">{perfectThisMonth}</span>
      <span class="big-sub">
        this month
        {#if perfectStreak > 0}
          <span class="trend up">🔥 {perfectStreak}-day streak</span>
        {/if}
      </span>
    </div>
  </section>

  <!-- Smart insights -->
  {#if insights.length > 0}
    <section class="block">
      <h2 class="section-title">Insights</h2>
      <div class="insights">
        {#each insights as i}
          <div class="insight card-surface">
            <span class="insight-icon" aria-hidden="true">💡</span>
            <p>{@html renderInsight(i.text)}</p>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Annual heatmap -->
  <section class="block">
    <h2 class="section-title">Year at a glance</h2>
    <div class="card-surface annual-card">
      <div class="annual-scroll">
        <div class="annual-months">
          {#each annualMonths as m (m.col + m.label)}
            <span class="annual-month" style="grid-column: {m.col + 2} / span 1">{m.label}</span>
          {/each}
        </div>
        <div class="annual-body">
          <div class="annual-day-labels">
            {#each annualDowLabels as l, i}
              <span class:hidden={i % 2 === 0}>{l}</span>
            {/each}
          </div>
          <div class="annual-grid" style="grid-template-columns: repeat({annualGrid.length}, 11px)">
            {#each annualGrid as col, ci}
              <div class="annual-col">
                {#each col as cell}
                  <div
                    class="annual-cell level-{cell.future ? 'future' : cell.level}"
                    title={annualTooltip(cell)}
                    aria-label={annualTooltip(cell)}
                  ></div>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
      <div class="annual-legend">
        <span>Less</span>
        <div class="annual-cell level-0"></div>
        <div class="annual-cell level-1"></div>
        <div class="annual-cell level-2"></div>
        <div class="annual-cell level-3"></div>
        <div class="annual-cell level-4"></div>
        <span>More</span>
      </div>
    </div>
  </section>

  <!-- Weekly check-ins chart -->
  <section class="block">
    <h2 class="section-title">Check-ins per week — last 12 weeks</h2>
    <div class="bars card-surface">
      <div class="bars-row">
        {#each weeklyBars as b}
          <div class="bar-col" title={`${b.label}: ${b.count} check-ins`}>
            <div class="bar" style="height: {(b.count / maxWeeklyBar) * 100}%"></div>
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

  <!-- Day of week breakdown -->
  <section class="block">
    <h2 class="section-title">By day of week — last 90 days</h2>
    <div class="card-surface dow-card">
      <div class="dow-row">
        {#each dowOrdered as d}
          <div class="dow-col" title={d.rate === null ? `${dowShort[d.day]} — no data` : `${dowShort[d.day]} — ${pct(d.rate)}`}>
            <div class="dow-bar-wrap">
              {#if d.rate !== null}
                <div
                  class="dow-bar"
                  class:best={bestDay && d.day === bestDay.day}
                  style="height: {(d.rate / dowMax) * 100}%"
                ></div>
              {/if}
            </div>
            <span class="dow-label">{dowShort[d.day]}</span>
            <span class="dow-pct">{d.rate === null ? '—' : pct(d.rate)}</span>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Leaderboard -->
  <section class="block">
    <h2 class="section-title">Top habits — last 30 days</h2>
    <div class="lb card-surface">
      {#each topThree as r, i (r.h.id)}
        <div class="lb-row" style="--lb-accent: {r.h.color}">
          <span class="lb-rank">{i + 1}</span>
          <div class="lb-text">
            <a class="lb-name" href={`#/habits/${r.h.id}`}>
              {r.h.icon ? r.h.icon + ' ' : ''}{r.h.name}
            </a>
            <div class="lb-meta">{frequencyLabel(r.h)}</div>
          </div>
          <div class="lb-spark" aria-hidden="true">
            {#each r.spark as v, j}
              <span class="lb-spark-bar" style="height: {Math.max(8, (v / 7) * 100)}%; background: {r.h.color}"></span>
            {/each}
          </div>
          <span class="lb-rate">{pct(r.rate)}</span>
        </div>
      {/each}
    </div>

    {#if needsAttention.length > 0}
      <h2 class="section-title needs">Needs attention</h2>
      <div class="lb card-surface lb-needs">
        {#each needsAttention as r (r.h.id)}
          <div class="lb-row" style="--lb-accent: {r.h.color}">
            <span class="lb-warn" aria-hidden="true">⚠</span>
            <div class="lb-text">
              <a class="lb-name" href={`#/habits/${r.h.id}`}>
                {r.h.icon ? r.h.icon + ' ' : ''}{r.h.name}
              </a>
              <div class="lb-meta">{frequencyLabel(r.h)}</div>
            </div>
            <div class="lb-spark" aria-hidden="true">
              {#each r.spark as v}
                <span class="lb-spark-bar" style="height: {Math.max(8, (v / 7) * 100)}%; background: {r.h.color}"></span>
              {/each}
            </div>
            <span class="lb-rate">{pct(r.rate)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Personal records -->
  <section class="block">
    <h2 class="section-title">Records</h2>
    <div class="records card-surface">
      <div class="record">
        <span class="record-label">Longest perfect-day streak</span>
        <span class="record-value">{records.longestPerfectStreak} <small>days</small></span>
      </div>
      <div class="record">
        <span class="record-label">Most check-ins in a day</span>
        <span class="record-value">{records.mostCheckinsInDay.count}</span>
        {#if records.mostCheckinsInDay.date}
          <span class="record-sub">{fmtRelative(records.mostCheckinsInDay.date)}</span>
        {/if}
      </div>
      <div class="record">
        <span class="record-label">Most check-ins in a week</span>
        <span class="record-value">{records.mostCheckinsInWeek.count}</span>
        {#if records.mostCheckinsInWeek.wk}
          <span class="record-sub">week of {fmtRelative(records.mostCheckinsInWeek.wk)}</span>
        {/if}
      </div>
      {#if records.longestHabitStreak.habit}
        <div class="record">
          <span class="record-label">Longest single-habit streak</span>
          <span class="record-value">{records.longestHabitStreak.length}</span>
          <span class="record-sub">{records.longestHabitStreak.habit.name}</span>
        </div>
      {/if}
      <div class="record">
        <span class="record-label">Year to date</span>
        <span class="record-value">{records.ytdTotal}</span>
        <span class="record-sub">check-ins in {todayISO.slice(0, 4)}</span>
      </div>
    </div>
  </section>

  <!-- By category -->
  <section class="block">
    <h2 class="section-title">By category — last 30 days</h2>
    <div class="cats">
      {#each categoryStats as c (c.id)}
        <div class="cat card-surface" style="--cat-color: {c.color}">
          <div class="cat-row">
            <span class="cat-dot"></span>
            <span class="cat-name">{c.name}</span>
            <span class="cat-meta">{c.habitCount} {c.habitCount === 1 ? 'habit' : 'habits'}</span>
            <span class="cat-pct">{pct(c.rate)}</span>
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

  /* Hero */
  .hero {
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .trend {
    font-weight: 700;
    font-size: 12px;
  }

  .trend.up {
    color: var(--success);
  }

  .trend.down {
    color: var(--danger);
  }

  /* Common */
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

  .section-title.needs {
    margin-top: 14px;
  }

  /* Insights */
  .insights {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .insight {
    padding: 12px 14px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .insight p {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
  }

  .insight-icon {
    font-size: 18px;
    line-height: 1.2;
  }

  /* Annual heatmap */
  .annual-card {
    padding: 14px;
    overflow: hidden;
  }

  .annual-scroll {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .annual-months {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 11px;
    column-gap: 2px;
    font-size: 10px;
    color: var(--fg-muted);
    padding-left: 18px;
    height: 12px;
  }

  .annual-month {
    grid-row: 1;
    white-space: nowrap;
  }

  .annual-body {
    display: flex;
    align-items: flex-start;
  }

  .annual-day-labels {
    display: grid;
    grid-template-rows: repeat(7, 11px);
    row-gap: 2px;
    font-size: 9px;
    color: var(--fg-muted);
    padding-right: 4px;
    width: 14px;
  }

  .annual-day-labels span.hidden {
    visibility: hidden;
  }

  .annual-grid {
    display: grid;
    grid-auto-flow: column;
    column-gap: 2px;
  }

  .annual-col {
    display: grid;
    grid-template-rows: repeat(7, 11px);
    row-gap: 2px;
  }

  .annual-cell {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    background: var(--heat-0);
  }

  .annual-cell.level-0 {
    background: var(--heat-0);
  }

  .annual-cell.level-1 {
    background: var(--heat-1);
  }

  .annual-cell.level-2 {
    background: var(--heat-2);
  }

  .annual-cell.level-3 {
    background: var(--heat-3);
  }

  .annual-cell.level-4 {
    background: var(--heat-4);
  }

  .annual-cell.level-future {
    background: transparent;
    border: 1px dashed var(--border);
  }

  .annual-legend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--fg-muted);
    margin-top: 8px;
    margin-left: 18px;
  }

  .annual-legend .annual-cell {
    width: 10px;
    height: 10px;
  }

  /* Weekly bars */
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

  /* Day-of-week breakdown */
  .dow-card {
    padding: 14px;
  }

  .dow-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    align-items: end;
  }

  .dow-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .dow-bar-wrap {
    width: 100%;
    height: 100px;
    display: flex;
    align-items: flex-end;
    background: var(--bg-soft);
    border-radius: 6px 6px 0 0;
    overflow: hidden;
  }

  .dow-bar {
    width: 100%;
    background: color-mix(in srgb, var(--accent) 60%, transparent);
    border-radius: 6px 6px 0 0;
    min-height: 2px;
  }

  .dow-bar.best {
    background: var(--accent);
  }

  .dow-label {
    font-size: 11px;
    color: var(--fg-muted);
    font-weight: 600;
  }

  .dow-pct {
    font-size: 11px;
    font-weight: 700;
  }

  /* Leaderboard */
  .lb {
    overflow: hidden;
  }

  .lb-row {
    display: grid;
    grid-template-columns: 28px 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }

  .lb-row:last-child {
    border-bottom: none;
  }

  .lb-rank {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--bg-soft);
    color: var(--fg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .lb-warn {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--warning);
    font-size: 14px;
  }

  .lb-text {
    min-width: 0;
  }

  .lb-name {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: var(--fg);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lb-meta {
    color: var(--fg-muted);
    font-size: 11px;
    margin-top: 1px;
  }

  .lb-spark {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 22px;
    width: 36px;
  }

  .lb-spark-bar {
    flex: 1;
    border-radius: 1px;
    min-height: 2px;
    opacity: 0.75;
  }

  .lb-rate {
    font-weight: 700;
    font-size: 14px;
    min-width: 40px;
    text-align: right;
  }

  /* Records */
  .records {
    padding: 4px 0;
  }

  .record {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: baseline;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .record:last-child {
    border-bottom: none;
  }

  .record-label {
    color: var(--fg-muted);
    font-size: 13px;
    font-weight: 500;
  }

  .record-value {
    font-weight: 700;
    font-size: 18px;
  }

  .record-value small {
    font-size: 12px;
    color: var(--fg-muted);
    font-weight: 500;
    margin-left: 2px;
  }

  .record-sub {
    color: var(--fg-muted);
    font-size: 11px;
    grid-column: 1 / -1;
    margin-top: -4px;
    text-align: right;
  }

  /* Categories */
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
