import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// To deploy to a different GitHub Pages path, change PROD_BASE.
// Example: for https://username.github.io/my-fork/  →  '/my-fork/'.
// For https://username.github.io/ (user/org root site) →  '/'.
const PROD_BASE = '/habit-tracker/';

export default defineConfig(({ command }) => {
  const base = command === 'build' ? PROD_BASE : '/';
  return {
    base,
    plugins: [
      svelte(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Habit Tracker',
          short_name: 'Habits',
          description: 'A personal habit tracker that works offline on your iPhone.',
          theme_color: '#6f9577',
          background_color: '#6f9577',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
