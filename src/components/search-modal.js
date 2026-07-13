import { LitElement, html } from "lit";
import "./icon.js";
import "./jk-icon-button.js";
import "./jk-search-item.js";

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

  // --- Specialized Micro-Renderers ---

  // --- Extrem schlanke Datenweitergabe im Modal ---

  _renderEngine(engine, active) {
    return html`
      <jk-search-item
        type="engine"
        .active=${active}
        .data=${engine}
        @click="${() => this._selectEngine(engine.prefix)}"
      ></jk-search-item>
    `;
  }

  _renderPreview(matchedEngine, searchTermsPreview, active) {
    // Wir erweitern das Engine-Objekt temporär um die aktuellen Suchbegriffe für die Komponente
    const previewData = { ...matchedEngine, searchTerms: searchTermsPreview };

    return html`
      <jk-search-item
        type="preview"
        .active=${active}
        .data=${previewData}
        .t=${this.t}
        @click="${() => {
          const finalUrl = matchedEngine.url.replace(
            "%s",
            encodeURIComponent(searchTermsPreview.trim()),
          );
          window.open(finalUrl, "_blank");
          this._handleClose();
        }}"
      ></jk-search-item>
    `;
  }

  _renderService(s, active) {
    return html`
      <jk-search-item
        type="service"
        .active=${active}
        .data=${s}
        @click=${() => this._triggerServiceClick(s)}
      ></jk-search-item>
    `;
  }

  _buildItems() {
    const queryTrimmed = this.searchQuery.trim();
    let matchedEngine = null;
    let searchTermsPreview = "";
    let candidateEngines = [];
    let isFilteringEngines = false;
    let showPreviewBlock = false;

    if (this.searchQuery.startsWith(":")) {
      const commandString = this.searchQuery.substring(1);
      const firstSpaceIndex = commandString.indexOf(" ");

      if (firstSpaceIndex !== -1) {
        const prefix = commandString
          .substring(0, firstSpaceIndex)
          .toLowerCase();
        searchTermsPreview = commandString.substring(firstSpaceIndex + 1);
        matchedEngine = this.searchEngines.find(
          (e) => e.prefix.toLowerCase() === prefix,
        );
        if (matchedEngine) showPreviewBlock = true;
      } else {
        isFilteringEngines = true;
        const currentPrefixToken = commandString.toLowerCase();
        candidateEngines = this.searchEngines.filter((e) =>
          e.prefix.toLowerCase().startsWith(currentPrefixToken),
        );
      }
    }

    const showAllEngines = queryTrimmed === ":";
    const enginesToRender = showAllEngines
      ? this.searchEngines
      : isFilteringEngines
        ? candidateEngines
        : [];

    const items = [];

    enginesToRender.forEach((engine) => {
      items.push({
        isEngineHeadingGroup: true,
        render: (active) => this._renderEngine(engine, active),
      });
    });

    if (showPreviewBlock) {
      items.push({
        render: (active) =>
          this._renderPreview(matchedEngine, searchTermsPreview, active),
      });
    }

    if (!showAllEngines) {
      this.filteredServices.forEach((service) => {
        items.push({
          render: (active) => this._renderService(service, active),
        });
      });
    }

    return { items, showAllEngines, isFilteringEngines };
  }

  render() {
    if (!this.show) return html``;

    const queryTrimmed = this.searchQuery.trim();
    const showQuickTrigger = queryTrimmed === "";

    const { items, showAllEngines, isFilteringEngines } = this._buildItems();

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
                    <jk-icon-button
                      icon="globe"
                      @click="${() => this._selectEngine("")}"
                    ></jk-icon-button>
                  `
                : ""
            }

            <jk-icon-button
              icon="x"
              @click="${this._handleClose}"
            ></jk-icon-button>
          </div>

          <div class="overflow-y-auto p-2 space-y-1 grow">
            ${
              (showAllEngines || isFilteringEngines) && items.length > 0
                ? html`
                    <div
                      class="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono"
                    >
                      ${this.t("searchEnginesTitle")}
                    </div>
                  `
                : ""
            }
            ${items.map((item, i) => item.render(i === this.selectedIndex))}
            ${
              this.searchQuery && items.length === 0
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
