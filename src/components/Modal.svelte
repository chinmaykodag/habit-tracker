<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  export let title = '';
  export let open = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && open) close();
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKeyDown);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown);
    }
  });
</script>

{#if open}
  <div class="backdrop" on:click={close} role="presentation"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
    <div class="handle" aria-hidden="true"></div>
    {#if title}
      <header class="head">
        <h2>{title}</h2>
        <button class="close" on:click={close} aria-label="Close">✕</button>
      </header>
    {/if}
    <div class="body">
      <slot />
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    animation: fade 0.15s ease;
  }

  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 101;
    background: var(--bg-elevated);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.25);
    padding: 8px 16px max(16px, env(safe-area-inset-bottom));
    max-height: 90dvh;
    overflow-y: auto;
    animation: slideUp 0.2s ease;
    max-width: 720px;
    margin: 0 auto;
  }

  .handle {
    width: 36px;
    height: 4px;
    background: var(--border);
    border-radius: 999px;
    margin: 4px auto 12px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .head h2 {
    font-size: 18px;
  }

  .close {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bg-soft);
    border: none;
    color: var(--fg-muted);
    font-size: 16px;
  }

  .body {
    padding-bottom: 8px;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
</style>
