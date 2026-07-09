import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/services.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-services-cache',
              cacheableResponse: {
                statuses: [200] // Only save to cache if background fetch succeeds cleanly
              },
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ],
      },
      // Your Web App Manifest info
      manifest: {
        name: 'JumpKey Dashboard',
        short_name: 'JumpKey',
        theme_color: '#6366f1',
        icons: [
          {
            src: '/jump-key.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
