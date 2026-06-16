<script>
  import { state } from '../lib/stores.js';
  import {
    today,
    formatHumanDate,
    toISODate,
    fromISODate,
    addDays,
    diffDays,
  } from '../lib/date.js';
  import {
    isScheduledOn,
    isCompletedOn,
    currentStreak,
    toggleCompletion,
    weeklyTargetMet,
    weeklyCount,
    frequencyLabel,
  } from '../lib/habits.js';
  import HabitCard from '../components/HabitCard.svelte';

  $: todayISO = today();
  $: weekStartsOn = $state.settings.weekStartsOn;

  let selectedDate = today();

  // If the day rolls over while the app is open, keep the selection valid.
  $: if (selectedDate > todayISO) selectedDate = todayISO;

  $: isToday = selectedDate === todayISO;
  $: dayLabel = relativeDayLabel(selectedDate, todayISO);

  function relativeDayLabel(iso, todayIso) {
    const days = diffDays(todayIso, iso);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days > 1 && days < 7) {
      return fromISODate(iso).toLocaleDateString(undefined, { weekday: 'long' });
    }
    return fromISODate(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  function prevDay() {
    selectedDate = toISODate(addDays(selectedDate, -1));
  }

  function nextDay() {
    if (selectedDate < todayISO) {
      selectedDate = toISODate(addDays(selectedDate, 1));
    }
  }

  function jumpToToday() {
    selectedDate = todayISO;
  }

  function onDateChange(e) {
    const v = e.target.value;
    if (!v) return;
    selectedDate = v > todayISO ? todayISO : v;
  }

  // Habits to show on the selected date: must have existed on that date,
  // and (if archived) must have been archived strictly after that date.
  $: visibleHabits = $state.habits.filter((h) => {
    const created = h.createdAt ? h.createdAt.slice(0, 10) : null;
    if (created && selectedDate < created) return false;
    if (h.archivedAt) {
      const arch = h.archivedAt.slice(0, 10);
      if (selectedDate >= arch) return false;
    }
    return true;
  });

  $: scheduled = visibleHabits.filter((h) => {
    if (!isScheduledOn(h, selectedDate)) return false;
    // For today, hide "times per week" habits once the weekly target has
    // been met (the user is done for the week). For past dates we show
    // every scheduled habit so the user can log retroactively without
    // surprises.
    if (isToday && h.frequency?.type === 'times_per_week') {
      const met = weeklyTargetMet(h, $state.completions, selectedDate, weekStartsOn);
      const doneOnDate = isCompletedOn($state.completions, h.id, selectedDate);
      if (met && !doneOnDate) return false;
    }
    return true;
  });

  $: completedCount = scheduled.filter((h) =>
    isCompletedOn($state.completions, h.id, selectedDate)
  ).length;

  $: pct =
    scheduled.length === 0 ? 0 : Math.round((completedCount / scheduled.length) * 100);

  function onToggle(id) {
    state.update((s) => toggleCompletion(s, id, selectedDate));
  }

  function subtitleFor(habit) {
    if (habit.frequency?.type === 'times_per_week') {
      const c = weeklyCount(habit, $state.completions, selectedDate, weekStartsOn);
      const t = habit.frequency.timesPerWeek;
      return `${c}/${t} this week · ${frequencyLabel(habit)}`;
    }
    const streak = currentStreak(habit, $state.completions, weekStartsOn);
    if (streak > 0) return `🔥 ${streak} ${streak === 1 ? 'day' : 'days'}`;
    return frequencyLabel(habit);
  }
</script>

<header class="header">
  <div class="day-nav">
    <button
      class="nav-btn"
      on:click={prevDay}
      aria-label="Previous day"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <div class="date-pill-wrap">
      <span class="date-pill">{formatHumanDate(selectedDate)}</span>
      <input
        type="date"
        class="date-input-overlay"
        max={todayISO}
        value={selectedDate}
        on:change={onDateChange}
        aria-label="Pick a date"
      />
    </div>
    <button
      class="nav-btn"
      on:click={nextDay}
      disabled={isToday}
      aria-label="Next day"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  </div>

  <div class="title-row">
    <h1>{dayLabel}</h1>
    {#if !isToday}
      <button class="today-btn" on:click={jumpToToday}>Jump to today</button>
    {/if}
  </div>

  {#if !isToday}
    <p class="retro-hint">📝 Logging for a past day — your edits update history.</p>
  {/if}

  {#if scheduled.length > 0}
    <div class="progress">
      <div class="row">
        <span class="counter">{completedCount} <span class="of">/ {scheduled.length}</span></span>
        <span class="pct">{pct}%</span>
      </div>
      <div class="bar">
        <div class="fill" style="width: {pct}%"></div>
      </div>
    </div>
  {/if}
</header>

<section class="list">
  {#if $state.habits.length === 0}
    <div class="empty card-surface">
      <p>You haven't added any habits yet.</p>
      <a class="btn btn-primary" href="#/habits">Add your first habit</a>
    </div>
  {:else if visibleHabits.length === 0}
    <div class="empty card-surface">
      <p>No habits existed on this day yet.</p>
      <button class="btn btn-ghost" on:click={jumpToToday}>Jump to today</button>
    </div>
  {:else if scheduled.length === 0}
    <div class="empty card-surface">
      <p>
        {#if isToday}
          🎉 Nothing scheduled today — or you've already smashed it.
        {:else}
          Nothing was scheduled on this day.
        {/if}
      </p>
      <a class="btn btn-ghost" href="#/habits">View all habits</a>
    </div>
  {:else}
    {#each scheduled as habit (habit.id)}
      <HabitCard
        {habit}
        completed={isCompletedOn($state.completions, habit.id, selectedDate)}
        streak={currentStreak(habit, $state.completions, weekStartsOn)}
        subtitle={subtitleFor(habit)}
        on:toggle={() => onToggle(habit.id)}
      />
    {/each}
  {/if}
</section>

<style>
  .header {
    padding: 16px 16px;
  }

  .day-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--fg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
  }

  .date-pill-wrap {
    flex: 1;
    position: relative;
    display: flex;
    justify-content: center;
  }

  .date-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--bg-soft);
    color: var(--fg-muted);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    pointer-events: none;
    min-height: 36px;
  }

  /* Invisible native date input layered over the pill — keeps iOS's native
     wheel picker UX while letting us style the visible label freely. */
  .date-input-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: transparent;
    opacity: 0;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
  }

  .header h1 {
    margin: 0;
    font-size: 32px;
    letter-spacing: -0.02em;
  }

  .today-btn {
    background: transparent;
    border: none;
    color: var(--accent);
    font-weight: 600;
    font-size: 13px;
    padding: 6px 8px;
    border-radius: 8px;
  }

  .today-btn:active {
    background: var(--bg-soft);
  }

  .retro-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--fg-muted);
  }

  .progress {
    margin-top: 18px;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .counter {
    font-size: 24px;
    font-weight: 700;
  }

  .of {
    color: var(--fg-muted);
    font-size: 16px;
    font-weight: 500;
  }

  .pct {
    color: var(--fg-muted);
    font-size: 14px;
    font-weight: 600;
  }

  .bar {
    height: 8px;
    background: var(--bg-soft);
    border-radius: 999px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .list {
    padding: 0 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .empty {
    text-align: center;
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .empty p {
    margin: 0;
    color: var(--fg-muted);
  }
</style>
