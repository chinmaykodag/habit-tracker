<script>
  import { onMount, onDestroy, tick } from 'svelte';
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

  function applyAccent(accent) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-accent', accent || 'sage');
  }

  // Sync <meta name="theme-color"> with the resolved accent so iOS Safari's
  // status bar tint matches the user's choice. We read the computed
  // --accent value after Svelte applies the new data-accent attribute.
  async function syncThemeColorMeta() {
    if (typeof document === 'undefined') return;
    await tick();
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    if (!value) return;
    let meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', value);
  }

  $: applyTheme($state.settings.theme);
  $: applyAccent($state.settings.accent);
  // Re-sync whenever either changes (the computed --accent depends on both).
  $: $state.settings.theme, $state.settings.accent, syncThemeColorMeta();

  let mediaQuery;
  function handleSystemChange() {
    if (get(state).settings.theme === 'system') {
      applyTheme('system');
      syncThemeColorMeta();
    }
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
