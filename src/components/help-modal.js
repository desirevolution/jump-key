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
    if (!this.show) return "";

    const shortcuts = [
      { keys: ["Space"], desc: this.t("hkSearch") },
      { keys: ["#"], desc: this.t("hkToggleView") },
    ];

    if (!this.isGridView) {
      shortcuts.push({ keys: ["1", "-", "0"], desc: this.t("hkFavs") });
    }

    shortcuts.push(
      { keys: ["A-Z"], desc: this.t("hkCat") },
      { keys: ["A-Z"], desc: this.t("hkService"), context: true },
      { keys: [":"], desc: this.t("hkSearchEngines") },
      { keys: ["↑", "↓"], desc: this.t("hkNavigate") },
      { keys: ["ESC"], desc: this.t("hkReset") },
    );

    return html`
      <div
        @click="${() => this._handleClose()}"
        class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4"
      >
        <div
          class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative font-mono text-slate-300"
        >
          <div
            class="flex items-center justify-between mb-6 border-b border-slate-700 pb-3"
          >
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <jk-icon
                icon="keyboard"
                class="text-indigo-400 w-5 h-5"
              ></jk-icon>
              ${this.t("helpTitle")}
            </h3>
          </div>
          <div class="space-y-4">
            ${shortcuts.map(
              (item) => html`
                <div
                  class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-700/30"
                >
                  <span class="text-sm text-slate-400">${item.desc}</span>
                  <div class="flex items-center gap-1 shrink-0">
                    ${
                      item.context
                        ? html`<span
                            class="text-[10px] bg-slate-900 px-1 py-0.5 rounded text-indigo-400 mr-1 uppercase font-bold"
                            >${this.t("contextInCat")}</span
                          >`
                        : ""
                    }
                    ${item.keys.map(
                      (k) =>
                        html`<kbd
                          class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-indigo-400 shadow shadow-black/40"
                          >${k}</kbd
                        >`,
                    )}
                  </div>
                </div>
              `,
            )}
          </div>
          <div class="text-[11px] text-slate-500 text-center mt-6">
            ${this.t("helpExit")}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-help-modal", JkHelpModal);
