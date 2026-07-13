import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: "/jump-key",
  plugins: [
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',

      srcDir: 'src',
      filename: 'sw.js',

      registerType: 'autoUpdate',
      injectRegister: 'inline',

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },

      manifest: {
        id: '/',
        start_url: '/',
        scope: '/',
        share_target: {
          action: '/?share=1', method: 'GET', enctype: 'application/x-www-form-urlencoded',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        name: 'JumpKey Dashboard',
        short_name: 'JumpKey',
        theme_color: '#6366f1',
        display: 'standalone',
        icons: [
          {
            src: '/jump-key-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/jump-key-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
