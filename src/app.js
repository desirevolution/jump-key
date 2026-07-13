import { LitElement, html, css } from "lit";
import { createIcons, icons } from "lucide";
import { t, detectLang } from "./utils/i18n.js";
import {
  generateShortcuts,
  getFilteredServices,
  getTopFavorites,
} from "./utils/shortcuts.js";

import "./components/dashboard-header.js";
import "./components/config-modal.js";
import "./components/search-modal.js";
import "./components/service-card.js";
import "./components/help-modal.js";
import "./components/icon.js";

class DashboardApp extends LitElement {
  static properties = {
    categories: { type: Array },
    searchEngines: { type: Array },
    showConfigModal: { type: Boolean },
    activeCategoryKey: { type: String },
    currentInput: { type: String },
    isInvalidInput: { type: Boolean },
    isValidInput: { type: Boolean },
    searchQuery: { type: String },
    showSearch: { type: Boolean },
    showHelp: { type: Boolean },
    isGridView: { type: Boolean },
    selectedIndex: { type: Number },
    favorites: { type: Object },
    lang: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      box-sizing: border-box;
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
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes bounce {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }

    /* Headings Layout Utilities */
    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8; /* text-slate-400 */
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0;
      margin-bottom: 0.75rem; /* Clean, explicit spacing directly under label */
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Flex Grid layouts wrapper system */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    /* Standardized stacked group layouts to prevent layout cascading margin bugs */
    .section-container {
      margin-bottom: 2rem;
    }
    .section-container:last-child {
      margin-bottom: 0;
    }

    .category-group-row {
      border-bottom: 1px solid rgba(30, 41, 59, 0.4);
      padding-bottom: 1.25rem;
      margin-bottom: 1.25rem;
    }
    .category-group-row:last-child {
      border: 0;
      margin-bottom: 0;
    }

    .category-header-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    /* Kbd Layout Badges */
    .key-badge-kbd {
      padding: 0.125rem 0.5rem;
      font-weight: 700;
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: #818cf8;
      background-color: #0f172a;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 0.25rem;
      display: none;
    }

    /* Color Inheritance Injectors for Custom Elements */
    .icon-amber {
      color: #f59e0b;
      --icon-color: #f59e0b;
    }
    .icon-blue {
      color: #3b82f6;
      --icon-color: #3b82f6;
    }
    .icon-indigo {
      color: #818cf8;
      --icon-color: #818cf8;
    }

    /* Input Floating State Sequence Indicator Box overlay */
    .floating-sequence-badge {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid transparent;
      z-index: 50;
      display: none;
      transition: all 0.15s ease;
    }

    .seq-pulse {
      background-color: #4f46e5;
      color: #ffffff;
      border-color: #818cf8;
      animation:
        fadeIn 0.15s ease-out,
        pulse 2s infinite ease-in-out;
    }
    .seq-bounce {
      background-color: #e11d48;
      color: #ffffff;
      border-color: #fb7185;
      animation:
        fadeIn 0.15s ease-out,
        bounce 0.5s ease infinite;
    }
    .seq-success {
      background-color: #059669;
      color: #ffffff;
      border-color: #34d399;
      transform: scale(1.05);
      box-shadow: 0 20px 25px -5px rgba(6, 78, 59, 0.5);
    }

    @media (min-width: 640px) {
      .section-title {
        font-size: 0.875rem;
        margin-bottom: 1rem;
      }
      .cards-grid {
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1rem;
      }
      .key-badge-kbd {
        display: block;
      }
      .floating-sequence-badge {
        display: block;
      }
      .section-container {
        margin-bottom: 2.5rem;
      }
    }

    /* Universal Icon Sizing Framework (replacing w-4 h-4) */
    .w-4 {
      width: 1rem;
    }
    .h-4 {
      height: 1rem;
    }

    /* Make sure custom components preserve inline flex layouts for their inner content boxes */
    jk-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
    }

    /* Target Injected Icon Colors */
    .icon-amber {
      color: var(--color-amber);
      --icon-color: var(--color-amber);
    }
    .icon-blue {
      color: var(--color-blue);
      --icon-color: var(--color-blue);
    }
    .icon-indigo {
      color: var(--color-indigo);
      --icon-color: var(--color-indigo);
    }

    /* Ensure title rows align things cleanly */
    .category-header-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
  `;

  constructor() {
    super();
    this.categories = [];
    this.searchEngines = [];
    this.showConfigModal = false;
    this.isEditorConfigValid = true;
    this.activeCategoryKey = "";
    this.currentInput = "";
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.searchQuery = "";
    this.showSearch = false;
    this.showHelp = false;
    this.isGridView =
      JSON.parse(localStorage.getItem("dashboard_grid_view")) || false;
    this.selectedIndex = 0;
    this.favorites = JSON.parse(localStorage.getItem("dashboard_favs")) || {};
    this.resetTimeout = null;
    this.lang = detectLang();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.originalConfigString = "";
    this.hasEditorConfigChanged = false;
  }

  t(key) {
    return t(this.lang, key);
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      const res = await fetch("./config/services.json");
      const data = await res.json();
      localStorage.setItem("services-cache", JSON.stringify(data));
      this.categories = generateShortcuts(data.categories || data);
      this.searchEngines = data.searchEngines || [];
    } catch {
      const cached = localStorage.getItem("services-cache");
      if (cached) {
        const data = JSON.parse(cached);
        this.categories = generateShortcuts(data.categories || data);
        this.searchEngines = data.searchEngines || [];
      }
    }

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("popstate", this.handlePopState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("popstate", this.handlePopState);
  }

  resetInput(updateHistory = true) {
    this.activeCategoryKey = "";
    this.currentInput = "";
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.showSearch = false;
    this.showHelp = false;
    this.searchQuery = "";
    this.selectedIndex = 0;

    if (updateHistory) {
      if (
        window.history.state?.view === "category" ||
        window.history.state?.view === "search"
      ) {
        window.history.back();
      }
    }
  }

  toggleViewMode() {
    this.isGridView = !this.isGridView;
    localStorage.setItem(
      "dashboard_grid_view",
      JSON.stringify(this.isGridView),
    );
    this.resetInput(true);
  }

  startResetTimer(duration = 3000) {
    clearTimeout(this.resetTimeout);
    this.resetTimeout = setTimeout(() => this.resetInput(), duration);
  }

  trackClick(service, isFavClick = false) {
    if (!isFavClick) {
      this.favorites[service.name] = (this.favorites[service.name] || 0) + 1;
      localStorage.setItem("dashboard_favs", JSON.stringify(this.favorites));
    }
    this.isValidInput = true;
    this.requestUpdate();
    setTimeout(() => {
      window.open(service.url, "_blank");
      setTimeout(() => this.resetInput(true), 100);
    }, 150);
  }

  clearFavorites() {
    if (confirm(this.t("confirmReset"))) {
      this.favorites = {};
      localStorage.removeItem("dashboard_favs");
      this.requestUpdate();
    }
  }

  handlePopState(e) {
    if (!e.state?.view) {
      this.resetInput(false);
    } else if (e.state.view === "category") {
      this.activeCategoryKey = e.state.key;
      this.showSearch = false;
    }
  }

  openSearch() {
    this.showHelp = false;
    this.showSearch = true;
    this.selectedIndex = 0;
    window.history.pushState({ view: "search" }, "");
  }

  handleKeyDown(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === "Escape") {
      if (this.showConfigModal) {
        this.showConfigModal = false;
        return;
      }
      this.resetInput(true);
      return;
    }

    if (this.showConfigModal) return;

    if (this.showSearch) {
      this.handleSearchKeyDown(e);
      return;
    }

    if (this.showHelp) {
      e.preventDefault();
      this.showHelp = false;
      return;
    }

    // Access active elements inside active node boundaries using composedPath
    const activeElement = e.composedPath()[0];
    if (
      activeElement?.tagName === "INPUT" ||
      activeElement?.tagName === "TEXTAREA"
    )
      return;

    if (e.key === "?") {
      e.preventDefault();
      this.showHelp = true;
      return;
    }
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      this.openSearch();
      return;
    }
    if (e.key.toLowerCase() === "#" && !this.activeCategoryKey) {
      e.preventDefault();
      this.toggleViewMode();
      return;
    }

    if (e.key.length === 1) {
      this.handleNavigationKeyDown(e.key.toLowerCase());
    }
  }

  handleSearchKeyDown(e) {
    const filtered = getFilteredServices(this.categories, this.searchQuery);
    const queryTrimmed = this.searchQuery.trim();
    const showAllEngines = queryTrimmed === ":";

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
          (eng) => eng.prefix.toLowerCase() === prefix,
        );
        if (matchedEngine) showPreviewBlock = true;
      } else {
        isFilteringEngines = true;
        const currentPrefixToken = commandString.toLowerCase();
        candidateEngines = this.searchEngines.filter((eng) =>
          eng.prefix.toLowerCase().startsWith(currentPrefixToken),
        );
      }
    }

    const enginesToRender = showAllEngines
      ? this.searchEngines
      : isFilteringEngines
        ? candidateEngines
        : [];
    const items = [];

    enginesToRender.forEach((engine) => {
      items.push({
        action: () => {
          this.searchQuery = `:${engine.prefix} `;
        },
      });
    });

    if (showPreviewBlock) {
      items.push({
        action: () => {
          const finalUrl = matchedEngine.url.replace(
            "%s",
            encodeURIComponent(searchTermsPreview.trim()),
          );
          window.open(finalUrl, "_blank");
          this.resetInput(true);
        },
      });
    }

    if (!showAllEngines) {
      filtered.forEach((service) => {
        items.push({ action: () => this.trackClick(service) });
      });
    }

    const totalItems = items.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalItems > 0)
        this.selectedIndex = (this.selectedIndex + 1) % totalItems;
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems > 0)
        this.selectedIndex = (this.selectedIndex - 1 + totalItems) % totalItems;
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[this.selectedIndex];
      if (item) item.action();
    }
  }

  handleNavigationKeyDown(key) {
    if (!this.activeCategoryKey) {
      if (/^[0-9]$/.test(key) && !this.isGridView) {
        const favService = getTopFavorites(
          this.categories,
          this.favorites,
        ).find((s) => s.key === key);
        if (favService) {
          this.currentInput = key.toUpperCase();
          this.trackClick(favService, true);
          return;
        }
      }

      if (this.categories.some((c) => c.categoryKey === key)) {
        this.activeCategoryKey = key;
        this.currentInput = key.toUpperCase();
        this.isInvalidInput = false;
        this.startResetTimer();
        window.history.pushState({ view: "category", key }, "");
      } else {
        this.currentInput = key.toUpperCase();
        this.isInvalidInput = true;
        this.startResetTimer(1500);
      }
      return;
    }

    this.currentInput += ` → ${key.toUpperCase()}`;
    const cat = this.categories.find(
      (c) => c.categoryKey === this.activeCategoryKey,
    );
    const service = cat?.services?.find((s) => s.key === key);

    if (service) {
      this.isInvalidInput = false;
      this.trackClick(service);
    } else {
      this.isInvalidInput = true;
      this.startResetTimer(1500);
    }
  }

  async saveConfiguration(updatedConfig) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupResponse = await fetch(
        `/config/services.backup-${timestamp}.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedConfig),
        },
      );

      if (!backupResponse.ok) throw new Error("Backup failed");

      const response = await fetch("/config/services.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (response.ok) {
        this.categories = generateShortcuts(
          updatedConfig.categories || updatedConfig,
        );
        if (updatedConfig.searchEngines)
          this.searchEngines = updatedConfig.searchEngines;
        this.showConfigModal = false;
        alert(this.t("editConfigSaveDone"));
      } else {
        alert(this.t("editConfigSaveFailed"));
      }
    } catch (error) {
      console.error(error);
      alert(this.t("editConfigSaveFailed"));
    }
  }

  renderIcon(icon, extraClass = "w-6 h-6") {
    if (!icon)
      return html`<jk-icon icon="help-circle" class="${extraClass}"></jk-icon>`;
    if (/\.(png|jpe?g|svg|webp)$/i.test(icon)) {
      return html`
        <img
          src="./icons/${icon}"
          alt=""
          class="${extraClass} object-contain"
          @error="${(e) => {
            e.target.style.display = "none";
            e.target.nextElementSibling.style.display = "block";
          }}"
        />
        <jk-icon icon="globe" class="${extraClass} hidden"></jk-icon>
      `;
    }
    return html`<jk-icon icon="${icon}" class="${extraClass}"></jk-icon>`;
  }

  templateConfigModal() {
    return html`
      <jk-config-modal
        .show=${this.showConfigModal}
        .categories=${this.categories}
        .searchEngines=${this.searchEngines}
        .t=${(key) => this.t(key)}
        @close=${() => (this.showConfigModal = false)}
        @save=${(e) => this.saveConfiguration(e.detail.config)}
      ></jk-config-modal>
    `;
  }

  templateHelpModal() {
    return html`
      <jk-help-modal
        .show=${this.showHelp}
        .isGridView=${this.isGridView}
        .t=${(key) => this.t(key)}
        @close=${() => (this.showHelp = false)}
      ></jk-help-modal>
    `;
  }

  templateKeyBadge() {
    if (!this.currentInput || this.showSearch || this.showHelp) return "";
    const stateClass = this.isInvalidInput
      ? "seq-bounce"
      : this.isValidInput
        ? "seq-success"
        : "seq-pulse";
    return html`
      <div class="floating-sequence-badge ${stateClass}">
        ${this.currentInput}
      </div>
    `;
  }

  templateSearchModal(filteredServices) {
    return html`
      <jk-search-modal
        .show=${this.showSearch}
        .searchQuery=${this.searchQuery}
        .searchEngines=${this.searchEngines}
        .filteredServices=${filteredServices}
        .selectedIndex=${this.selectedIndex}
        .t=${(key) => this.t(key)}
        @close=${() => this.resetInput(true)}
        @search-change=${(e) => {
          this.searchQuery = e.detail.value;
          this.selectedIndex = 0;
        }}
        @service-click=${(e) => this.trackClick(e.detail.service)}
        @execute-submit=${() => {
          this.handleSearchKeyDown({
            key: "Enter",
            preventDefault: () => {},
          });
        }}
      ></jk-search-modal>
    `;
  }

  templateFavorites(favs) {
    if (favs.length === 0) return html``;
    return html`
      <div class="section-container">
        <h2 class="section-title">
          <jk-icon
            icon="star"
            class="icon-amber w-4 h-4"
            style="fill: rgba(251,191,36,0.2);"
          ></jk-icon>
          ${this.t("frequent")}
        </h2>
        <div class="cards-grid">
          ${favs.map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${service.key}
                .renderIcon=${(icon, cls) => this.renderIcon(icon, cls)}
                @card-click=${() => this.trackClick(service)}
              ></jk-service-card>
            `,
          )}
        </div>
      </div>
    `;
  }

  templateCategoriesList() {
    return html`
      <div class="section-container">
        <h2 class="section-title">
          <jk-icon icon="folder" class="icon-blue w-4 h-4"></jk-icon>
          ${this.t("categories")}
        </h2>
        <div class="cards-grid">
          ${this.categories.map(
            (cat) => html`
              <jk-service-card
                .name=${cat.category}
                .subtitle=${`${cat.services?.length ?? 0} Services`}
                .icon=${cat.icon}
                .badgeText=${cat.categoryKey}
                .renderIcon=${(icon, cls) => this.renderIcon(icon, cls)}
                @card-click=${() => (this.activeCategoryKey = cat.categoryKey)}
              ></jk-service-card>
            `,
          )}
        </div>
      </div>
    `;
  }

  templateFullGridView() {
    return html`
      <div class="animate-fadeIn space-y-5">
        ${this.categories.map(
          (cat) => html`
            <div class="category-group-row">
              <div class="category-header-bar">
                <kbd class="key-badge-kbd">
                  ${cat.categoryKey?.toUpperCase() ?? ""}
                </kbd>
                <jk-icon
                  .icon="${cat.icon}"
                  class="icon-blue w-4 h-4"
                  style="opacity: 0.8;"
                ></jk-icon>
                <h2 class="section-title" style="margin: 0;">
                  ${cat.category}
                </h2>
              </div>
              <div class="cards-grid">
                ${(cat.services ?? []).map(
                (service) => html`
                  <jk-service-card
                    .name=${service.name}
                    .subtitle=${service.url}
                    .icon=${service.icon}
                    .badgeText=${service.key}
                    .renderIcon=${(icon, cls) => this.renderIcon(icon, cls)}
                    @card-click=${() => this.trackClick(service)}
                  ></jk-service-card>
                `,
              )}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  templateServicesGrid(activeGroup) {
    if (!activeGroup) return html``;
    return html`
      <div class="category-header-bar">
        <kbd class="key-badge-kbd">
          ${activeGroup.categoryKey?.toUpperCase() ?? ""}
        </kbd>
        <jk-icon
          .icon="${activeGroup.icon}"
          class="w-4 h-4 text-indigo-400"
          style="opacity: 0.8;"
        ></jk-icon>
        <h2 class="section-title" style="margin: 0;">
          ${activeGroup.category}
        </h2>
      </div>
      <div class="animate-fadeIn space-y-6">
        <div class="cards-grid">
          ${activeGroup.services.map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${service.key}
                .renderIcon=${(icon, cls) => this.renderIcon(icon, cls)}
                @card-click=${() => this.trackClick(service)}
              ></jk-service-card>
            `,
          )}
        </div>
      </div>
    `;
  }

  render() {
    const favs = getTopFavorites(this.categories, this.favorites);
    const filteredServices = getFilteredServices(
      this.categories,
      this.searchQuery,
    );
    const activeGroup = this.categories.find(
      (c) => c.categoryKey === this.activeCategoryKey,
    );
    const showMain =
      !this.activeCategoryKey && !this.showSearch && !this.showHelp;

    return html`
      <jk-dashboard-header
        .isGridView=${this.isGridView}
        .lang=${this.lang}
        .t=${(key) => this.t(key)}
        @open-help=${() => (this.showHelp = true)}
        @open-search=${this.openSearch}
        @open-config=${() => {
          this.showConfigModal = true;
          this.editorValue = JSON.stringify(
            { categories: this.categories, searchEngines: this.searchEngines },
            null,
            2,
          );
          this.originalConfigString = this.editorValue;
        }}
        @toggle-view=${this.toggleViewMode}
      ></jk-dashboard-header>

      ${this.templateKeyBadge()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)}
      ${this.templateConfigModal()}
      ${
        showMain
          ? html`
              ${
              this.isGridView
                ? this.templateFullGridView()
                : html`
                    <div class="animate-fadeIn">
                      ${this.templateFavorites(favs)}
                      ${this.templateCategoriesList()}
                    </div>
                  `
            }
            `
          : ""
      }
      ${this.templateServicesGrid(activeGroup)}
    `;
  }
}

customElements.define("dashboard-app", DashboardApp);
