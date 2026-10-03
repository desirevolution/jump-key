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

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

// Alle Build-Dateien (index.html, JS, CSS, ...)
precacheAndRoute(self.__WB_MANIFEST);

//
// SPA-Navigation immer aus dem Precache
//
const navigationHandler = createHandlerBoundToURL(import.meta.env.BASE_URL + 'index.html');

registerRoute(new NavigationRoute(navigationHandler, { denylist: [/\/config\//, /\/icons\//, /\/healthz$/] }));

//
// Bilder
//
registerRoute(
  ({ request }) => request.destination === 'image',
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
  event.waitUntil(caches.delete('services'));
});
