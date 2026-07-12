import { LitElement, html } from "lit";
import "./icon.js";

export class JkSearchModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    show: { type: Boolean },
    searchQuery: { type: String },
    searchEngines: { type: Array },
    filteredServices: { type: Array },
    selectedIndex: { type: Number },
    t: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.searchQuery = "";
    this.searchEngines = [];
    this.filteredServices = [];
    this.selectedIndex = 0;
  }

  _handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  _handleInput(e) {
    this.dispatchEvent(
      new CustomEvent("search-change", {
        detail: { value: e.target.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _selectEngine(prefix) {
    this.dispatchEvent(
      new CustomEvent("search-change", {
        detail: { value: `:${prefix} ` },
        bubbles: true,
        composed: true,
      }),
    );
    setTimeout(() => this.querySelector("#searchInput")?.focus(), 10);
  }

  _triggerServiceClick(service) {
    this.dispatchEvent(
      new CustomEvent("service-click", {
        detail: { service },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _handleSubmit(e) {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent("execute-submit", { bubbles: true, composed: true }),
    );
  }

  render() {
    if (!this.show) return html``;

    const queryTrimmed = this.searchQuery.trim();
    let matchedEngine = null;
    let searchTermsPreview = "";

    if (queryTrimmed.startsWith(":")) {
      const commandString = queryTrimmed.substring(1).trim();
      const firstSpaceIndex = commandString.indexOf(" ");
      const prefix =
        firstSpaceIndex !== -1
          ? commandString.substring(0, firstSpaceIndex)
          : commandString;
      searchTermsPreview =
        firstSpaceIndex !== -1
          ? commandString.substring(firstSpaceIndex + 1).trim()
          : "";
      matchedEngine = this.searchEngines.find(
        (e) => e.prefix.toLowerCase() === prefix.toLowerCase(),
      );
    }

    const showAllEngines = queryTrimmed === ":";
    const showQuickTrigger = queryTrimmed === "";

    return html`
      <div
        @click="${this._handleClose}"
        class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-24 z-50 animate-fadeIn"
      >
        <div
          @click="${(e) => e.stopPropagation()}"
          class="bg-slate-800 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden mx-4 flex flex-col max-h-[80vh]"
        >
          <div
            class="p-4 border-b border-slate-700 flex items-center gap-3 shrink-0"
          >
            <jk-icon icon="search" class="text-slate-400 w-5 h-5"></jk-icon>
            <form @submit="${this._handleSubmit}" class="w-full m-0 p-0">
              <input
                id="searchInput"
                type="text"
                inputmode="search"
                enterkeyhint="search"
                placeholder="${this.t("searchPlaceholder")}"
                .value="${this.searchQuery}"
                @input="${this._handleInput}"
                class="bg-transparent w-full focus:outline-none text-base sm:text-lg text-white placeholder-slate-500"
              />
            </form>

            ${
              showQuickTrigger
                ? html`
                    <button
                      @click="${() => this._selectEngine("")}"
                      class="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-md cursor-pointer transition-all duration-150 shrink-0 group shadow-md"
                      title="${this.t("searchEnginesShow")}"
                    >
                      <jk-icon
                        icon="globe"
                        class="block w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors"
                      ></jk-icon>
                      <kbd
                        class="px-2 py-0.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-indigo-400 rounded shadow shadow-black/40 group-hover:text-indigo-300 hidden md:block ml-2"
                        >:</kbd
                      >
                    </button>
                  `
                : ""
            }

            <button
              @click="${this._handleClose}"
              class="flex items-center justify-center p-2 bg-slate-850 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-md cursor-pointer transition-all duration-150 shrink-0 group shadow-md"
            >
              <jk-icon
                icon="x"
                class="block w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors"
              ></jk-icon>
            </button>
          </div>

          <div class="overflow-y-auto p-2 space-y-1 grow">
            ${
              showAllEngines
                ? html`
                    <div
                      class="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono"
                    >
                      ${this.t("searchEnginesTitle")}
                    </div>
                    ${this.searchEngines.map(
                      (engine, i) => html`
                        <button
                          @click="${() => this._selectEngine(engine.prefix)}"
                          class="w-full flex items-center justify-between p-3 rounded-xl font-mono text-sm text-left transition-colors ${i === this.selectedIndex ? "search-item-active sm:bg-indigo-600 text-white" : "hover:bg-slate-700/40 text-slate-300"}"
                        >
                          <div class="flex items-center gap-3">
                            <jk-icon
                              .icon=${engine.icon}
                              class="${"w-5 h-5 " + (i === this.selectedIndex ? "text-white" : "text-indigo-400")}"
                            ></jk-icon>
                            <div>
                              <span class="font-bold text-white"
                                >${engine.name}</span
                              >
                              <span
                                class="text-xs ml-2 ${i === this.selectedIndex ? "text-indigo-200" : "text-slate-500"}"
                                >(${engine.url})</span
                              >
                            </div>
                          </div>
                          <kbd
                            class="px-2 py-0.5 text-base font-bold rounded shadow ${i === this.selectedIndex ? "bg-indigo-700 text-white border-indigo-500" : "bg-slate-900 border border-slate-700 text-indigo-400"}"
                            >:${engine.prefix}</kbd
                          >
                        </button>
                      `,
                    )}
                  `
                : ""
            }
            ${
              matchedEngine && !showAllEngines && searchTermsPreview
                ? html`
                    <button
                      @click="${() => {
                        const finalUrl = matchedEngine.url.replace(
                          "%s",
                          encodeURIComponent(searchTermsPreview),
                        );
                        window.open(finalUrl, "_blank");
                        this._handleClose();
                      }}"
                      class="w-full flex items-center justify-between p-4 rounded-xl border font-mono text-sm text-left active:scale-[0.98] transition-all mb-3 ${this.selectedIndex === 0 ? "search-item-active bg-indigo-600 border-indigo-500 text-white" : "bg-indigo-600/20 border-indigo-500 text-slate-200"}"
                    >
                      <div class="flex items-center gap-3 min-w-0 grow">
                        <jk-icon
                          .icon=${matchedEngine.icon}
                          class="${"w-6 h-6 shrink-0 " + (this.selectedIndex === 0 ? "text-white" : "text-indigo-400")}"
                        ></jk-icon>
                        <div class="truncate text-xs sm:text-sm">
                          ${this.t("searchEnginePreviewPrefix")}
                          <span class="font-bold text-white"
                            >${matchedEngine.name}</span
                          >
                          ${this.t("searchEnginePreviewFor")}:
                          <br class="sm:hidden" />
                          <span
                            class="italic ${this.selectedIndex === 0 ? "text-indigo-100" : "text-indigo-300"}"
                            >"${searchTermsPreview}"</span
                          >
                        </div>
                      </div>
                      <span
                        class="text-xs font-mono px-2 py-0.5 rounded shadow text-white hidden sm:inline ${this.selectedIndex === 0 ? "bg-indigo-700" : "bg-indigo-600"}"
                        >Enter</span
                      >
                    </button>
                  `
                : ""
            }
            ${
              !showAllEngines
                ? this.filteredServices.map((s, i) => {
                    const targetIndex =
                      matchedEngine && searchTermsPreview ? i + 1 : i;
                    const isActive = targetIndex === this.selectedIndex;

                    return html`
                      <button
                        @click="${() => this._triggerServiceClick(s)}"
                        class="w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${isActive ? "search-item-active sm:bg-indigo-600 text-white" : "hover:bg-slate-700/30 text-slate-300"} active:bg-indigo-600 active:text-white"
                      >
                        <div class="flex items-center gap-3">
                          <jk-icon .icon=${s.icon} class="w-6 h-6"></jk-icon>
                          <div>
                            <span class="font-medium block sm:inline"
                              >${s.name}</span
                            >
                            <span class="text-xs opacity-60 sm:ml-1"
                              >(${s.category})</span
                            >
                          </div>
                        </div>
                        ${isActive ? html`<span class="text-xs font-mono bg-indigo-700 px-2 py-0.5 rounded shadow hidden sm:inline">Enter</span>` : ""}
                      </button>
                    `;
                  })
                : ""
            }
            ${
              this.searchQuery &&
              this.filteredServices.length === 0 &&
              !matchedEngine &&
              !showAllEngines
                ? html`<p class="text-center text-slate-500 text-sm py-4">
                    ${this.t("noServices")}
                  </p>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-search-modal", JkSearchModal);
