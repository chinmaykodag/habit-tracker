<script>
  import { state } from '../lib/stores.js';
  import { today, formatHumanDate } from '../lib/date.js';
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

  $: activeHabits = $state.habits.filter((h) => !h.archivedAt);

  $: scheduled = activeHabits.filter((h) => {
    if (!isScheduledOn(h, todayISO)) return false;
    // hide "times per week" habits once weekly target has been met
    // (they reappear when the streak resets next week)
    if (h.frequency?.type === 'times_per_week') {
      const met = weeklyTargetMet(h, $state.completions, todayISO, weekStartsOn);
      const doneToday = isCompletedOn($state.completions, h.id, todayISO);
      if (met && !doneToday) return false;
    }
    return true;
  });

  $: completedCount = scheduled.filter((h) =>
    isCompletedOn($state.completions, h.id, todayISO)
  ).length;

  $: pct =
    scheduled.length === 0 ? 0 : Math.round((completedCount / scheduled.length) * 100);

  function onToggle(id) {
    state.update((s) => toggleCompletion(s, id, todayISO));
  }

  function subtitleFor(habit) {
    if (habit.frequency?.type === 'times_per_week') {
      const c = weeklyCount(habit, $state.completions, todayISO, weekStartsOn);
      const t = habit.frequency.timesPerWeek;
      return `${c}/${t} this week · ${frequencyLabel(habit)}`;
    }
    const streak = currentStreak(habit, $state.completions, weekStartsOn);
    if (streak > 0) return `🔥 ${streak} ${streak === 1 ? 'day' : 'days'}`;
    return frequencyLabel(habit);
  }
</script>

<header class="header">
  <p class="eyebrow">{formatHumanDate(todayISO)}</p>
  <h1>Today</h1>
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
  {#if activeHabits.length === 0}
    <div class="empty card-surface">
      <p>You haven't added any habits yet.</p>
      <a class="btn btn-primary" href="#/habits">Add your first habit</a>
    </div>
  {:else if scheduled.length === 0}
    <div class="empty card-surface">
      <p>🎉 Nothing scheduled today — or you've already smashed it.</p>
      <a class="btn btn-ghost" href="#/habits">View all habits</a>
    </div>
  {:else}
    {#each scheduled as habit (habit.id)}
      <HabitCard
        {habit}
        completed={isCompletedOn($state.completions, habit.id, todayISO)}
        streak={currentStreak(habit, $state.completions, weekStartsOn)}
        subtitle={subtitleFor(habit)}
        on:toggle={() => onToggle(habit.id)}
      />
    {/each}
  {/if}
</section>

<style>
  .header {
    padding: 24px 16px 16px;
  }

  .eyebrow {
    margin: 0 0 4px;
    color: var(--fg-muted);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }

  .header h1 {
    margin: 0;
    font-size: 32px;
    letter-spacing: -0.02em;
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
