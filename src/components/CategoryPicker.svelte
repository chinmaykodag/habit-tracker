<script>
  import { createEventDispatcher } from 'svelte';
  import { newId } from '../lib/storage.js';

  export let categories = [];
  export let value = null; // selected categoryId or null

  const dispatch = createEventDispatcher();

  let creating = false;
  let newName = '';
  let newColor = '#10b981';

  const palette = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#64748b'];

  function select(id) {
    dispatch('change', id);
  }

  function startCreate() {
    creating = true;
    newName = '';
  }

  function cancel() {
    creating = false;
    newName = '';
  }

  function save() {
    const name = newName.trim();
    if (!name) return;
    const cat = { id: newId('c'), name, color: newColor };
    dispatch('create', cat);
    creating = false;
    newName = '';
  }
</script>

<div class="wrap">
  <div class="chips">
    <button
      type="button"
      class="chip"
      class:active={value === null}
      on:click={() => select(null)}
    >
      None
    </button>
    {#each categories as cat}
      <button
        type="button"
        class="chip"
        class:active={value === cat.id}
        style="--chip-color: {cat.color}"
        on:click={() => select(cat.id)}
      >
        <span class="dot" aria-hidden="true"></span>
        {cat.name}
      </button>
    {/each}
    {#if !creating}
      <button type="button" class="chip ghost" on:click={startCreate}>+ New</button>
    {/if}
  </div>

  {#if creating}
    <div class="create">
      <input
        type="text"
        bind:value={newName}
        placeholder="Category name"
        maxlength="30"
      />
      <div class="palette">
        {#each palette as c}
          <button
            type="button"
            class="swatch"
            class:active={newColor === c}
            style="background: {c}"
            aria-label={`Choose ${c}`}
            on:click={() => (newColor = c)}
          ></button>
        {/each}
      </div>
      <div class="actions">
        <button type="button" class="btn btn-ghost" on:click={cancel}>Cancel</button>
        <button type="button" class="btn btn-primary" on:click={save} disabled={!newName.trim()}>
          Add
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    --chip-color: var(--fg-muted);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
    font-size: 13px;
    font-weight: 500;
    min-height: 36px;
  }

  .chip.active {
    background: color-mix(in srgb, var(--chip-color) 16%, transparent);
    border-color: var(--chip-color);
    color: var(--fg);
  }

  .chip.ghost {
    color: var(--fg-muted);
    border-style: dashed;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--chip-color);
  }

  .create {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--bg-soft);
    border-radius: var(--radius-sm);
  }

  .palette {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
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
    box-shadow: 0 0 0 2px var(--bg-soft);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
</style>
