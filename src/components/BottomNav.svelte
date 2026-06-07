<script>
  export let active = 'today';

  const items = [
    { id: 'today', label: 'Today', href: '#/today' },
    { id: 'habits', label: 'Habits', href: '#/habits' },
    { id: 'stats', label: 'Stats', href: '#/stats' },
    { id: 'settings', label: 'Settings', href: '#/settings' },
  ];
</script>

<nav class="bottom-nav" aria-label="Primary">
  {#each items as item}
    <a
      class="item"
      class:active={active === item.id}
      href={item.href}
      aria-current={active === item.id ? 'page' : undefined}
    >
      <span class="icon" aria-hidden="true">
        {#if item.id === 'today'}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        {:else if item.id === 'habits'}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        {:else if item.id === 'stats'}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        {/if}
      </span>
      <span class="label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding-bottom: env(safe-area-inset-bottom);
    background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    z-index: 50;
  }

  .item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: var(--fg-muted);
    padding: 8px 4px 6px;
    gap: 2px;
    font-size: 11px;
    height: 64px;
  }

  .item.active {
    color: var(--accent);
  }

  .icon {
    display: inline-flex;
    height: 24px;
    align-items: center;
  }

  .label {
    font-weight: 500;
    font-size: 11px;
  }
</style>
