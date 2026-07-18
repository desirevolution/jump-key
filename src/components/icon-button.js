import { LitElement, html } from 'lit';

import './icon.js';

export class JkIconButton extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    icon: { type: String },
    disabled: { type: Boolean },
    label: { type: String },
    variant: { type: String },
    text: { type: String },
    hideOnMobile: { type: Boolean },
  };

  constructor() {
    super();

    this.icon = 'x';
    this.disabled = false;
    this.label = '';
    this.variant = 'default';
    this.text = '';
    this.hideOnMobile = false;
  }

  render() {
    const isTextVariant = this.variant === 'text';

    // 1. Sichtbarkeitsklassen (Mobile/Desktop) ermitteln
    const visibilityClasses = this.hideOnMobile ? 'hidden md:inline-flex' : 'inline-flex';

    // 2. Varianten-Klassen bestimmen
    const variantClasses = isTextVariant
      ? 'group items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-slate-400 transition-all duration-200 hover:text-rose-300 hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500/30'
      : 'group inline-flex items-center justify-center size-9 rounded-xl border border-slate-600/70 bg-slate-700/50 text-slate-400 transition-all duration-200 hover:bg-indigo-500/15 hover:border-indigo-500/40 hover:text-indigo-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

    // 3. Icon-Klassen bestimmen
    const iconClasses = isTextVariant
      ? 'size-3.5 block pointer-events-none'
      : 'size-4 block pointer-events-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95';

    return html`
      <!-- FIX: classMap entfernt, Klassen werden sauber als valider String interpoliert -->
      <button
        type="button"
        ?disabled=${this.disabled}
        aria-label=${this.label || this.text || this.icon || 'button'}
        class="${visibilityClasses} ${variantClasses}"
      >
        <jk-icon .icon=${this.icon} class=${iconClasses}></jk-icon>

        ${
          this.text
            ? html`
                <span
                  class="
                    text-[11px]
                    font-medium
                    leading-none
                    pointer-events-none
                  "
                >
                  ${this.text}
                </span>
              `
            : ''
        }
      </button>
    `;
  }
}

customElements.define('jk-icon-button', JkIconButton);
