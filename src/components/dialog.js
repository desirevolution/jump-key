import { LitElement, html } from "lit";
import "./icon.js";
import "./jk-icon-button.js";

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
    this.title = "Are you sure?";
    this.message = "";
    this.icon = "info";
    this.iconColor = "text-indigo-400";
    this.variant = "confirm";
    this.confirmLabel = "Confirm";
    this.cancelLabel = "Cancel";

    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  willUpdate(changed) {
    if (changed.has("show")) {
      if (this.show) {
        window.addEventListener("keydown", this._handleKeyDown, true);
        // Autofocus the primary action button on open
        this._focusButton("confirmBtn");
      } else {
        window.removeEventListener("keydown", this._handleKeyDown, true);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._handleKeyDown, true);
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
    if (
      this.variant === "confirm" &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
      e.preventDefault();
      e.stopPropagation();

      const activeElementId = document.activeElement?.id;

      if (e.key === "ArrowLeft" && activeElementId === "confirmBtn") {
        this._focusButton("cancelBtn");
      } else if (e.key === "ArrowRight" && activeElementId === "cancelBtn") {
        this._focusButton("confirmBtn");
      }
      return;
    }

    // 2. Escape -> Cancel action
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this._handleCancel();
    }

    // Note: We don't need a manual "Enter" key handler anymore!
    // Since our buttons are focused, the browser natively triggers a click
    // event on the focused button when the user presses Enter.
  }

  _handleCancel() {
    this.dispatchEvent(
      new CustomEvent("cancel", { bubbles: true, composed: true }),
    );
    this._close();
  }

  _handleConfirm() {
    this.dispatchEvent(
      new CustomEvent("confirm", { bubbles: true, composed: true }),
    );
    this._close();
  }

  _close() {
    this.show = false;
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div
        @click="${this._handleCancel}"
        class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      >
        <div
          @click="${(e) => e.stopPropagation()}"
          class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center font-mono relative"
        >
          <div class="absolute top-4 right-4">
            <jk-icon-button
              icon="x"
              @click="${this._handleCancel}"
            ></jk-icon-button>
          </div>

          <div class="mb-4 mt-2 flex justify-center">
            <jk-icon
              .icon="${this.icon}"
              class="${this.iconColor} w-14 h-14"
            ></jk-icon>
          </div>

          <h3 class="text-lg font-bold text-white mb-2 px-4 w-full">
            ${this.title}
          </h3>

          <p
            class="text-sm text-slate-300 mb-6 leading-relaxed max-w-sm w-full"
          >
            ${this.message}
          </p>

          <div class="flex items-center justify-center gap-3 w-full">
            ${
              this.variant === "confirm"
                ? html`
                    <button
                      type="button"
                      id="cancelBtn"
                      @click="${this._handleCancel}"
                      class="px-5 py-2 bg-slate-700 hover:bg-slate-650 border border-transparent focus:border-indigo-500 hover:border-indigo-500 rounded-xl text-sm font-medium text-slate-200 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20"
                      title="ArrowLeft / Escape"
                    >
                      ${this.cancelLabel}
                    </button>
                  `
                : ""
            }

            <button
              type="button"
              id="confirmBtn"
              @click="${this._handleConfirm}"
              class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-transparent focus:border-indigo-300 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="ArrowRight / Enter"
            >
              ${this.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-dialog", JkDialog);
