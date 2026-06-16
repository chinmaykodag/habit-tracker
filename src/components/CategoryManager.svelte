<script>
  import { tick } from 'svelte';
  import { state } from '../lib/stores.js';
  import { newId } from '../lib/storage.js';

  const palette = [
    '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
    '#a855f7', '#ec4899', '#14b8a6', '#64748b',
  ];

  let editingId = null;
  let editingName = '';
  let editingColor = '';
  let editingInput;

  let creating = false;
  let newName = '';
  let newColor = palette[0];
  let newInput;

  $: categories = $state.categories;
  $: usage = countUsage($state.habits);

  function countUsage(habits) {
    const m = new Map();
    for (const h of habits) {
      if (h.archivedAt) continue;
      if (h.categoryId) m.set(h.categoryId, (m.get(h.categoryId) ?? 0) + 1);
    }
    return m;
  }

  function usageLabel(id) {
    const n = usage.get(id) ?? 0;
    return `${n} ${n === 1 ? 'habit' : 'habits'}`;
  }

  async function startEdit(cat) {
    creating = false;
    editingId = cat.id;
    editingName = cat.name;
    editingColor = cat.color;
    await tick();
    editingInput?.focus();
    editingInput?.select?.();
  }

  function cancelEdit() {
    editingId = null;
  }

  function saveEdit() {
    const name = editingName.trim();
    if (!name) return;
    const id = editingId;
    const color = editingColor;
    state.update((s) => ({
      ...s,
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, name, color } : c
      ),
    }));
    editingId = null;
  }

  function deleteCategory(cat) {
    const n = usage.get(cat.id) ?? 0;
    const msg = n > 0
      ? `Delete "${cat.name}"? ${n} ${n === 1 ? 'habit' : 'habits'} will become uncategorized (the habits themselves are kept).`
      : `Delete "${cat.name}"?`;
    if (!confirm(msg)) return;
    state.update((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== cat.id),
      habits: s.habits.map((h) =>
        h.categoryId === cat.id ? { ...h, categoryId: null } : h
      ),
    }));
    if (editingId === cat.id) editingId = null;
  }

  async function startCreate() {
    editingId = null;
    creating = true;
    newName = '';
    newColor = palette[0];
    await tick();
    newInput?.focus();
  }

  function cancelCreate() {
    creating = false;
    newName = '';
  }

  function addCategory() {
    const name = newName.trim();
    if (!name) return;
    state.update((s) => ({
      ...s,
      categories: [
        ...s.categories,
        { id: newId('c'), name, color: newColor },
      ],
    }));
    creating = false;
    newName = '';
  }
</script>

<div class="wrap">
  {#if categories.length === 0 && !creating}
    <div class="card-surface empty">
      <p>No categories yet. Use them to group related habits.</p>
      <button type="button" class="btn btn-primary" on:click={startCreate}>
        + New category
      </button>
    </div>
  {:else if categories.length > 0}
    <div class="card-surface list">
      {#each categories as cat (cat.id)}
        <div class="row" class:editing={editingId === cat.id}>
          {#if editingId === cat.id}
            <div class="edit-form">
              <input
                bind:this={editingInput}
                type="text"
                bind:value={editingName}
                maxlength="30"
                placeholder="Category name"
                on:keydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                  } else if (e.key === 'Escape') {
                    cancelEdit();
                  }
                }}
              />
              <div class="palette" role="radiogroup" aria-label="Category color">
                {#each palette as c (c)}
                  <button
                    type="button"
                    class="swatch"
                    class:active={editingColor === c}
                    style="background: {c}"
                    aria-label={`Choose ${c}`}
                    aria-pressed={editingColor === c}
                    on:click={() => (editingColor = c)}
                  ></button>
                {/each}
              </div>
              <div class="edit-actions">
                <button type="button" class="btn btn-ghost" on:click={cancelEdit}>
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  on:click={saveEdit}
                  disabled={!editingName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          {:else}
            <span
              class="dot"
              style="background: {cat.color}"
              aria-hidden="true"
            ></span>
            <div class="text">
              <span class="name">{cat.name}</span>
              <span class="count">{usageLabel(cat.id)}</span>
            </div>
            <button
              type="button"
              class="icon-btn"
              on:click={() => startEdit(cat)}
              aria-label={`Edit ${cat.name}`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
              </svg>
            </button>
            <button
              type="button"
              class="icon-btn danger"
              on:click={() => deleteCategory(cat)}
              aria-label={`Delete ${cat.name}`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if creating}
    <div class="card-surface create">
      <input
        bind:this={newInput}
        type="text"
        placeholder="Category name"
        bind:value={newName}
        maxlength="30"
        on:keydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addCategory();
          } else if (e.key === 'Escape') {
            cancelCreate();
          }
        }}
      />
      <div class="palette" role="radiogroup" aria-label="Category color">
        {#each palette as c (c)}
          <button
            type="button"
            class="swatch"
            class:active={newColor === c}
            style="background: {c}"
            aria-label={`Choose ${c}`}
            aria-pressed={newColor === c}
            on:click={() => (newColor = c)}
          ></button>
        {/each}
      </div>
      <div class="edit-actions">
        <button type="button" class="btn btn-ghost" on:click={cancelCreate}>
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          on:click={addCategory}
          disabled={!newName.trim()}
        >
          Add
        </button>
      </div>
    </div>
  {:else if categories.length > 0}
    <button type="button" class="btn btn-full add-btn" on:click={startCreate}>
      + New category
    </button>
  {/if}
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }

  .empty p {
    margin: 0;
    color: var(--fg-muted);
    font-size: 14px;
  }

  .list {
    overflow: hidden;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }

  .row:last-child {
    border-bottom: none;
  }

  .row.editing {
    background: var(--bg-soft);
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 600;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    font-size: 12px;
    color: var(--fg-muted);
    margin-top: 2px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
  }

  .icon-btn:active {
    background: var(--bg-soft);
  }

  .icon-btn.danger {
    color: var(--danger);
  }

  .edit-form,
  .create {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .create {
    padding: 14px;
  }

  .palette {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    padding: 0;
  }

  .swatch.active {
    border-color: var(--fg);
    box-shadow: 0 0 0 2px var(--bg-elevated);
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .add-btn {
    margin-top: 4px;
  }
</style>
