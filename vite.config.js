import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolveDisplayVersion } from './scripts/build-version.mjs';

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const displayVersion = resolveDisplayVersion({
  releaseTag: process.env.JUMPKEY_RELEASE_TAG,
  commitSha: process.env.GITHUB_SHA,
  fallbackVersion: packageVersion,
});

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(displayVersion) },
  base: "/jump-key/",
  plugins: [
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',

      srcDir: 'src',
      filename: 'sw.js',

      registerType: 'prompt',
      // The virtual:register module registers the worker exactly once.
      injectRegister: null,

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },

      manifest: {
        id: '/jump-key/',
        start_url: '/jump-key/',
        scope: '/jump-key/',
        share_target: {
          action: '/jump-key/?share=1', method: 'GET', enctype: 'application/x-www-form-urlencoded',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        name: 'JumpKey Dashboard',
        short_name: 'JumpKey',
        theme_color: '#6366f1',
        display: 'standalone',
        icons: [
          {
            src: '/jump-key/jump-key-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/jump-key/jump-key-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
