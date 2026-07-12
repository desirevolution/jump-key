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
    // 1. Grundprüfung auf Objekt und Existenz der Haupt-Arrays
    if (!jsonObj || typeof jsonObj !== "object") return false;

    // 2. Prüfen, ob Kategorien existieren und mindestens eine vorhanden ist
    const hasCategories =
      Array.isArray(jsonObj.categories) && jsonObj.categories.length > 0;

    // 3. Prüfen, ob Suchmaschinen existieren und mindestens eine vorhanden ist
    const hasSearchEngines =
      Array.isArray(jsonObj.searchEngines) && jsonObj.searchEngines.length > 0;

    if (!hasCategories || !hasSearchEngines) return false;

    // 4. Optional: Tiefe Prüfung der Kategorien (z.B. ob 'categoryKey' existiert)
    const isCategoriesValid = jsonObj.categories.every(
      (cat) =>
        typeof cat.category === "string" &&
        typeof cat.categoryKey === "string" &&
        Array.isArray(cat.services),
    );

    // 5. Optional: Prüfung der Suchmaschinen (z.B. ob 'prefix' und 'url' existieren)
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

    if (this.showConfigModal) return; // Shortcuts sperren, wenn der Editor offen ist

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
      if (queryTrimmed.startsWith(":") && !showAllEngines) {
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
          (eng) => eng.prefix.toLowerCase() === prefix.toLowerCase(),
        );
      }

      let totalItems = 0;
      let engineItemsCount = showAllEngines ? this.searchEngines.length : 0;
      let previewItemsCount = matchedEngine && searchTermsPreview ? 1 : 0;
      let serviceItemsCount = !showAllEngines ? filtered.length : 0;

      totalItems = engineItemsCount + previewItemsCount + serviceItemsCount;

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

        if (showAllEngines) {
          const selectedEngine = this.searchEngines[this.selectedIndex];
          if (selectedEngine) {
            this.searchQuery = `:${selectedEngine.prefix} `;
            this.querySelector("#searchInput")?.focus();
          }
          return;
        }

        if (matchedEngine && searchTermsPreview && this.selectedIndex === 0) {
          const finalUrl = matchedEngine.url.replace(
            "%s",
            encodeURIComponent(searchTermsPreview),
          );
          window.open(finalUrl, "_blank");
          this.resetInput(true);
          return;
        }

        const actualServiceIndex =
          matchedEngine && searchTermsPreview
            ? this.selectedIndex - 1
            : this.selectedIndex;
        if (filtered[actualServiceIndex]) {
          this.trackClick(filtered[actualServiceIndex]);
        }
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

  scrollToSelected() {
    setTimeout(
      () =>
        this.querySelector(".search-item-active")?.scrollIntoView({
          block: "nearest",
        }),
      10,
    );
  }

  // --- Backend Communication (WebDAV) ---

  async saveConfiguration(updatedConfig) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // 1. SAVE BACKUP
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

      // 2. OVERWRITE LIVE CONFIGURATION
      const response = await fetch("/config/services.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (response.ok) {
        // 3. UPDATE APP STATE
        if (updatedConfig.categories) {
          this.categories = generateShortcuts(updatedConfig.categories);
        } else {
          this.categories = generateShortcuts(updatedConfig);
        }

        if (updatedConfig.searchEngines) {
          this.searchEngines = updatedConfig.searchEngines;
        }

        // 4. CLOSE MODAL
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

  // Speichern-Button Handler (nutzt den synchronisierten Instanz-Wert)
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

  templateHeader() {
    return html`
      <div
        class="flex flex-row justify-between items-center mb-8 sm:mb-12 border-b border-slate-800 pb-6 gap-4"
      >
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/desirevolution/jump-key"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-transform hover:scale-105 active:scale-95 block shrink-0"
          >
            <img
              src="./jump-key.png"
              alt="JumpKey Logo"
              class="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-lg shadow-md cursor-pointer"
            />
          </a>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
              JumpKey
            </h1>
            <button
              @click="${() => (this.showHelp = true)}"
              class="text-slate-500 hover:text-indigo-400 transition-colors flex items-center alignment-baseline dynamic-icon hidden md:block"
              title="${this.t("helpHint")}"
            >
              <jk-icon
                icon="help-circle"
                class="w-5 h-5 sm:w-6 sm:h-6"
              ></jk-icon>
            </button>
          </div>
        </div>
        <div class="flex items-center gap-3 font-mono">
          <button
            @click="${this.toggleViewMode}"
            class="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors shadow-md group"
            title="${this.t("hkToggleView")} [#]"
          >
            ${
              this.isGridView
                ? html`<jk-icon
                    icon="rows-2"
                    class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
                  ></jk-icon>`
                : html`<jk-icon
                    icon="layout-grid"
                    class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
                  ></jk-icon>`
            }
          </button>
          <button
            @click="${this.openSearch}"
            class="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors shadow-md group"
            title="Suche [Space]"
          >
            <jk-icon
              icon="search"
              class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
            ></jk-icon>
          </button>

          <button
            @click="${() => {
              this.showConfigModal = true;
            }}"
            class="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all duration-150 group shadow-md hidden md:block"
            title="${this.t("editConfig")}"
          >
            <jk-icon
              icon="settings"
              class="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors"
            ></jk-icon>
          </button>

          <div class="text-center sm:text-right ml-2">
            <div
              class="text-2xl sm:text-4xl font-bold text-indigo-400 tracking-wider"
            >
              ${this.timeString}
            </div>
            <div
              class="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5"
            >
              ${this.dateString}
            </div>
          </div>
        </div>
      </div>
    `;
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
              <!-- Category Section Header -->
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

              <!-- Services Grid for this specific Category -->
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
