import './style.css';
import './app.js';

import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onNeedRefresh() {
    location.reload();
  },
});
