/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";

import { NavigationRoute, registerRoute } from "workbox-routing";

import { CacheFirst, NetworkFirst } from "workbox-strategies";

import { CacheableResponsePlugin } from "workbox-cacheable-response";

import { ExpirationPlugin } from "workbox-expiration";

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

// Alle Build-Dateien (index.html, JS, CSS, ...)
precacheAndRoute(self.__WB_MANIFEST);

//
// SPA-Navigation immer aus dem Precache
//
const navigationHandler = createHandlerBoundToURL(
  import.meta.env.BASE_URL + "index.html"
);

registerRoute(new NavigationRoute(navigationHandler));

//
// Bilder
//
registerRoute(
  ({ request }) => request.destination === "image",

  new CacheFirst({
    cacheName: "images",

    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

//
// Fonts
//
registerRoute(
  ({ request }) => request.destination === "font",

  new CacheFirst({
    cacheName: "fonts",
  }),
);

//
// services.json
//
// Network First
// 200 -> Cache aktualisieren
// 500/502/503 -> Cache verwenden
// Offline -> Cache verwenden
//
registerRoute(
  ({ url }) => url.pathname.endsWith("/config/services.json"),

  new NetworkFirst({
    cacheName: "services",

    networkTimeoutSeconds: 3,

    fetchOptions: {
      cache: "reload",
    },

    plugins: [
      // Nur 200 im Cache speichern
      new CacheableResponsePlugin({
        statuses: [200],
      }),

      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),

      // 5xx wie Netzwerkfehler behandeln
      {
        async fetchDidSucceed({ response }) {
          if (response.status >= 500) {
            throw new Error("Server Error");
          }

          return response;
        },
      },
    ],
  }),
);
