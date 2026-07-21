import { html, LitElement } from 'lit';
import './icon.js';

const styles = {
  badgeBase:
    'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-sm border shadow-xl font-mono text-lg font-bold transition-all duration-200 animate-fadeIn hidden sm:flex pointer-events-none select-none',
  badgeInvalid: 'border-rose-500/50 text-rose-300 shadow-rose-950/50',
  badgeValid: 'border-emerald-500/50 text-emerald-300 shadow-emerald-950/50',
  badgeDefault: 'border-indigo-500/50 text-indigo-300 shadow-indigo-950/50',
  kbd: 'px-2 py-1 rounded-md bg-slate-800 border border-slate-700 shadow-inner tracking-wider',
  iconBadge: 'w-4 h-4',
};

export class JkKeystrokeBadge extends LitElement {
  createRenderRoot() {
    return this; // Licht-DOM beibehalten (wie im Rest des Projekts)
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

  render() {
    if (!this.input || this.hidden) return html``;

    const stateClass = this.isInvalid
      ? styles.badgeInvalid
      : this.isValid
        ? styles.badgeValid
        : styles.badgeDefault;

    return html`
      <div class="${styles.badgeBase} ${stateClass}">
        <kbd class="${styles.kbd}">${this.input}</kbd>

        ${
          this.isValid
            ? html`<jk-icon
                icon="check"
                class="${styles.iconBadge} text-emerald-400"
              ></jk-icon>`
            : ''
        }
        ${
          this.isInvalid
            ? html`<jk-icon
                icon="x"
                class="${styles.iconBadge} text-rose-400"
              ></jk-icon>`
            : ''
        }
      </div>
    `;
  }
}

customElements.define('jk-keystroke-badge', JkKeystrokeBadge);
