import "./style.css";

// Import your app AFTER the icon library is registered.
import "./app.js";

import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    location.reload();
  },
});
