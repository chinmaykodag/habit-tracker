<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import CategoryPicker from './CategoryPicker.svelte';

  export let habit = null; // null = create, object = edit
  export let categories = [];

  const dispatch = createEventDispatcher();

  const palette = [
    '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
    '#10b981', '#84cc16', '#f59e0b', '#f97316',
    '#ef4444', '#ec4899', '#a855f7', '#64748b',
  ];

  const suggestedEmojis = [
    '💧', '🏃', '🧘', '📚', '💪', '🍎',
    '🥗', '😴', '✍️', '🎨', '🎸', '🧠',
    '🚶', '🪥', '☕', '🌱', '🙏', '💊',
  ];

  let name = habit?.name ?? '';
  let color = habit?.color ?? palette[0];
  let icon = habit?.icon ?? '';
  let categoryId = habit?.categoryId ?? null;
  let freqType = habit?.frequency?.type ?? 'daily';
  let weekdays = new Set(
    habit?.frequency?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]
  );
  let timesPerWeek = habit?.frequency?.timesPerWeek ?? 3;
  let mutableCategories = [...categories];
  let nameInput;

  onMount(() => {
    nameInput?.focus();
  });

  function toggleWeekday(d) {
    if (weekdays.has(d)) weekdays.delete(d);
    else weekdays.add(d);
    weekdays = new Set(weekdays);
  }

  function handleCreateCategory(e) {
    const cat = e.detail;
    mutableCategories = [...mutableCategories, cat];
    categoryId = cat.id;
    dispatch('createCategory', cat);
  }

  function setCategory(e) {
    categoryId = e.detail;
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;

    let frequency;
    if (freqType === 'daily') {
      frequency = { type: 'daily' };
    } else if (freqType === 'weekdays') {
      const days = [...weekdays].sort((a, b) => a - b);
      if (days.length === 0) {
        return; // require at least one day
      }
      frequency = { type: 'weekdays', weekdays: days };
    } else {
      frequency = { type: 'times_per_week', timesPerWeek: timesPerWeek };
    }

    dispatch('save', {
      name: trimmed,
      color,
      icon: icon.trim().slice(0, 2),
      categoryId,
      frequency,
    });
  }

  const weekdayLabels = [
    { d: 0, label: 'S' },
    { d: 1, label: 'M' },
    { d: 2, label: 'T' },
    { d: 3, label: 'W' },
    { d: 4, label: 'T' },
    { d: 5, label: 'F' },
    { d: 6, label: 'S' },
  ];

  function presetWeekdays(days) {
    weekdays = new Set(days);
  }

  $: canSave =
    name.trim().length > 0 &&
    (freqType !== 'weekdays' || weekdays.size > 0);
</script>

<form class="form" on:submit|preventDefault={save}>
  <label class="field">
    <span class="label">Name</span>
    <input
      bind:this={nameInput}
      type="text"
      bind:value={name}
      placeholder="e.g. Drink water"
      maxlength="60"
      required
    />
  </label>

  <div class="row-2">
    <div class="field">
      <span class="label">Icon (optional)</span>
      <input
        type="text"
        bind:value={icon}
        placeholder="e.g. 💧"
        maxlength="4"
      />
      <div class="emoji-row">
        {#each suggestedEmojis as e}
          <button
            type="button"
            class="emoji"
            class:active={icon === e}
            on:click={() => (icon = e)}
          >{e}</button>
        {/each}
      </div>
    </div>
  </div>

  <div class="field">
    <span class="label">Color</span>
    <div class="palette">
      {#each palette as c}
        <button
          type="button"
          class="swatch"
          class:active={color === c}
          style="background: {c}"
          aria-label={`Choose color ${c}`}
          on:click={() => (color = c)}
        ></button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span class="label">Category</span>
    <CategoryPicker
      categories={mutableCategories}
      value={categoryId}
      on:change={setCategory}
      on:create={handleCreateCategory}
    />
  </div>

  <div class="field">
    <span class="label">Frequency</span>
    <div class="seg">
      <button
        type="button"
        class="seg-btn"
        class:active={freqType === 'daily'}
        on:click={() => (freqType = 'daily')}
      >Daily</button>
      <button
        type="button"
        class="seg-btn"
        class:active={freqType === 'weekdays'}
        on:click={() => (freqType = 'weekdays')}
      >Specific days</button>
      <button
        type="button"
        class="seg-btn"
        class:active={freqType === 'times_per_week'}
        on:click={() => (freqType = 'times_per_week')}
      >X / week</button>
    </div>

    {#if freqType === 'weekdays'}
      <div class="weekdays">
        {#each weekdayLabels as { d, label }, i}
          <button
            type="button"
            class="day"
            class:active={weekdays.has(d)}
            on:click={() => toggleWeekday(d)}
            aria-pressed={weekdays.has(d)}
          >{label}</button>
        {/each}
      </div>
      <div class="presets">
        <button type="button" class="preset" on:click={() => presetWeekdays([1, 2, 3, 4, 5])}>Weekdays</button>
        <button type="button" class="preset" on:click={() => presetWeekdays([0, 6])}>Weekends</button>
        <button type="button" class="preset" on:click={() => presetWeekdays([0, 1, 2, 3, 4, 5, 6])}>All</button>
      </div>
    {:else if freqType === 'times_per_week'}
      <div class="times">
        <button type="button" class="step" on:click={() => (timesPerWeek = Math.max(1, timesPerWeek - 1))} aria-label="Decrease">−</button>
        <span class="times-value">{timesPerWeek} {timesPerWeek === 1 ? 'time' : 'times'} per week</span>
        <button type="button" class="step" on:click={() => (timesPerWeek = Math.min(7, timesPerWeek + 1))} aria-label="Increase">+</button>
      </div>
    {/if}
  </div>

  <div class="footer">
    {#if habit}
      <button type="button" class="btn btn-danger" on:click={() => dispatch('delete')}>Delete</button>
    {/if}
    <button type="submit" class="btn btn-primary btn-full" disabled={!canSave}>
      {habit ? 'Save changes' : 'Add habit'}
    </button>
  </div>
</form>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg-muted);
  }

  .palette {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    padding: 0;
  }

  .swatch.active {
    border-color: var(--fg);
    box-shadow: 0 0 0 2px var(--bg-elevated);
  }

  .emoji-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .emoji {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    font-size: 18px;
    line-height: 1;
    padding: 0;
  }

  .emoji.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: var(--bg-soft);
    border-radius: var(--radius-sm);
    padding: 4px;
  }

  .seg-btn {
    border: none;
    background: transparent;
    color: var(--fg-muted);
    padding: 8px 10px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 13px;
  }

  .seg-btn.active {
    background: var(--bg-elevated);
    color: var(--fg);
    box-shadow: var(--shadow);
  }

  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-top: 10px;
  }

  .day {
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg-muted);
    font-weight: 600;
    font-size: 13px;
  }

  .day.active {
    background: var(--accent);
    color: var(--accent-fg);
    border-color: transparent;
  }

  .presets {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .preset {
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 999px;
    background: var(--bg-soft);
    border: none;
    color: var(--fg-muted);
  }

  .times {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
    padding: 6px;
    background: var(--bg-soft);
    border-radius: var(--radius-sm);
  }

  .step {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--bg-elevated);
    color: var(--fg);
    font-size: 22px;
    line-height: 1;
    padding: 0;
    box-shadow: var(--shadow);
  }

  .times-value {
    font-weight: 600;
  }

  .footer {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
</style>
