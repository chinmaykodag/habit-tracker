<script>
  import { state } from '../lib/stores.js';
  import { newId } from '../lib/storage.js';
  import { frequencyLabel, currentStreak, habitColor } from '../lib/habits.js';
  import Modal from '../components/Modal.svelte';
  import HabitForm from '../components/HabitForm.svelte';

  let creating = false;

  $: weekStartsOn = $state.settings.weekStartsOn;
  $: categories = $state.categories;
  $: habitsByCategory = groupByCategory($state.habits, categories);

  function groupByCategory(habits, cats) {
    const buckets = new Map();
    const order = [];
    function ensure(key, label) {
      if (!buckets.has(key)) {
        buckets.set(key, { key, label, items: [] });
        order.push(key);
      }
      return buckets.get(key);
    }

    for (const cat of cats) {
      ensure(cat.id, cat.name);
    }

    for (const h of habits) {
      if (h.archivedAt) continue;
      if (h.categoryId && cats.some((c) => c.id === h.categoryId)) {
        ensure(h.categoryId).items.push(h);
      } else {
        ensure('__uncat', 'Uncategorized').items.push(h);
      }
    }

    return order
      .map((k) => buckets.get(k))
      .filter((b) => b.items.length > 0);
  }

  function createHabit(e) {
    const habit = {
      id: newId('h'),
      createdAt: new Date().toISOString(),
      archivedAt: null,
      ...e.detail,
    };
    state.update((s) => ({ ...s, habits: [...s.habits, habit] }));
    creating = false;
  }

  function addCategory(e) {
    const cat = e.detail;
    state.update((s) => {
      if (s.categories.some((c) => c.id === cat.id)) return s;
      return { ...s, categories: [...s.categories, cat] };
    });
  }
</script>

<header class="header">
  <h1>Habits</h1>
  <button class="add" on:click={() => (creating = true)} aria-label="Add habit">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  </button>
</header>

<section class="content">
  {#if habitsByCategory.length === 0}
    <div class="empty card-surface">
      <p>No habits yet. Tap + to add your first one.</p>
    </div>
  {:else}
    {#each habitsByCategory as bucket (bucket.key)}
      <div class="group">
        <h2 class="group-title">{bucket.label}</h2>
        <div class="list">
          {#each bucket.items as habit (habit.id)}
            {@const streak = currentStreak(habit, $state.completions, weekStartsOn)}
            <a class="row" href={`#/habits/${habit.id}`} style="--habit-accent: {habitColor(habit)}">
              <div class="swatch" aria-hidden="true">
                {#if habit.icon}<span>{habit.icon}</span>{/if}
              </div>
              <div class="text">
                <div class="name">{habit.name}</div>
                <div class="meta">{frequencyLabel(habit)}{streak > 0 ? ` · 🔥 ${streak}` : ''}</div>
              </div>
              <span class="chev" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </span>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</section>

<Modal title="New habit" open={creating} on:close={() => (creating = false)}>
  {#if creating}
    <HabitForm
      categories={$state.categories}
      on:save={createHabit}
      on:createCategory={addCategory}
    />
  {/if}
</Modal>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 16px 12px;
  }

  .header h1 {
    font-size: 28px;
    letter-spacing: -0.02em;
  }

  .add {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-fg);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: var(--shadow);
  }

  .content {
    padding: 4px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .empty {
    padding: 24px;
    text-align: center;
    color: var(--fg-muted);
  }

  .group-title {
    font-size: 13px;
    text-transform: uppercase;
    color: var(--fg-muted);
    letter-spacing: 0.06em;
    margin: 0 0 8px 6px;
    font-weight: 600;
  }

  .list {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    text-decoration: none;
    color: inherit;
    border-bottom: 1px solid var(--border);
  }

  .row:last-child {
    border-bottom: none;
  }

  .swatch {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--habit-accent, var(--accent)) 20%, transparent);
    color: var(--habit-accent, var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 1;
    flex-shrink: 0;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    color: var(--fg-muted);
    font-size: 12px;
    margin-top: 2px;
  }

  .chev {
    color: var(--fg-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>
