import { LitElement, html, css } from "lit";
import "./icon.js";

export class JkSearchModal extends LitElement {
  static properties = {
    show: { type: Boolean },
    searchQuery: { type: String },
    searchEngines: { type: Array },
    filteredServices: { type: Array },
    selectedIndex: { type: Number },
    t: { type: Function },
  };

  static styles = css`
    :host {
      display: block;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Modal Backdrop Overlay Layer */
    .backdrop {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: rgba(2, 6, 23, 0.85); /* bg-slate-950/85 */
      backdrop-filter: blur(4px); /* backdrop-blur-sm */
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 2rem; /* pt-8 */
      z-index: 50;
      animation: fadeIn 0.2s ease-out forwards;
    }

    /* Modal Layout Window Wrapper Box */
    .modal-box {
      background-color: #1e293b; /* bg-slate-800 */
      border: 1px solid #334155; /* border-slate-700 */
      width: 100%;
      max-width: 36rem; /* max-w-xl */
      border-radius: 1rem; /* rounded-2xl */
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
      overflow: hidden;
      margin-left: 1rem;
      margin-right: 1rem; /* mx-4 */
      display: flex;
      flex-direction: column;
      max-height: 80vh; /* max-h-[80vh] */
      box-sizing: border-box;
    }

    /* Top Search Input Header Bar Block */
    .search-header {
      padding: 1rem; /* p-4 */
      border-bottom: 1px solid #334155; /* border-b border-slate-700 */
      display: flex;
      align-items: center;
      gap: 0.75rem; /* gap-3 */
      flex-shrink: 0; /* shrink-0 */
    }

    .search-bar-icon {
      color: #94a3b8; /* text-slate-400 */
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .search-form {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    .search-input {
      background: transparent;
      width: 100%;
      border: none;
      outline: none;
      font-size: 1rem; /* text-base */
      color: #ffffff;
      font-family: inherit;
    }

    .search-input::placeholder {
      color: #64748b; /* placeholder-slate-500 */
    }

    /* Header Action Toolbar Buttons */
    .header-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem; /* p-2 */
      background-color: #1e293b; /* bg-slate-800 */
      border: 1px solid #334155; /* border-slate-700 */
      border-radius: 0.375rem; /* rounded-md */
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .header-btn:hover {
      background-color: #273549; /* hover:bg-slate-750 */
      border-color: #6366f1; /* hover:border-indigo-500 */
    }

    .header-btn-icon {
      display: block;
      width: 1.25rem;
      height: 1.25rem;
      color: #94a3b8; /* text-slate-400 */
      transition: color 0.15s ease;
    }

    .header-btn:hover .header-btn-icon {
      color: #818cf8; /* group-hover:text-indigo-400 */
    }

    /* Result Scrollable Results Block list container */
    .results-list {
      overflow-y: auto;
      padding: 0.5rem; /* p-2 */
      display: flex;
      flex-direction: column;
      gap: 0.25rem; /* space-y-1 */
      flex-grow: 1; /* grow */
    }

    .group-heading {
      padding: 0.375rem 0.5rem; /* py-1.5 px-2 */
      font-size: 0.75rem; /* text-xs */
      font-weight: 600;
      color: #94a3b8; /* text-slate-400 */
      text-transform: uppercase; /* uppercase */
      letter-spacing: 0.05em; /* tracking-wider */
      margin-bottom: 0.25rem; /* mb-1 */
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Generic Layout Core Shared list Item Push-Buttons */
    .list-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem; /* p-3 */
      border-radius: 0.75rem; /* rounded-xl */
      text-align: left;
      border: none;
      background: transparent;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
      box-sizing: border-box;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 0.75rem; /* gap-3 */
      min-w: 0;
    }

    .item-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      transition: color 0.15s ease;
    }

    .icon-indigo {
      color: #818cf8;
    }
    .icon-white {
      color: #ffffff;
    }

    /* 1. Engine Item Layout Rules */
    .engine-item {
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      color: #cbd5e1;
    }
    .engine-item:hover {
      background-color: rgba(51, 65, 85, 0.4);
    }
    .engine-name {
      font-weight: 700;
      color: #ffffff;
    }
    .engine-url {
      font-size: 0.75rem;
      margin-left: 0.5rem;
      color: #64748b;
    }

    /* Active Modifiers for Engines and Services */
    .active-row {
      color: #ffffff !important;
    }
    .active-row .engine-url {
      color: #c7d2fe !important;
    }
    .active-row .item-icon {
      color: #ffffff !important;
    }

    /* 2. Command Preview Card Window Layout Block */
    .preview-card {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem; /* p-4 */
      border-radius: 0.75rem; /* rounded-xl */
      border: 1px solid #6366f1; /* border-indigo-500 */
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      text-align: left;
      transition: all 0.15s ease;
      margin-bottom: 0.75rem; /* mb-3 */
      cursor: pointer;
      box-sizing: border-box;
    }
    .preview-card:active {
      transform: scale(0.98);
    }
    .preview-text {
      font-size: 0.75rem; /* text-xs */
      color: #e2e8f0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap; /* truncate */
    }
    .preview-target {
      font-weight: 700;
      color: #ffffff;
    }
    .preview-query {
      font-style: italic;
      color: #a5b4fc;
    }
    .preview-query-active {
      color: #e0e7ff;
    }

    /* 3. Base Service Item Layout Block */
    .service-item {
      color: #cbd5e1;
    }
    .service-item:hover {
      background-color: rgba(51, 65, 85, 0.3);
    }
    .service-item:active {
      background-color: #4f46e5;
      color: #ffffff;
    }
    .service-icon {
      width: 1.5rem;
      height: 1.5rem;
    }
    .service-name {
      font-weight: 500;
      display: block;
    }
    .service-cat {
      font-size: 0.75rem;
      opacity: 0.6;
    }

    /* Pill-style Action Badges */
    .badge-kbd {
      padding: 0.125rem 0.5rem; /* py-0.5 px-2 */
      font-size: 0.875rem; /* text-base map down */
      font-weight: 700;
      border-radius: 0.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .badge-kbd-inactive {
      background-color: #0f172a;
      border: 1px solid #334155;
      color: #818cf8;
    }
    .badge-kbd-active {
      background-color: #4338ca;
      color: #ffffff;
      border: 1px solid #6366f1;
    }

    .badge-enter {
      font-size: 0.75rem;
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      background-color: #4338ca;
      color: #ffffff;
      display: none;
    }

    /* Empty Fallback Subtext Info */
    .no-results {
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
      padding: 1rem 0;
    }

    /* Breakpoint Responsive Enhancements mapping 'sm' overrides */
    @media (min-width: 640px) {
      .backdrop {
        padding-top: 6rem; /* pt-24 */
      }
      .search-input {
        font-size: 1.125rem; /* sm:text-lg */
      }
      .preview-text {
        font-size: 0.875rem; /* sm:text-sm */
      }
      .preview-break {
        display: none;
      }
      .service-name {
        display: inline;
      }
      .service-cat {
        margin-left: 0.25rem; /* sm:ml-1 */
      }

      /* Active state row desktop backdrops mimicking sm:bg-indigo-600 logic */
      .active-row {
        background-color: #4f46e5 !important;
      }
      .badge-enter {
        display: inline;
      }
    }
  `;

  constructor() {
    super();
    this.show = false;
    this.searchQuery = "";
    this.searchEngines = [];
    this.filteredServices = [];
    this.selectedIndex = 0;
  }

  async updated(changedProperties) {
    super.updated(changedProperties);

    // Automatically focus the input as soon as the modal is opened
    if (changedProperties.has("show") && this.show) {
      await this.updateComplete;
      this.shadowRoot.querySelector("#searchInput")?.focus();
    }
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

  async _selectEngine(prefix) {
    this.dispatchEvent(
      new CustomEvent("search-change", {
        detail: { value: `:${prefix} ` },
        bubbles: true,
        composed: true,
      }),
    );

    // Wait until Lit updates the shadow root DOM layout tree
    await this.updateComplete;
    this.shadowRoot.querySelector("#searchInput")?.focus();
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

  _renderEngine(engine, active) {
    return html`
      <button
        @click="${() => this._selectEngine(engine.prefix)}"
        class="list-item engine-item ${active ? "active-row" : ""}"
      >
        <div class="item-left">
          <jk-icon
            .icon=${engine.icon}
            class="item-icon ${active ? "icon-white" : "icon-indigo"}"
          ></jk-icon>
          <div>
            <span class="engine-name">${engine.name}</span>
            <span class="engine-url">(${engine.url})</span>
          </div>
        </div>
        <kbd
          class="badge-kbd ${active ? "badge-kbd-active" : "badge-kbd-inactive"}"
        >
          :${engine.prefix}
        </kbd>
      </button>
    `;
  }

  _renderPreview(matchedEngine, searchTermsPreview, active) {
    return html`
      <button
        @click="${() => {
          const finalUrl = matchedEngine.url.replace(
            "%s",
            encodeURIComponent(searchTermsPreview.trim()),
          );
          window.open(finalUrl, "_blank");
          this._handleClose();
        }}"
        class="preview-card ${active ? "active-row" : ""}"
        style="${active ? "background-color: #4f46e5;" : "background-color: rgba(79, 70, 229, 0.2);"}"
      >
        <div class="item-left grow">
          <jk-icon
            .icon=${matchedEngine.icon}
            class="item-icon ${active ? "icon-white" : "icon-indigo"}"
            style="width: 1.5rem; height: 1.5rem;"
          ></jk-icon>
          <div class="preview-text">
            ${this.t("searchEnginePreviewPrefix")}
            <span class="preview-target">${matchedEngine.name}</span>
            ${this.t("searchEnginePreviewFor")}:
            <br class="preview-break" />
            <span class="preview-query ${active ? "preview-query-active" : ""}">
              ${searchTermsPreview.trim() ? html`"${searchTermsPreview.trim()}"` : html`...`}
            </span>
          </div>
        </div>
        <span class="badge-enter">Enter</span>
      </button>
    `;
  }

  _renderService(s, active) {
    return html`
      <button
        @click=${() => this._triggerServiceClick(s)}
        class="list-item service-item ${active ? "active-row" : ""}"
      >
        <div class="item-left">
          <jk-icon .icon=${s.icon} class="service-icon"></jk-icon>
          <div>
            <span class="service-name">${s.name}</span>
            <span class="service-cat">(${s.category})</span>
          </div>
        </div>
        ${active ? html`<span class="badge-enter">Enter</span>` : ""}
      </button>
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
      <div @click="${this._handleClose}" class="backdrop">
        <div @click="${(e) => e.stopPropagation()}" class="modal-box">
          <div class="search-header">
            <jk-icon icon="search" class="search-bar-icon"></jk-icon>
            <form @submit="${this._handleSubmit}" class="search-form">
              <input
                id="searchInput"
                type="text"
                inputmode="search"
                enterkeyhint="search"
                placeholder="${this.t("searchPlaceholder")}"
                .value="${this.searchQuery}"
                @input="${this._handleInput}"
                class="search-input"
              />
            </form>

            ${
              showQuickTrigger
                ? html`
                    <button
                      @click="${() => this._selectEngine("")}"
                      class="header-btn"
                      title="${this.t("searchEnginesShow")}"
                    >
                      <jk-icon icon="globe" class="header-btn-icon"></jk-icon>
                    </button>
                  `
                : ""
            }

            <button @click="${this._handleClose}" class="header-btn">
              <jk-icon icon="x" class="header-btn-icon"></jk-icon>
            </button>
          </div>

          <div class="results-list">
            ${
              (showAllEngines || isFilteringEngines) && items.length > 0
                ? html`<div class="group-heading">
                    ${this.t("searchEnginesTitle")}
                  </div>`
                : ""
            }
            ${items.map((item, i) => item.render(i === this.selectedIndex))}
            ${
              this.searchQuery && items.length === 0
                ? html`<p class="no-results">${this.t("noServices")}</p>`
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-search-modal", JkSearchModal);
