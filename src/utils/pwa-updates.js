// The update controller has no Vite dependencies and is testable with a fake
// ServiceWorkerRegistration. A waiting worker must NEVER reload a form.
export const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'development';

export class PwaUpdateController {
  constructor() {
    this.state = { status: 'idle', available: false, checking: false, lastChecked: null };
    this.listeners = new Set();
    this.registration = null;
    this.activate = null;
    this.checkPromise = null;
    this.interval = null;
    this._onVisible = () => {
      if (globalThis.document?.visibilityState === 'visible') this.check();
    };
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }
  update(next) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener({ ...this.state });
  }
  setRegistration(registration) {
    this.registration = registration;
    if (registration?.waiting) this.setAvailable();
  }
  setActivator(activate) { this.activate = activate; }
  setAvailable() { this.update({ status: 'available', available: true, checking: false }); }
  async check() {
    if (this.checkPromise) return this.checkPromise;
    if (globalThis.navigator?.onLine === false) {
      this.update({ status: 'offline', checking: false });
      return 'offline';
    }
    if (!this.registration?.update) {
      this.update({ status: 'unsupported', checking: false });
      return 'unsupported';
    }
    this.update({ status: this.state.available ? 'available' : 'checking', checking: true });
    this.checkPromise = (async () => {
      try {
        await this.registration.update();
        if (this.registration.waiting) this.setAvailable();
        else if (!this.state.available) this.update({ status: 'current' });
        this.update({ lastChecked: Date.now() });
        return this.state.status;
      } catch {
        this.update({ status: 'error' });
        return 'error';
      } finally {
        this.update({ checking: false });
        this.checkPromise = null;
      }
    })();
    return this.checkPromise;
  }
  apply() {
    if (!this.state.available || typeof this.activate !== 'function') return false;
    this.activate();
    return true;
  }
  start() {
    if (this.interval || typeof window === 'undefined') return;
    this.interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') this.check();
    }, UPDATE_INTERVAL_MS);
    document.addEventListener('visibilitychange', this._onVisible);
    window.addEventListener('focus', this._onVisible);
  }
  stop() {
    if (this.interval && typeof window !== 'undefined') window.clearInterval(this.interval);
    this.interval = null;
    globalThis.document?.removeEventListener('visibilitychange', this._onVisible);
    globalThis.window?.removeEventListener('focus', this._onVisible);
  }
}
export const pwaUpdates = new PwaUpdateController();
