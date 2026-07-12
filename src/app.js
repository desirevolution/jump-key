import { LitElement, html } from "lit";
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
  createRenderRoot() {
    return this;
  }

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

  // --- Lifecycle ---

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

  // --- State helpers ---

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

  validateConfig(jsonObj) {
    if (!jsonObj || typeof jsonObj !== "object") return false;

    const hasCategories =
      Array.isArray(jsonObj.categories) && jsonObj.categories.length > 0;

    const hasSearchEngines =
      Array.isArray(jsonObj.searchEngines) && jsonObj.searchEngines.length > 0;

    if (!hasCategories || !hasSearchEngines) return false;

    const isCategoriesValid = jsonObj.categories.every(
      (cat) =>
        typeof cat.category === "string" &&
        typeof cat.categoryKey === "string" &&
        Array.isArray(cat.services),
    );

    const isSearchEnginesValid = jsonObj.searchEngines.every(
      (engine) =>
        typeof engine.name === "string" &&
        typeof engine.prefix === "string" &&
        typeof engine.url === "string",
    );

    return isCategoriesValid && isSearchEnginesValid;
  }

  // --- Event handlers ---

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
    setTimeout(() => this.querySelector("#searchInput")?.focus(), 100);
  }

  handleSearchInput(e) {
    this.searchQuery = e.target.value;
    this.selectedIndex = 0;
  }

  handleCategoryUISelection(cat, event) {
    if (event?.screenX === 0 && event?.screenY === 0) return;
    this.activeCategoryKey = cat.categoryKey;
    this.currentInput = cat.categoryKey.toUpperCase();
    this.isInvalidInput = false;
    this.isValidInput = false;
    clearTimeout(this.resetTimeout);
    window.history.pushState({ view: "category", key: cat.categoryKey }, "");
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

    const filtered = getFilteredServices(this.categories, this.searchQuery);

    if (this.showSearch) {
      if (e.key === "Escape") {
        this.resetInput(true);
        return;
      }

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
          if (matchedEngine) {
            showPreviewBlock = true;
          }
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

      // Unified Polymorphic action handlers array construction
      const items = [];
      enginesToRender.forEach((engine) => {
        items.push({
          action: () => {
            this.searchQuery = `:${engine.prefix} `;
            this.querySelector("#searchInput")?.focus();
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
          items.push({
            action: () => this.trackClick(service),
          });
        });
      }

      const totalItems = items.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (totalItems > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % totalItems;
          this.scrollToSelected();
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (totalItems > 0) {
          this.selectedIndex =
            (this.selectedIndex - 1 + totalItems) % totalItems;
          this.scrollToSelected();
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[this.selectedIndex];
        if (item) item.action();
        return;
      }
      return;
    }

    if (this.showHelp) {
      e.preventDefault();
      this.showHelp = false;
      return;
    }
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.key === "Escape") {
      this.resetInput(true);
      return;
    }
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

    if (e.key.length !== 1) return;

    const key = e.key.toLowerCase();

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
    } else {
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
  }

  async scrollToSelected() {
    await this.updateComplete;

    this.querySelector(".search-item-active")?.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
  }

  // --- Backend Communication (WebDAV) ---

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

      if (!backupResponse.ok) {
        throw new Error("Failed to create configuration backup.");
      }

      const response = await fetch("/config/services.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (response.ok) {
        if (updatedConfig.categories) {
          this.categories = generateShortcuts(updatedConfig.categories);
        } else {
          this.categories = generateShortcuts(updatedConfig);
        }

        if (updatedConfig.searchEngines) {
          this.searchEngines = updatedConfig.searchEngines;
        }

        this.showConfigModal = false;
        alert(this.t("editConfigSaveDone"));
      } else {
        alert(this.t("editConfigSaveFailed"));
      }
    } catch (error) {
      console.error("WebDAV Error:", error);
      alert(this.t("editConfigSaveFailed"));
    }
  }

  async handleSaveConfig(e) {
    const updatedConfig = e.detail.config;
    await this.saveConfiguration(updatedConfig);
  }

  // --- Templates ---

  renderIcon(icon, extraClass = "w-6 h-6") {
    if (!icon)
      return html`<jk-icon icon="help-circle" class="${extraClass}"></i>`;
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
        <i data-lucide="globe" class="${extraClass} hidden"></i>
      `;
    }
    return html`<i data-lucide="${icon}" class="${extraClass}"></i>`;
  }

  templateConfigModal() {
    return html`
      <jk-config-modal
        .show=${this.showConfigModal}
        .categories=${this.categories}
        .searchEngines=${this.searchEngines}
        .t=${(key) => this.t(key)}
        @close=${() => (this.showConfigModal = false)}
        @save=${this.handleSaveConfig}
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
      ? "bg-rose-600 text-white border-rose-400 animate-bounce"
      : this.isValidInput
        ? "bg-emerald-600 text-white border-emerald-400 scale-105 shadow-emerald-900/50"
        : "bg-indigo-600 text-white border-indigo-400 animate-pulse";
    return html`
      <div
        class="fixed bottom-6 right-6 font-mono text-xl font-bold px-4 py-2 rounded-lg shadow-2xl border z-50 animate-fadeIn hidden sm:block transition-all duration-150 ${stateClass}"
      >
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
          this.handleKeyDown({
            key: "Enter",
            preventDefault: () => {},
            ctrlKey: false,
            altKey: false,
            metaKey: false,
          });
        }}
      ></jk-search-modal>
    `;
  }

  templateFavorites(favs) {
    if (favs.length === 0) return html``;
    return html`
      <h2
        class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
      >
        <jk-icon
          icon="star"
          class="text-amber-500 w-4 h-4 fill-amber-400/20"
        ></jk-icon>
        ${this.t("frequent")}
      </h2>
      <div
        class="grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
      >
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
    `;
  }

  templateCategoriesList() {
    return html`
      <h2
        class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
      >
        <jk-icon
          icon="folder"
          class="text-blue-500 w-4 h-4 fill-amber-400/20"
        ></jk-icon>
        ${this.t("categories")}
      </h2>
      <div
        class="grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
      >
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
    `;
  }

  templateFullGridView() {
    return html`
      <div class="animate-fadeIn space-y-5">
        ${this.categories.map(
          (cat) => html`
            <div class="border-b border-slate-800/40 pb-5 last:border-0">
              <div class="flex items-center gap-3 mb-3">
                <kbd
                  class="px-2 py-0.5 font-bold font-mono text-xs text-indigo-400 bg-slate-900 border border-indigo-500/30 rounded hidden sm:block"
                >
                  ${cat.categoryKey?.toUpperCase() ?? ""}
                </kbd>
                <jk-icon
                  .icon="${cat.icon}"
                  class="w-4 h-4 text-indigo-400/80"
                ></jk-icon>
                <h2
                  class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider"
                >
                  ${cat.category}
                </h2>
              </div>

              <div
                class="grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
              >
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
      <div class="flex items-center gap-3 mb-3">
        <kbd
          class="px-2 py-0.5 font-bold font-mono text-xs text-indigo-400 bg-slate-900 border border-indigo-500/30 rounded hidden sm:block"
        >
          ${activeGroup.categoryKey?.toUpperCase() ?? ""}
        </kbd>
        <jk-icon
          .icon="${activeGroup.icon}"
          class="w-4 h-4 text-indigo-400/80"
        ></jk-icon>
        <h2
          class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider"
        >
          ${activeGroup.category}
        </h2>
      </div>
      <div class="animate-fadeIn space-y-6">
        <div
          class="grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
        >
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
                      <div class="animate-fadeIn space-y-8 sm:space-y-10">
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
