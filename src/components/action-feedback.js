import { html, LitElement } from 'lit';
import './icon.js';

const DISPLAY_DURATION = 1200;

const styles = {
  container:
    'fixed bottom-6 left-1/2 z-50 hidden min-w-72 max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-emerald-500/40 bg-slate-900/95 px-4 py-3 shadow-xl shadow-emerald-950/40 backdrop-blur-sm sm:flex pointer-events-none select-none animate-fadeIn',
  iconWrap:
    'flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-emerald-300',
  icon: 'size-6',
  content: 'min-w-0 grow',
  name: 'truncate text-base font-semibold text-white',
  meta: 'mt-0.5 flex min-w-0 items-center gap-2 text-xs text-slate-400',
  category: 'truncate',
  pendingDot: 'size-2 shrink-0 rounded-full bg-emerald-400 animate-pulse',
  cancelHint:
    'ml-auto shrink-0 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400',
};

export class JkActionFeedback extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    feedback: { type: Object },
  };

  constructor() {
    super();
    this.feedback = null;
    this.hideTimer = null;
    this.resolvePending = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.finish(false);
  }

  show(feedback) {
    if (!feedback?.service?.name) return Promise.resolve(false);

    this.finish(false, false);
    this.feedback = feedback;
    this.emitVisibilityChange(true);

    return new Promise((resolve) => {
      this.resolvePending = resolve;
      this.hideTimer = setTimeout(() => {
        this.finish(true);
      }, DISPLAY_DURATION);
    });
  }

  cancel() {
    this.finish(false);
  }

  finish(shouldLaunch, hide = true) {
    clearTimeout(this.hideTimer);
    this.hideTimer = null;

    const resolve = this.resolvePending;
    this.resolvePending = null;

    if (hide && this.feedback) {
      this.feedback = null;
      this.emitVisibilityChange(false);
    }

    resolve?.(shouldLaunch);
  }

  emitVisibilityChange(visible) {
    this.dispatchEvent(
      new CustomEvent('feedback-visibility-change', {
        detail: { visible },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const { service } = this.feedback ?? {};
    if (!service?.name) return html``;

    return html`
      <div class="${styles.container}" role="status" aria-live="polite">
        <div class="${styles.iconWrap}">
          <jk-icon
            icon=${service.icon || 'ui:external-link'}
            alt=${service.name}
            class="${styles.icon}"
          ></jk-icon>
        </div>

        <div class="${styles.content}">
          <div class="${styles.name}">${service.name}</div>
          <div class="${styles.meta}">
            <span class="${styles.pendingDot}" aria-hidden="true"></span>
            ${service.category ? html`<span class="${styles.category}">${service.category}</span>` : ''}
            <kbd class="${styles.cancelHint}">Esc</kbd>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('jk-action-feedback', JkActionFeedback);
