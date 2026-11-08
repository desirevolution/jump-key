/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';

import { NavigationRoute, registerRoute } from 'workbox-routing';

import { CacheFirst } from 'workbox-strategies';


import { ExpirationPlugin } from 'workbox-expiration';

// The new worker waits until the user explicitly accepts the update.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
// Claim once the user has approved activation; do not skip the waiting phase.
clientsClaim();

cleanupOutdatedCaches();

// Alle Build-Dateien (index.html, JS, CSS, ...)
precacheAndRoute(self.__WB_MANIFEST);

//
// SPA-Navigation immer aus dem Precache
//
const navigationHandler = createHandlerBoundToURL(import.meta.env.BASE_URL + 'index.html');

registerRoute(new NavigationRoute(navigationHandler, { denylist: [/\/api\//, /\/config\//, /\/icons\//, /\/healthz$/] }));

//
// Bilder
//
registerRoute(
  ({ request, url }) => request.destination === 'image'
    && url.origin === self.location.origin
    && !url.pathname.includes('/icons/')
    && !url.pathname.includes('/config/')
    && !url.pathname.includes('/api/'),
  new CacheFirst({
    cacheName: 'images',

    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

//
// Fonts
//
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
  })
);

// Personal configuration has one authoritative offline cache, owned by the app.
// Remove the old duplicate cache so a saved configuration cannot revert offline.
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.delete('services'), caches.delete('images')]));
});
