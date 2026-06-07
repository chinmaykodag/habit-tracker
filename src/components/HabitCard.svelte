<script>
  import { createEventDispatcher } from 'svelte';
  import { habitColor } from '../lib/habits.js';
  export let habit;
  export let completed = false;
  export let streak = 0;
  export let subtitle = '';

  const dispatch = createEventDispatcher();

  function onCheck(e) {
    e.stopPropagation();
    e.preventDefault();
    dispatch('toggle');
  }
</script>

<div class="card" style="--habit-accent: {habitColor(habit)}">
  <a class="info" href={`#/habits/${habit.id}`}>
    <div class="swatch" aria-hidden="true">
      {#if habit.icon}<span>{habit.icon}</span>{/if}
    </div>
    <div class="text">
      <div class="name">{habit.name}</div>
      {#if subtitle}
        <div class="sub">{subtitle}</div>
      {:else if streak > 0}
        <div class="sub">🔥 {streak} {streak === 1 ? 'day' : 'days'}</div>
      {/if}
    </div>
  </a>
  <button
    class="check"
    class:done={completed}
    on:click={onCheck}
    aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
    aria-pressed={completed}
  >
    {#if completed}
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12l5 5L20 7"/>
      </svg>
    {/if}
  </button>
</div>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px 10px 10px;
    box-shadow: var(--shadow);
  }

  .info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    text-decoration: none;
    color: inherit;
  }

  .swatch {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--habit-accent) 18%, transparent);
    color: var(--habit-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-weight: 600;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub {
    font-size: 12px;
    color: var(--fg-muted);
    margin-top: 2px;
  }

  .check {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid var(--habit-accent);
    background: transparent;
    color: var(--habit-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.12s ease, background-color 0.12s ease;
  }

  .check.done {
    background: var(--habit-accent);
    color: #fff;
  }

  .check:active {
    transform: scale(0.92);
  }
</style>
