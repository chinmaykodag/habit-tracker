<script>
  import { onMount, tick } from 'svelte';
  import { today, toISODate, addDays, fromISODate, weekKey } from '../lib/date.js';
  import { isScheduledOn } from '../lib/habits.js';

  export let habit;
  export let completions = [];
  export let weeks = 26;
  export let weekStartsOn = 1;

  let scroller;

  $: dayLabels = weekStartsOn === 1
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  $: completionSet = new Set(completions);
  $: grid = buildGrid(weeks, completionSet, habit, weekStartsOn);
  $: monthLabels = buildMonthLabels(grid);

  onMount(async () => {
    await tick();
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  });

  function buildGrid(weeks, set, habit, weekStartsOn) {
    const todayISO = today();
    const startWeek = weekKey(toISODate(addDays(todayISO, -7 * (weeks - 1))), weekStartsOn);
    const cols = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = toISODate(addDays(startWeek, w * 7 + d));
        const inFuture = date > todayISO;
        const completed = set.has(date);
        const scheduled = !inFuture && isScheduledOn(habit, date);
        col.push({ date, completed, scheduled, inFuture });
      }
      cols.push(col);
    }
    return cols;
  }

  function buildMonthLabels(grid) {
    const out = [];
    let lastMonth = -1;
    grid.forEach((col, i) => {
      const m = fromISODate(col[0].date).getMonth();
      if (m !== lastMonth) {
        out.push({ col: i, label: monthName(m) });
        lastMonth = m;
      }
    });
    return out;
  }

  function monthName(m) {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
  }

  function levelFor(cell) {
    if (cell.inFuture) return 'future';
    if (cell.completed) return 'done';
    if (cell.scheduled) return 'missed';
    return 'rest';
  }

  function tooltip(cell) {
    const date = fromISODate(cell.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (cell.inFuture) return `${date} — upcoming`;
    if (cell.completed) return `${date} — done ✓`;
    if (cell.scheduled) return `${date} — missed`;
    return `${date} — not scheduled`;
  }
</script>

<div class="heatmap" style="--habit-accent: {habit.color || 'var(--accent)'}" bind:this={scroller}>
  <div class="months">
    {#each monthLabels as m (m.col + m.label)}
      <span class="month" style="grid-column: {m.col + 2} / span 1">{m.label}</span>
    {/each}
  </div>
  <div class="body">
    <div class="day-labels">
      {#each dayLabels as l, i}
        <span class:hidden={i % 2 === 1}>{l}</span>
      {/each}
    </div>
    <div class="grid" style="grid-template-columns: repeat({weeks}, 12px)">
      {#each grid as col}
        <div class="col">
          {#each col as cell}
            <div
              class="cell {levelFor(cell)}"
              title={tooltip(cell)}
              aria-label={tooltip(cell)}
            ></div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  <div class="legend">
    <span>Less</span>
    <div class="cell rest"></div>
    <div class="cell missed"></div>
    <div class="cell done partial"></div>
    <div class="cell done"></div>
    <span>More</span>
  </div>
</div>

<style>
  .heatmap {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .months {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 12px;
    column-gap: 3px;
    font-size: 10px;
    color: var(--fg-muted);
    padding-left: 18px;
    height: 12px;
  }

  .month {
    grid-row: 1;
    white-space: nowrap;
  }

  .body {
    display: flex;
    align-items: flex-start;
  }

  .day-labels {
    display: grid;
    grid-template-rows: repeat(7, 12px);
    row-gap: 3px;
    font-size: 9px;
    color: var(--fg-muted);
    padding-right: 4px;
    width: 14px;
  }

  .day-labels span.hidden {
    visibility: hidden;
  }

  .grid {
    display: grid;
    grid-auto-flow: column;
    column-gap: 3px;
  }

  .col {
    display: grid;
    grid-template-rows: repeat(7, 12px);
    row-gap: 3px;
  }

  .cell {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--heat-0);
  }

  .cell.rest {
    background: var(--heat-0);
    opacity: 0.5;
  }

  .cell.missed {
    background: var(--heat-0);
  }

  .cell.done {
    background: var(--habit-accent);
  }

  .cell.done.partial {
    background: color-mix(in srgb, var(--habit-accent) 60%, transparent);
  }

  .cell.future {
    background: transparent;
    border: 1px dashed var(--border);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--fg-muted);
    margin-top: 4px;
    margin-left: 18px;
  }

  .legend .cell {
    width: 10px;
    height: 10px;
  }
</style>
