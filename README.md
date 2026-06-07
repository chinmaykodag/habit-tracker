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

The app is deployed to GitHub Pages at:

**https://chinmaykodag.github.io/habit-tracker/**

1. Open the URL in **Safari** on your iPhone (not Chrome — iOS only allows
   PWA install from Safari).
2. Tap the share icon → **Add to Home Screen**.
3. Launch from the home-screen icon — it opens full-screen, no Safari chrome,
   works offline.

## Deploying

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys
to GitHub Pages on every push to `main`.

**One-time setup** (after creating the repo on GitHub):

1. Create the empty repo on GitHub (no README/license/.gitignore — they
   already exist locally).
2. Push: `git push -u origin main` (remote is already configured to
   `https://github.com/chinmaykodag/habit-tracker.git`).
3. The workflow runs automatically. The `actions/configure-pages` step
   auto-enables Pages with "GitHub Actions" as the source on first
   run, so no manual settings toggle is needed.
4. Watch progress in the **Actions** tab. After ~1 minute the site goes
   live at `https://chinmaykodag.github.io/habit-tracker/`.

**Forking / deploying under a different repo name**

The production base path is set once in `vite.config.js`:

```js
const PROD_BASE = '/habit-tracker/';
```

Change it to match your repo name (e.g. `'/my-habit-tracker/'`) and push.
For a user/org root site (`<username>.github.io`), use `'/'`.

## Tech

- **Svelte 4 + Vite 5** — small bundle (~49 KB JS gzipped)
- **vite-plugin-pwa** — auto-generates service worker and web app manifest
- **svelte-dnd-action** — touch-friendly drag-and-drop for the Stats layout
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
