import { LitElement, html } from "lit";
import "./icon.js";

export class JkHelpModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    show: { type: Boolean },
    isGridView: { type: Boolean },
    t: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.isGridView = false;
  }

  _handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div
        @click="${this._handleClose}"
        class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      >
        <div
          @click="${(e) => e.stopPropagation()}"
          class="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
        >
          <button
            @click="${this._handleClose}"
            class="absolute top-4 right-4 p-2 bg-slate-850 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-md cursor-pointer transition-all duration-150 group"
          >
            <jk-icon
              icon="x"
              class="block w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors"
            ></jk-icon>
          </button>

          <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <jk-icon icon="keyboard" class="text-indigo-400 w-6 h-6"></jk-icon>
            ${this.t("helpShortcutsTitle")}
          </h3>

          <div class="space-y-4">
            <div
              class="flex items-center justify-between py-2 border-b border-slate-700/50"
            >
              <span class="text-slate-300 font-medium"
                >${this.t("helpToggleSearch")}</span
              >
              <kbd
                class="px-2 py-1 bg-slate-900 border border-slate-700 text-indigo-400 font-mono text-sm rounded shadow"
                >Space</kbd
              >
            </div>
            <div
              class="flex items-center justify-between py-2 border-b border-slate-700/50"
            >
              <span class="text-slate-300 font-medium"
                >${this.t("helpToggleConfig")}</span
              >
              <div class="flex gap-1">
                <kbd
                  class="px-2 py-1 bg-slate-900 border border-slate-700 text-slate-400 font-mono text-xs rounded shadow"
                  >Ctrl</kbd
                >
                <kbd
                  class="px-2 py-1 bg-slate-900 border border-slate-700 text-indigo-400 font-mono text-sm rounded shadow"
                  >,</kbd
                >
              </div>
            </div>
            <div
              class="flex items-center justify-between py-2 border-b border-slate-700/50"
            >
              <span class="text-slate-300 font-medium"
                >${this.t("helpToggleView")}</span
              >
              <kbd
                class="px-2 py-1 bg-slate-900 border border-slate-700 text-indigo-400 font-mono text-sm rounded shadow"
                >v</kbd
              >
            </div>
            <div
              class="flex items-center justify-between py-2 border-b border-slate-700/50"
            >
              <span class="text-slate-300 font-medium"
                >${this.t("helpToggleHelp")}</span
              >
              <kbd
                class="px-2 py-1 bg-slate-900 border border-slate-700 text-indigo-400 font-mono text-sm rounded shadow"
                >?</kbd
              >
            </div>
            <div
              class="flex items-center justify-between py-2 border-b border-slate-700/50"
            >
              <span class="text-slate-300 font-medium"
                >${this.t("helpBackDashboard")}</span
              >
              <kbd
                class="px-2 py-1 bg-slate-900 border border-slate-700 text-indigo-400 font-mono text-sm rounded shadow"
                >Esc</kbd
              >
            </div>
          </div>

          <div
            class="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/40 text-xs text-slate-400 leading-relaxed"
          >
            <span class="font-semibold text-slate-300 block mb-1"
              >${this.t("helpNavigationTipTitle")}</span
            >
            ${this.isGridView ? this.t("helpNavigationTipGrid") : this.t("helpNavigationTipSequence")}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-help-modal", JkHelpModal);
