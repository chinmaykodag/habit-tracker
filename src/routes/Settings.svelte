<script>
  import { state } from '../lib/stores.js';
  import { DEFAULT_STATE } from '../lib/storage.js';
  import { today } from '../lib/date.js';

  let fileInput;
  let importMessage = '';

  function setTheme(theme) {
    state.update((s) => ({ ...s, settings: { ...s.settings, theme } }));
  }

  function setWeekStart(value) {
    state.update((s) => ({
      ...s,
      settings: { ...s.settings, weekStartsOn: Number(value) },
    }));
  }

  function exportData() {
    const data = JSON.stringify($state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-export-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !Array.isArray(data.habits)) {
          throw new Error('Not a valid habit-tracker export.');
        }
        const choice = window.prompt(
          "Type 'replace' to overwrite all data, or 'merge' to merge habits and completions:",
          'merge'
        );
        if (!choice) {
          importMessage = 'Import cancelled.';
        } else if (choice.toLowerCase() === 'replace') {
          state.replace({
            ...DEFAULT_STATE,
            ...data,
            settings: { ...DEFAULT_STATE.settings, ...(data.settings ?? {}) },
          });
          importMessage = `Imported ${data.habits.length} habits (replaced existing data).`;
        } else if (choice.toLowerCase() === 'merge') {
          state.update((s) => mergeStates(s, data));
          importMessage = `Merged ${data.habits.length} habits.`;
        } else {
          importMessage = `Unknown choice "${choice}". Import cancelled.`;
        }
      } catch (err) {
        console.error(err);
        importMessage = 'Could not import: ' + err.message;
      } finally {
        if (fileInput) fileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  function mergeStates(current, incoming) {
    const habitsById = new Map(current.habits.map((h) => [h.id, h]));
    for (const h of incoming.habits ?? []) {
      if (!habitsById.has(h.id)) habitsById.set(h.id, h);
    }
    const categoriesById = new Map(current.categories.map((c) => [c.id, c]));
    for (const c of incoming.categories ?? []) {
      if (!categoriesById.has(c.id)) categoriesById.set(c.id, c);
    }
    const completions = { ...current.completions };
    for (const [id, dates] of Object.entries(incoming.completions ?? {})) {
      const merged = new Set([...(completions[id] ?? []), ...dates]);
      completions[id] = [...merged].sort();
    }
    return {
      ...current,
      habits: [...habitsById.values()],
      categories: [...categoriesById.values()],
      completions,
    };
  }

  function reset() {
    if (!confirm('Erase ALL habits and history? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? This will delete everything.')) return;
    state.reset();
  }

  $: habitCount = $state.habits.length;
  $: completionCount = Object.values($state.completions).reduce(
    (acc, arr) => acc + (arr?.length ?? 0),
    0
  );
</script>

<header class="header">
  <h1>Settings</h1>
</header>

<section class="block">
  <h2 class="section-title">Appearance</h2>
  <div class="card-surface card">
    <span class="label">Theme</span>
    <div class="seg">
      <button class="seg-btn" class:active={$state.settings.theme === 'light'} on:click={() => setTheme('light')}>Light</button>
      <button class="seg-btn" class:active={$state.settings.theme === 'dark'} on:click={() => setTheme('dark')}>Dark</button>
      <button class="seg-btn" class:active={$state.settings.theme === 'system'} on:click={() => setTheme('system')}>System</button>
    </div>
  </div>
  <div class="card-surface card">
    <span class="label">Week starts on</span>
    <div class="seg">
      <button class="seg-btn" class:active={$state.settings.weekStartsOn === 0} on:click={() => setWeekStart(0)}>Sunday</button>
      <button class="seg-btn" class:active={$state.settings.weekStartsOn === 1} on:click={() => setWeekStart(1)}>Monday</button>
    </div>
  </div>
</section>

<section class="block">
  <h2 class="section-title">Your data</h2>
  <div class="card-surface summary">
    <div>
      <span class="muted">Habits</span>
      <span class="num">{habitCount}</span>
    </div>
    <div>
      <span class="muted">Total check-ins</span>
      <span class="num">{completionCount}</span>
    </div>
  </div>
  <div class="actions">
    <button class="btn btn-primary btn-full" on:click={exportData}>Export as JSON</button>
    <label class="btn btn-full">
      Import from JSON
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        on:change={handleImport}
        hidden
      />
    </label>
  </div>
  {#if importMessage}
    <p class="muted import-msg">{importMessage}</p>
  {/if}
</section>

<section class="block">
  <h2 class="section-title">Danger zone</h2>
  <button class="btn btn-danger btn-full" on:click={reset}>Reset all data</button>
</section>

<section class="block about">
  <p class="muted">Habit Tracker · stored locally on this device · works offline.</p>
</section>

<style>
  .header {
    padding: 24px 16px 12px;
  }

  .header h1 {
    font-size: 28px;
    letter-spacing: -0.02em;
  }

  .block {
    padding: 0 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-size: 13px;
    text-transform: uppercase;
    color: var(--fg-muted);
    letter-spacing: 0.06em;
    font-weight: 600;
    margin: 0 0 4px 6px;
  }

  .card {
    padding: 14px 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg-muted);
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
    min-height: 36px;
  }

  .seg-btn.active {
    background: var(--bg-elevated);
    color: var(--fg);
    box-shadow: var(--shadow);
  }

  .summary {
    padding: 14px;
    display: flex;
    justify-content: space-around;
    text-align: center;
  }

  .summary > div {
    display: flex;
    flex-direction: column;
  }

  .num {
    font-size: 24px;
    font-weight: 700;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }

  .actions .btn {
    cursor: pointer;
  }

  .import-msg {
    margin: 8px 4px 0;
    font-size: 13px;
  }

  .about {
    text-align: center;
    margin-top: 12px;
  }
</style>
