<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { state, route } from './lib/stores.js';
  import BottomNav from './components/BottomNav.svelte';
  import Today from './routes/Today.svelte';
  import Habits from './routes/Habits.svelte';
  import HabitDetail from './routes/HabitDetail.svelte';
  import Stats from './routes/Stats.svelte';
  import Settings from './routes/Settings.svelte';

  function applyTheme(setting) {
    if (typeof document === 'undefined') return;
    let resolved = setting;
    if (setting === 'system') {
      resolved = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  }

  $: applyTheme($state.settings.theme);

  let mediaQuery;
  function handleSystemChange() {
    if (get(state).settings.theme === 'system') applyTheme('system');
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener?.('change', handleSystemChange);
  });

  onDestroy(() => {
    mediaQuery?.removeEventListener?.('change', handleSystemChange);
  });

  $: page = $route.parts[0] || 'today';
  $: detailId = page === 'habits' ? $route.parts[1] : undefined;
</script>

<main class="app">
  {#if page === 'today'}
    <Today />
  {:else if page === 'habits' && detailId}
    {#key detailId}
      <HabitDetail id={detailId} />
    {/key}
  {:else if page === 'habits'}
    <Habits />
  {:else if page === 'stats'}
    <Stats />
  {:else if page === 'settings'}
    <Settings />
  {:else}
    <Today />
  {/if}
</main>

<BottomNav active={page} />

<style>
  .app {
    min-height: 100dvh;
    padding-top: env(safe-area-inset-top);
    padding-bottom: var(--bottom-nav-height);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    max-width: 720px;
    margin: 0 auto;
  }
</style>
