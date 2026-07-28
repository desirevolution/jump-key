import { html, LitElement } from 'lit';
import './icon.js';

const styles = {
  badgeBase:
    'fixed bottom-6 right-6 z-50 hidden sm:flex min-h-12 items-center gap-2 rounded-xl border bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm transition-all duration-200 animate-fadeIn pointer-events-none select-none',
  badgeDefault: 'border-slate-600/80 text-slate-100 shadow-slate-950/50',
  badgeValid: 'jk-status-success-surface shadow-lg',
  badgeInvalid: 'jk-status-danger-surface shadow-lg',
  key: 'inline-flex min-w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-800 px-2 py-1 font-mono text-base font-bold tracking-wider text-current shadow-inner',
  separator: 'text-sm font-bold text-slate-500',
  icon: 'size-4 shrink-0',
  pendingDot: 'mx-1 size-2 shrink-0 rounded-full bg-slate-400 animate-pulse',
};

export class JkKeystrokeBadge extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    input: { type: String },
    isValid: { type: Boolean },
    isInvalid: { type: Boolean },
    hidden: { type: Boolean },
  };

  constructor() {
    super();
    this.input = '';
    this.isValid = false;
    this.isInvalid = false;
    this.hidden = false;
  }

  getInputParts() {
    return this.input
      .split(/\s*→\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  renderStatus() {
    if (this.isValid) {
      return html`<jk-icon icon="check" class="${styles.icon} jk-status-success"></jk-icon>`;
    }

    if (this.isInvalid) {
      return html`<jk-icon icon="x" class="${styles.icon} jk-status-danger"></jk-icon>`;
    }

    return html`<span class="${styles.pendingDot}" aria-hidden="true"></span>`;
  }

  render() {
    if (!this.input || this.hidden) return html``;

    const stateClass = this.isInvalid
      ? styles.badgeInvalid
      : this.isValid
        ? styles.badgeValid
        : styles.badgeDefault;
    const parts = this.getInputParts();

    return html`
      <div class="${styles.badgeBase} ${stateClass}" role="status" aria-live="polite">
        ${parts.map(
          (part, index) => html`
            ${index > 0 ? html`<span class="${styles.separator}" aria-hidden="true">→</span>` : ''}
            <kbd class="${styles.key}">${part}</kbd>
          `
        )}
        ${this.renderStatus()}
      </div>
    `;
  }
}

customElements.define('jk-keystroke-badge', JkKeystrokeBadge);
