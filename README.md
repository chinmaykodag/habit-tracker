# Habit Tracker

A personal habit tracker that doubles as an installable PWA on iPhone (and any
other device with a modern browser). Offline-first, no accounts, all data stays
on your device in LocalStorage.

## Features

- **Habits with frequency** — daily, specific weekdays (e.g. M/W/F), or X
  times per week
- **Tap-to-toggle** check-ins from the Today view
- **Streaks** — current and longest, computed per frequency
- **GitHub-style heatmap** for each habit (last 6 months, scrolled to today)
- **Categories** with color labels
- **Stats** — 30-day completion rate with **trend arrow** vs prior 30d;
  perfect days this month + current perfect-day streak; smart insights
  (auto-generated highlights based on your data); whole-tracker annual
  heatmap; weekly check-ins chart; day-of-week breakdown; top-3 habit
  leaderboard with weekly sparklines; "needs attention" alerts for
  habits under 70%; personal records (longest perfect-day streak,
  biggest day/week, longest single-habit streak, year-to-date totals);
  per-category 30-day rate
- **Drag to reorder stats** — tap "Edit" in the top-right of the Stats
  page, then drag the ⋮⋮ handles to reorder sections; "Reset to default"
  restores the original layout. Order persists across reloads and is
  included in the JSON export
- **Six accent themes** — Sage (default), Indigo, Emerald, Sunset, Rose, Sky.
  Pick from Settings → Appearance → Accent. Tinted heatmap palette + iOS
  status-bar tint update automatically. Habits without an explicit color
  inherit the chosen accent.
- **Light / dark / system** theme — dark mode uses a **pure-black background
  for OLED screens** (saves battery on iPhone). Follows iOS system
  preference by default.
- **Export** — full backup as JSON (all habits, history, categories,
  settings, layout); habit history as CSV (one row per check-in, opens
  cleanly in Excel/Sheets)
- **Import** from JSON with merge-or-replace
- **PWA** — installable on iPhone home screen, fully offline after first load

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # builds to dist/
npm run preview    # serves the production build
```

Re-generate PWA icons from `public/favicon.svg`:

```bash
npm run generate:icons
```

## Installing as an iOS PWA

1. Deploy `dist/` to any static host with HTTPS (Vercel, Netlify, Cloudflare
   Pages, GitHub Pages, etc.). iOS Safari **requires HTTPS** to install a PWA.
2. Open the deployed URL in **Safari** on your iPhone (not Chrome).
3. Tap the share icon → **Add to Home Screen**.
4. Launch from the home-screen icon — it opens full-screen, no Safari chrome,
   works offline.

## Tech

- **Svelte 4 + Vite 5** — small bundle (~26 KB JS gzipped)
- **vite-plugin-pwa** — auto-generates service worker and web app manifest
- **LocalStorage** — schema-versioned, supports decades of habit history for
  any reasonable number of habits
- No backend, no accounts, no tracking

## File layout

```
src/
  main.js              # entry point, registers service worker
  App.svelte           # root component, hash router, theme application
  app.css              # global tokens (CSS variables) + utility classes
  lib/
    date.js            # local-time ISO date helpers, week math
    storage.js         # LocalStorage read/write, schema migration
    habits.js          # streak / completion-rate / frequency logic (pure)
    stores.js          # Svelte stores for state + route
  components/
    BottomNav.svelte
    HabitCard.svelte
    HabitForm.svelte
    Heatmap.svelte
    CategoryPicker.svelte
    Modal.svelte
  routes/
    Today.svelte
    Habits.svelte
    HabitDetail.svelte
    Stats.svelte
    Settings.svelte
public/
  favicon.svg          # source-of-truth icon (also used as browser favicon)
  icons/               # generated PNGs for PWA + iOS home-screen
scripts/
  generate-icons.mjs   # rasterizes favicon.svg into the public/icons/ PNGs
```

## Data model (LocalStorage key `habit-tracker:v1`)

```js
{
  version: 1,
  habits: [{
    id, name, color, icon?, categoryId?,
    frequency: { type: 'daily' | 'weekdays' | 'times_per_week',
                 weekdays?: number[],     // 0=Sun..6=Sat
                 timesPerWeek?: number }, // 1..7
    createdAt, archivedAt
  }],
  categories: [{ id, name, color }],
  completions: { [habitId]: ['YYYY-MM-DD', ...] },
  settings: { theme: 'system'|'light'|'dark', weekStartsOn: 0|1 }
}
```

All completion dates are stored as **local-time** `YYYY-MM-DD` strings — a
check-in on the night of June 7 is always `2026-06-07` regardless of timezone.
