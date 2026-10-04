import { t, detectLang } from '../utils/i18n.js';
import { html, LitElement } from 'lit';

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
    desktopOnly: { type: Boolean },
  };

  constructor() {
    super();

    this.icon = 'x';
    this.disabled = false;
    this.label = '';
    this.variant = 'default';
    this.text = '';
    this.desktopOnly = false;
  }

  render() {
    const isTextVariant = this.variant === 'text';

    // Sichtbarkeit Mobile/Desktop
    const visibilityClasses = this.desktopOnly ? 'hidden md:inline-flex' : 'inline-flex';

    // Varianten-Klassen
    // Wichtig: Kein inline-flex hier, damit visibilityClasses die Kontrolle behält
    const variantClasses = isTextVariant
      ? 'jk-btn jk-btn-danger group'
      : 'jk-btn jk-btn-secondary jk-icon-control group';

    // Icon-Klassen
    const iconClasses = isTextVariant
      ? 'size-3.5 block pointer-events-none'
      : 'size-4 block pointer-events-none transition-transform duration-200 group-hover:scale-110 group-active:scale-95';

    return html`
      <button
        type="button"
        ?disabled=${this.disabled}
        aria-label=${this.label || this.text || (this.icon === 'ui:x' ? t(detectLang(), 'close') : this.icon) || 'button'}
        class="${visibilityClasses} ${variantClasses}"
      >
        <jk-icon .icon=${this.icon} class=${iconClasses}></jk-icon>

        ${
          this.text
            ? html`
                <span
                  class="
                    text-sm
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
