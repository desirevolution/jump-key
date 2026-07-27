/**
 * Coordinates one cancelable user action at a time.
 *
 * Persistent UI state remains owned by the app component.
 */
export class ActionManager {
  #active = null;

  start(action) {
    this.cancel();
    this.#active = action;
    return action;
  }

  cancel() {
    if (!this.#active) return false;

    const action = this.#active;
    this.#active = null;
    action.cancel?.();
    return true;
  }

  complete(action) {
    if (!this.isActive(action)) return false;
    this.#active = null;
    return true;
  }

  isActive(action) {
    return Boolean(action && this.#active === action);
  }

  get activeType() {
    return this.#active?.type ?? null;
  }
}
