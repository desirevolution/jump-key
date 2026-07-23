import { html, LitElement } from 'lit';
import './icon.js';

export class JkToast extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    message: { type: String },
    type: { type: String }, // success | error | warning
    duration: { type: Number },
    show: { type: Boolean, reflect: true },
  };

  constructor() {
    super();

    this.message = '';
    this.type = 'success';
    this.duration = 3500;
    this.show = false;

    this._timer = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  updated(changed) {
    if (changed.has('show') && this.show) {
      clearTimeout(this._timer);

      this._timer = setTimeout(() => {
        this.show = false;

        this.dispatchEvent(
          new CustomEvent('toast-closed', {
            bubbles: true,
            composed: true,
          })
        );
      }, this.duration);
    }
  }

  render() {
    const config = {
      success: {
        icon: 'circle-check',
        accent: 'jk-status-success-accent',
        border: 'jk-status-success-border',
        iconColor: 'jk-status-success',
      },

      error: {
        icon: 'triangle-alert',
        accent: 'jk-status-danger-accent',
        border: 'jk-status-danger-border',
        iconColor: 'jk-status-danger',
      },

      warning: {
        icon: 'triangle-alert',
        accent: 'jk-status-warning-accent',
        border: 'jk-status-warning-border',
        iconColor: 'jk-status-warning',
      },
    }[this.type] ?? {
      icon: 'info',
      accent: 'jk-status-info-accent',
      border: 'jk-status-info-border',
      iconColor: 'jk-status-info',
    };

    return html`
      <div
        class="
          fixed
          bottom-6
          left-4
          right-4

          sm:left-1/2
          sm:right-auto
          sm:-translate-x-1/2
          sm:w-auto
          sm:max-w-lg

          z-[9999]

          transition-all
          duration-300
          ease-out

          ${
            this.show
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }
        "
      >
        <div
          class="
            flex
            overflow-hidden

            rounded-2xl

            bg-slate-900/95
            backdrop-blur-md

            border
            ${config.border}

            shadow-2xl
            jk-shadow-card
          "
        >
          <div class="w-1 shrink-0 ${config.accent}"></div>

          <div
            class="
              flex
              items-center
              gap-3

              px-5
              py-3

              min-w-0
            "
          >
            <jk-icon
              icon="${config.icon}"
              class="w-5 h-5 shrink-0 ${config.iconColor}"
            ></jk-icon>

            <span
              class="
                text-sm
                text-slate-100
                leading-5
                break-words
              "
            >
              ${this.message}
            </span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('jk-toast', JkToast);
