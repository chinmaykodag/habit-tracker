<script>
  import { state } from '../lib/stores.js';
  import { DEFAULT_STATE } from '../lib/storage.js';
  import { today } from '../lib/date.js';
  import { toCSV } from '../lib/csv.js';
  import { frequencyLabel } from '../lib/habits.js';

  let fileInput;
  let importMessage = '';

  const ACCENTS = [
    { id: 'sage',    label: 'Sage',    swatch: '#6f9577' },
    { id: 'indigo',  label: 'Indigo',  swatch: '#6366f1' },
    { id: 'emerald', label: 'Emerald', swatch: '#10b981' },
    { id: 'sunset',  label: 'Sunset',  swatch: '#f97316' },
    { id: 'rose',    label: 'Rose',    swatch: '#e11d48' },
    { id: 'sky',     label: 'Sky',     swatch: '#0284c7' },
  ];

  function setTheme(theme) {
    state.update((s) => ({ ...s, settings: { ...s.settings, theme } }));
  }

  function setAccent(accent) {
    state.update((s) => ({ ...s, settings: { ...s.settings, accent } }));
  }

  function applyAccentToAllHabits() {
    const colored = $state.habits.filter((h) => h.color != null);
    if (colored.length === 0) {
      importMessage = 'All habits already match the accent.';
      return;
    }
    if (!confirm(`Set all ${colored.length} habits to match the app accent? (Each habit's individual color will be cleared.)`)) return;
    state.update((s) => ({
      ...s,
      habits: s.habits.map((h) => ({ ...h, color: null })),
    }));
    importMessage = `Updated ${colored.length} ${colored.length === 1 ? 'habit' : 'habits'} to match accent.`;
  }

  function setWeekStart(value) {
    state.update((s) => ({
      ...s,
      settings: { ...s.settings, weekStartsOn: Number(value) },
    }));
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    download(
      `habit-tracker-export-${today()}.json`,
      JSON.stringify($state, null, 2),
      'application/json'
    );
  }

  function exportCsv() {
    const s = $state;
    const catById = new Map((s.categories ?? []).map((c) => [c.id, c.name]));

    const rows = [
      ['date', 'habit_id', 'habit_name', 'category', 'frequency', 'color'],
    ];

    // One row per check-in, sorted by date then habit name for stable output
    const entries = [];
    for (const h of s.habits) {
      const cat = h.categoryId ? catById.get(h.categoryId) ?? '' : '';
      const freq = frequencyLabel(h);
      for (const d of s.completions[h.id] ?? []) {
        entries.push({ date: d, h, cat, freq });
      }
    }
    entries.sort((a, b) =>
      a.date === b.date ? a.h.name.localeCompare(b.h.name) : a.date.localeCompare(b.date)
    );
    for (const e of entries) {
      rows.push([e.date, e.h.id, e.h.name, e.cat, e.freq, e.h.color ?? '']);
    }

    // Add BOM so Excel opens UTF-8 correctly
    download(
      `habit-tracker-history-${today()}.csv`,
      '\uFEFF' + toCSV(rows) + '\r\n',
      'text/csv;charset=utf-8'
    );
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
    <span class="label">Accent</span>
    <div class="accent-grid">
      {#each ACCENTS as a (a.id)}
        <button
          type="button"
          class="accent-pick"
          class:active={($state.settings.accent ?? 'sage') === a.id}
          on:click={() => setAccent(a.id)}
          aria-label={a.label}
          aria-pressed={($state.settings.accent ?? 'sage') === a.id}
        >
          <span class="accent-swatch" style="background: {a.swatch}"></span>
          <span class="accent-label">{a.label}</span>
        </button>
      {/each}
    </div>
    <button class="btn-link" type="button" on:click={applyAccentToAllHabits}>
      Apply accent to all habits
    </button>
  </div>
  <div class="card-surface card">
    <span class="label">Theme</span>
    <div class="seg">
      <button class="seg-btn" class:active={$state.settings.theme === 'light'} on:click={() => setTheme('light')}>Light</button>
      <button class="seg-btn" class:active={$state.settings.theme === 'dark'} on:click={() => setTheme('dark')}>Dark</button>
      <button class="seg-btn" class:active={$state.settings.theme === 'system'} on:click={() => setTheme('system')}>System</button>
    </div>
    <span class="hint">Dark mode uses a pure-black background for OLED screens.</span>
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
    <button class="btn btn-primary btn-full" on:click={exportJson}>Export as JSON</button>
    <button class="btn btn-full" on:click={exportCsv}>Export history as CSV</button>
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

  .btn-link {
    background: none;
    border: none;
    color: var(--accent);
    font-weight: 600;
    font-size: 13px;
    padding: 6px 8px;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 4px;
  }

  .btn-link:active {
    opacity: 0.6;
  }

  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg-muted);
  }

  .hint {
    font-size: 12px;
    color: var(--fg-muted);
    margin-top: 4px;
  }

  .accent-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  @media (min-width: 480px) {
    .accent-grid {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  .accent-pick {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 4px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--fg-muted);
    font-weight: 600;
    cursor: pointer;
  }

  .accent-pick.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    color: var(--fg);
  }

  .accent-swatch {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid transparent;
    box-shadow: 0 0 0 1px var(--border);
  }

  .accent-pick.active .accent-swatch {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .accent-label {
    line-height: 1;
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
