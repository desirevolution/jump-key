import { LitElement, html } from 'lit';
import './icon.js';
import './icon-button.js';

// 1. Static styling dictionary isolating layouts from the rendering engine
const styles = {
  overlay: `fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6`,
  modal: `relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl shadow-black/40`,
  header: `flex items-start gap-4 p-6 pb-5`,
  iconBadgeBase: `flex items-center justify-center size-12 shrink-0 rounded-xl bg-slate-700/60 ring-1 ring-slate-600/70`,
  icon: `size-6`,
  contentCell: `grow min-w-0`,
  title: `text-xl font-semibold tracking-tight text-white`,
  message: `mt-2 text-sm leading-6 text-slate-300`,
  footer: `flex justify-end gap-3 border-t border-slate-700/70 bg-slate-900/30 px-6 py-4`,
  cancelBtn: `rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-indigo-500/50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30`,
  confirmBtn: `rounded-xl border border-indigo-500 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition-all duration-200 hover:bg-indigo-500/30 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40`,
};

export class JkDialog extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind configuration styles
  }

  static properties = {
    show: { type: Boolean },
    title: { type: String },
    message: { type: String },
    icon: { type: String },
    iconColor: { type: String },
    variant: { type: String },
    confirmLabel: { type: String },
    cancelLabel: { type: String },
  };

  constructor() {
    super();
    this.show = false;
    this.title = 'Are you sure?';
    this.message = '';
    this.icon = 'info';
    this.iconColor = 'text-indigo-400';
    this.variant = 'confirm';
    this.confirmLabel = 'Confirm';
    this.cancelLabel = 'Cancel';

    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  willUpdate(changed) {
    if (changed.has('show')) {
      if (this.show) {
        window.addEventListener('keydown', this._handleKeyDown, true);
        // Autofocus the primary action button on open
        this._focusButton('confirmBtn');
      } else {
        window.removeEventListener('keydown', this._handleKeyDown, true);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._handleKeyDown, true);
  }

  // Helper utility to safely query and focus our buttons
  async _focusButton(id) {
    await this.updateComplete;
    const btn = this.querySelector(`#${id}`);
    if (btn) {
      btn.focus();
    }
  }

  _handleKeyDown(e) {
    if (!this.show) return;

    // 1. Arrow Key Navigation (Only active if we have two buttons)
    if (this.variant === 'confirm' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation();

      const activeElementId = document.activeElement?.id;

      if (e.key === 'ArrowLeft' && activeElementId === 'confirmBtn') {
        this._focusButton('cancelBtn');
      } else if (e.key === 'ArrowRight' && activeElementId === 'cancelBtn') {
        this._focusButton('confirmBtn');
      }
      return;
    }

    // 2. Escape -> Cancel action
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this._handleCancel();
    }
  }

  _handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    this._close();
  }

  _handleConfirm() {
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));
    this._close();
  }

  _close() {
    this.show = false;
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div @click=${this._handleCancel} class="${styles.overlay}">
        <div @click=${(e) => e.stopPropagation()} class="${styles.modal}">
          <!-- Header -->
          <div class="${styles.header}">
            <!-- Icon (Combines static layout with dynamic color safely) -->
            <div class="${styles.iconBadgeBase} ${this.iconColor}">
              <jk-icon .icon=${this.icon} class="${styles.icon}"></jk-icon>
            </div>

            <!-- Title + Message -->
            <div class="${styles.contentCell}">
              <h2 class="${styles.title}">${this.title}</h2>
              <p class="${styles.message}">${this.message}</p>
            </div>

            <!-- Close -->
            <jk-icon-button icon="x" @click=${this._handleCancel}></jk-icon-button>
          </div>

          <!-- Footer -->
          <div class="${styles.footer}">
            ${
              this.variant === 'confirm'
                ? html`
                    <button id="cancelBtn" @click=${this._handleCancel} class="${styles.cancelBtn}">
                      ${this.cancelLabel}
                    </button>
                  `
                : ''
            }

            <button id="confirmBtn" @click=${this._handleConfirm} class="${styles.confirmBtn}">
              ${this.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('jk-dialog', JkDialog);
