import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline', // Automatically registers the worker in your index.html
      
      // Workbox configuration block
      workbox: {
        // Automatically find and precache ALL generated JS/CSS/HTML chunks in /dist
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        
        // Define runtime routing strategies (fixes your proxy and JSON endpoints)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/services.json'),
            handler: 'NetworkFirst', // Tries network, falls back to cache
            options: {
              cacheName: 'api-services-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                // IMPORTANT: Only cache standard successes (200). 
                // Proxy errors like 502, 503, 504 are strictly ignored and trigger the offline fallback!
                statuses: [200] 
              }
            }
          }
        ],
        // If an offline user hits a navigation route, fallback immediately to index.html
        navigateFallback: '/index.html'
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
