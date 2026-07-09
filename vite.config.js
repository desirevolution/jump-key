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
            handler: 'NetworkFirst', // Tries network, falls back to cache
            options: {
              cacheName: 'api-services-cache',
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    if (response && response.status === 200) {
                      return response;
                    }
                    return null; 
                  }
                }
              ],
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
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
