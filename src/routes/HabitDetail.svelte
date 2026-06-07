<script>
  import { state, navigate } from '../lib/stores.js';
  import { today, toISODate, addDays } from '../lib/date.js';
  import {
    currentStreak,
    longestStreak,
    completionRate,
    totalCompletions,
    isCompletedOn,
    toggleCompletion,
    frequencyLabel,
    weeklyCount,
    weeklyTargetMet,
  } from '../lib/habits.js';
  import Heatmap from '../components/Heatmap.svelte';
  import Modal from '../components/Modal.svelte';
  import HabitForm from '../components/HabitForm.svelte';

  export let id;

  let editing = false;

  $: habit = $state.habits.find((h) => h.id === id);
  $: weekStartsOn = $state.settings.weekStartsOn;
  $: category = habit?.categoryId
    ? $state.categories.find((c) => c.id === habit.categoryId)
    : null;
  $: streak = habit ? currentStreak(habit, $state.completions, weekStartsOn) : 0;
  $: longest = habit ? longestStreak(habit, $state.completions, weekStartsOn) : 0;
  $: total = habit ? totalCompletions(habit, $state.completions) : 0;
  $: rate = habit ? completionRate(habit, $state.completions, 30) : 0;
  $: completionsList = habit ? ($state.completions[habit.id] ?? []) : [];
  $: todayISO = today();
  $: doneToday = habit && isCompletedOn($state.completions, habit.id, todayISO);
  $: weekly =
    habit?.frequency?.type === 'times_per_week'
      ? {
          count: weeklyCount(habit, $state.completions, todayISO, weekStartsOn),
          target: habit.frequency.timesPerWeek,
          met: weeklyTargetMet(habit, $state.completions, todayISO, weekStartsOn),
        }
      : null;

  $: lastSeven = buildLastSeven($state.completions, habit);

  function buildLastSeven(completions, h) {
    if (!h) return [];
    const set = new Set(completions[h.id] ?? []);
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = toISODate(addDays(todayISO, -i));
      out.push({
        date: d,
        done: set.has(d),
        label: new Date(d).toLocaleDateString(undefined, { weekday: 'short' })[0],
      });
    }
    return out;
  }

  function toggleToday() {
    state.update((s) => toggleCompletion(s, habit.id, todayISO));
  }

  function saveEdit(e) {
    const patch = e.detail;
    state.update((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === habit.id ? { ...h, ...patch } : h)),
    }));
    editing = false;
  }

  function addCategory(e) {
    const cat = e.detail;
    state.update((s) => {
      if (s.categories.some((c) => c.id === cat.id)) return s;
      return { ...s, categories: [...s.categories, cat] };
    });
  }

  function deleteHabit() {
    if (!confirm(`Delete "${habit.name}"? This will also erase its history.`)) return;
    const id = habit.id;
    state.update((s) => {
      const completions = { ...s.completions };
      delete completions[id];
      return {
        ...s,
        habits: s.habits.filter((h) => h.id !== id),
        completions,
      };
    });
    navigate('/habits');
  }

  function pctFmt(v) {
    return `${Math.round(v * 100)}%`;
  }
</script>

{#if !habit}
  <div class="missing">
    <p>Habit not found.</p>
    <a class="btn" href="#/habits">Back to habits</a>
  </div>
{:else}
  <header class="header" style="--habit-accent: {habit.color}">
    <a class="back" href="#/habits" aria-label="Back">‹</a>
    <button class="edit btn btn-ghost" on:click={() => (editing = true)}>Edit</button>
  </header>

  <div class="title" style="--habit-accent: {habit.color}">
    <div class="swatch">
      {#if habit.icon}<span>{habit.icon}</span>{/if}
    </div>
    <h1>{habit.name}</h1>
    <p class="meta">
      {frequencyLabel(habit)}{category ? ` · ${category.name}` : ''}
    </p>
    <button
      class="check"
      class:done={doneToday}
      on:click={toggleToday}
      aria-label={doneToday ? "Undo today's check-in" : "Mark today complete"}
    >
      {#if doneToday}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
        Done today
      {:else}
        Mark today complete
      {/if}
    </button>
  </div>

  {#if weekly}
    <div class="weekly card-surface">
      <div class="weekly-text">
        <span class="weekly-label">This week</span>
        <span class="weekly-value">{weekly.count} / {weekly.target}</span>
      </div>
      <div class="bar">
        <div class="fill" style="width: {Math.min(100, (weekly.count / weekly.target) * 100)}%; background: {habit.color}"></div>
      </div>
      {#if weekly.met}
        <span class="weekly-met">🎉 Target met</span>
      {/if}
    </div>
  {/if}

  <div class="stats">
    <div class="stat card-surface">
      <span class="stat-label">Current</span>
      <span class="stat-value">{streak}</span>
      <span class="stat-unit">{streak === 1 ? (weekly ? 'week' : 'day') : (weekly ? 'weeks' : 'days')}</span>
    </div>
    <div class="stat card-surface">
      <span class="stat-label">Longest</span>
      <span class="stat-value">{longest}</span>
      <span class="stat-unit">{longest === 1 ? (weekly ? 'week' : 'day') : (weekly ? 'weeks' : 'days')}</span>
    </div>
    <div class="stat card-surface">
      <span class="stat-label">30-day rate</span>
      <span class="stat-value">{pctFmt(rate)}</span>
      <span class="stat-unit">completion</span>
    </div>
    <div class="stat card-surface">
      <span class="stat-label">Total</span>
      <span class="stat-value">{total}</span>
      <span class="stat-unit">check-ins</span>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Last 7 days</h2>
    <div class="seven">
      {#each lastSeven as d}
        <div class="seven-day" style="--habit-accent: {habit.color}">
          <span class="seven-label">{d.label}</span>
          <span class="seven-dot" class:done={d.done}></span>
        </div>
      {/each}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Last 6 months</h2>
    <div class="card-surface heatmap-card">
      <Heatmap
        habit={habit}
        completions={completionsList}
        weekStartsOn={weekStartsOn}
      />
    </div>
  </div>
{/if}

<Modal title="Edit habit" open={editing} on:close={() => (editing = false)}>
  {#if editing && habit}
    <HabitForm
      habit={habit}
      categories={$state.categories}
      on:save={saveEdit}
      on:createCategory={addCategory}
      on:delete={deleteHabit}
    />
  {/if}
</Modal>

<style>
  .missing {
    padding: 32px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 8px 0;
  }

  .back {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    line-height: 1;
    text-decoration: none;
    color: var(--fg);
    font-weight: 300;
  }

  .edit {
    min-height: 36px;
    padding: 6px 12px;
  }

  .title {
    padding: 8px 20px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .swatch {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: color-mix(in srgb, var(--habit-accent) 18%, transparent);
    color: var(--habit-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    line-height: 1;
  }

  .title h1 {
    font-size: 24px;
    margin: 4px 0 0;
  }

  .meta {
    margin: 0;
    color: var(--fg-muted);
    font-size: 13px;
  }

  .check {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 22px;
    border-radius: 999px;
    border: 2px solid var(--habit-accent);
    background: transparent;
    color: var(--habit-accent);
    font-weight: 700;
    font-size: 15px;
  }

  .check.done {
    background: var(--habit-accent);
    color: #fff;
  }

  .weekly {
    margin: 0 16px 16px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .weekly-text {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .weekly-label {
    color: var(--fg-muted);
    font-size: 13px;
    font-weight: 600;
  }

  .weekly-value {
    font-weight: 700;
    font-size: 18px;
  }

  .bar {
    height: 8px;
    background: var(--bg-soft);
    border-radius: 999px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .weekly-met {
    color: var(--success);
    font-weight: 600;
    font-size: 13px;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 0 16px 16px;
  }

  .stat {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-label {
    color: var(--fg-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .stat-unit {
    color: var(--fg-muted);
    font-size: 12px;
  }

  .section {
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

  .seven {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .seven-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
  }

  .seven-label {
    font-size: 11px;
    color: var(--fg-muted);
    font-weight: 600;
  }

  .seven-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--bg-soft);
    border: 1px solid var(--border);
  }

  .seven-dot.done {
    background: var(--habit-accent);
    border-color: transparent;
  }

  .heatmap-card {
    padding: 14px;
    overflow: hidden;
  }
</style>
