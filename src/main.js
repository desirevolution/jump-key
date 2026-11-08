import './style.css';

import { registerSW } from 'virtual:pwa-register';
import { pwaUpdates } from './utils/pwa-updates.js';
import { createDemoFetch } from './utils/demo-backend.js';

// Install the demo API before importing the app: its initial workspace load
// and management views must see the same mocked backend.
if (import.meta.env.VITE_DEMO_MODE === 'true') {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = createDemoFetch(import.meta.env.BASE_URL, nativeFetch);
}
await import('./app.js');

let acceptedUpdateInThisTab = false;
const activateUpdate = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    pwaUpdates.setRegistration(registration);
    pwaUpdates.start();
    // The first check also detects workers that were waiting before startup.
    if (registration) pwaUpdates.check();
  },
  onNeedRefresh() { pwaUpdates.setAvailable(); },
  onNeedReload() {
    // Another tab may have activated the new worker. Never reload a different
    // tab's unsaved form without its own explicit confirmation.
    if (acceptedUpdateInThisTab) window.location.reload();
    else pwaUpdates.setAvailable();
  },
});
pwaUpdates.setActivator(() => {
  acceptedUpdateInThisTab = true;
  // If another tab already activated the update, there is no waiting worker
  // left to message: an explicit click can simply reload this tab.
  if (!pwaUpdates.registration?.waiting && navigator.serviceWorker?.controller) {
    window.location.reload();
  } else {
    activateUpdate(true);
  }
});
