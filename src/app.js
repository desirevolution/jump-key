import { LitElement, html } from 'lit';
import { t, detectLang } from './utils/i18n.js';
import { generateShortcuts, getFilteredServices, getTopFavorites } from './utils/shortcuts.js';

// Import Sub-Components
import './components/dashboard-header.js';
import './components/config-modal.js';
import './components/search-modal.js';
import './components/service-card.js';
import './components/help-modal.js';
import './components/icon.js';
import './components/dialog.js';
import './components/service-group.js';
import './components/favorites-view.js';
import './components/grid-view.js';

class DashboardApp extends LitElement {
  createRenderRoot() {
    return this; // Preserves Tailwind utility structures
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

    // Dialog UI States
    showSaveSuccessDialog: { type: Boolean },
    showSaveErrorDialog: { type: Boolean },
    showClearFavoritesDialog: { type: Boolean },
  };

  constructor() {
    super();
    this.categories = [];
    this.searchEngines = [];
    this.showConfigModal = false;
    this.activeCategoryKey = '';
    this.currentInput = '';
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.searchQuery = '';
    this.showSearch = false;
    this.showHelp = false;
    this.isGridView = JSON.parse(localStorage.getItem('dashboard_grid_view')) || false;
    this.selectedIndex = 0;
    this.favorites = JSON.parse(localStorage.getItem('dashboard_favs')) || {};
    this.resetTimeout = null;
    this.lang = detectLang();

    // Dialog initial state
    this.showSaveSuccessDialog = false;
    this.showSaveErrorDialog = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.originalConfigString = '';
    this.hasEditorConfigChanged = false;
    this.showClearFavoritesDialog = false;
  }

  t(key) {
    return t(this.lang, key);
  }

  // --- Lifecycle ---

  async connectedCallback() {
    super.connectedCallback();
    try {
      const res = await fetch('./config/services.json');
      const data = await res.json();
      localStorage.setItem('services-cache', JSON.stringify(data));
      this.categories = generateShortcuts(data.categories || data);
      this.searchEngines = data.searchEngines || [];
    } catch {
      const cached = localStorage.getItem('services-cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.categories = generateShortcuts(data.categories || data);
        this.searchEngines = data.searchEngines || [];
      }
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('popstate', this.handlePopState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('popstate', this.handlePopState);
  }

  // --- Core Actions & Resets ---

  resetInput(updateHistory = true) {
    this.activeCategoryKey = '';
    this.currentInput = '';
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.showSearch = false;
    this.showHelp = false;
    this.searchQuery = '';
    this.selectedIndex = 0;

    if (updateHistory) {
      if (window.history.state?.view === 'category' || window.history.state?.view === 'search') {
        window.history.back();
      }
    }
  }

  toggleViewMode() {
    this.isGridView = !this.isGridView;
    localStorage.setItem('dashboard_grid_view', JSON.stringify(this.isGridView));
    this.resetInput(true);
  }

  startResetTimer(duration = 3000) {
    clearTimeout(this.resetTimeout);
    this.resetTimeout = setTimeout(() => this.resetInput(), duration);
  }

  trackClick(service, isFavClick = false) {
    if (!isFavClick) {
      this.favorites[service.name] = (this.favorites[service.name] || 0) + 1;
      localStorage.setItem('dashboard_favs', JSON.stringify(this.favorites));
    }
    this.isValidInput = true;
    this.requestUpdate();
    setTimeout(() => {
      window.open(service.url, '_blank');
      setTimeout(() => this.resetInput(true), 100);
    }, 150);
  }

  handlePopState(e) {
    if (!e.state?.view) {
      this.resetInput(false);
    } else if (e.state.view === 'category') {
      this.activeCategoryKey = e.state.key;
      this.showSearch = false;
    }
  }

  openSearch() {
    this.showHelp = false;
    this.showSearch = true;
    this.selectedIndex = 0;
    window.history.pushState({ view: 'search' }, '');
    setTimeout(() => this.querySelector('#searchInput')?.focus(), 100);
  }

  clearFavorites() {
    this.showClearFavoritesDialog = true;
  }

  _confirmClearFavorites() {
    this.favorites = {};
    localStorage.removeItem('dashboard_favs');

    this.showClearFavoritesDialog = false;
    this.requestUpdate();
  }

  // --- Keyboard Event Dispatcher ---

  handleKeyDown(e) {
    if ((e.ctrlKey && e.key !== ',') || e.altKey || e.metaKey) {
      return;
    }
    if (e.key === 'Escape') {
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

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === '?') {
      e.preventDefault();
      this.showHelp = true;
      return;
    }
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      this.showConfigModal = true;
      return;
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      this.openSearch();
      return;
    }
    if (e.key === '#' && !this.activeCategoryKey) {
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
    const showAllEngines = queryTrimmed === ':';

    let matchedEngine = null;
    let searchTermsPreview = '';
    let candidateEngines = [];
    let isFilteringEngines = false;
    let showPreviewBlock = false;

    if (this.searchQuery.startsWith(':')) {
      const commandString = this.searchQuery.substring(1);
      const firstSpaceIndex = commandString.indexOf(' ');

      if (firstSpaceIndex !== -1) {
        const prefix = commandString.substring(0, firstSpaceIndex).toLowerCase();
        searchTermsPreview = commandString.substring(firstSpaceIndex + 1);
        matchedEngine = this.searchEngines.find((eng) => eng.prefix.toLowerCase() === prefix);
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
          this.querySelector('#searchInput')?.focus();
        },
      });
    });

    if (showPreviewBlock) {
      items.push({
        action: () => {
          const finalUrl = matchedEngine.url.replace(
            '%s',
            encodeURIComponent(searchTermsPreview.trim()),
          );
          window.open(finalUrl, '_blank');
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

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalItems > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % totalItems;
        this.scrollToSelected();
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalItems > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + totalItems) % totalItems;
        this.scrollToSelected();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[this.selectedIndex];
      if (item) item.action();
    }
  }

  handleNavigationKeyDown(key) {
    if (!this.activeCategoryKey) {
      if (/^[0-9]$/.test(key) && !this.isGridView) {
        const favService = getTopFavorites(this.categories, this.favorites).find(
          (s) => s.key === key,
        );
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
        window.history.pushState({ view: 'category', key }, '');
      } else {
        this.currentInput = key.toUpperCase();
        this.isInvalidInput = true;
        this.startResetTimer(1500);
      }
      return;
    }

    this.currentInput += ` → ${key.toUpperCase()}`;
    const cat = this.categories.find((c) => c.categoryKey === this.activeCategoryKey);
    const service = cat?.services?.find((s) => s.key === key);

    if (service) {
      this.isInvalidInput = false;
      this.trackClick(service);
    } else {
      this.isInvalidInput = true;
      this.startResetTimer(1500);
    }
  }

  scrollToSelected() {
    setTimeout(() => {
      const active = this.querySelector('.search-item-active');
      const container = this.querySelector('.search-results');

      if (!active || !container) return;

      const activeTop = active.offsetTop;
      const activeBottom = activeTop + active.offsetHeight;

      const visibleTop = container.scrollTop;
      const visibleBottom = visibleTop + container.clientHeight;

      if (activeTop < visibleTop) {
        container.scrollTop = activeTop;
      } else if (activeBottom > visibleBottom) {
        container.scrollTop = activeBottom - container.clientHeight;
      }
    }, 10);
  }
  // --- Backend Sync (WebDAV) ---

  async saveConfiguration(newConfig, oldConfig) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const backupResponse = await fetch(`/config/services.backup-${timestamp}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oldConfig, null, 2),
      });

      if (!backupResponse.ok) {
        throw new Error('Failed to create configuration backup.');
      }

      const response = await fetch('/config/services.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig, null, 2),
      });

      if (response.ok) {
        if (newConfig.categories) {
          this.categories = generateShortcuts(newConfig.categories);
        } else {
          this.categories = generateShortcuts(newConfig);
        }

        if (newConfig.searchEngines) {
          this.searchEngines = newConfig.searchEngines;
        }

        this.showConfigModal = false;
        this.showSaveSuccessDialog = true;
      } else {
        this.showSaveErrorDialog = true;
      }
    } catch (error) {
      console.error('WebDAV Error:', error);
      this.showSaveErrorDialog = true;
    }
  }

  async handleSaveConfig(e) {
    const { newConfig, oldConfig } = e.detail;
    await this.saveConfiguration(newConfig, oldConfig);
  }

  // --- Layout Helper Snippets ---

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
            key: 'Enter',
            preventDefault: () => {},
            ctrlKey: false,
            altKey: false,
            metaKey: false,
          });
        }}
      ></jk-search-modal>
    `;
  }

  templateClearFavoritesDialog() {
    return html`
      <jk-dialog
        .show=${this.showClearFavoritesDialog}
        title="${this.t('confirmResetTitle')}"
        message="${this.t('confirmReset')}"
        icon="trash-2"
        iconColor="text-rose-400"
        confirmLabel="${this.t('confirmResetConfirm')}"
        cancelLabel="${this.t('cancel')}"
        @confirm=${this._confirmClearFavorites}
        @cancel=${() => {
          this.showClearFavoritesDialog = false;
        }}
      ></jk-dialog>
    `;
  }
  templateSaveSuccessDialog() {
    return html`
      <jk-dialog
        .show="${this.showSaveSuccessDialog}"
        title="${this.t('tabEditorSaveDoneTitle')}"
        message="${this.t('tabEditorSaveDone')}"
        icon="circle-check"
        iconColor="text-emerald-400"
        confirmLabel="${this.t('tabEditorOk')}"
        @confirm="${() => (this.showSaveSuccessDialog = false)}"
        @cancel="${() => (this.showSaveSuccessDialog = false)}"
      ></jk-dialog>
    `;
  }

  templateSaveErrorDialog() {
    return html`
      <jk-dialog
        .show="${this.showSaveErrorDialog}"
        title="${this.t('tabEditorSaveFailedTitle')}"
        message="${this.t('tabEditorSaveFailed')}"
        icon="triangle-alert"
        iconColor="text-rose-400"
        confirmLabel="${this.t('tabEditorOk')}"
        @confirm="${() => (this.showSaveErrorDialog = false)}"
        @cancel="${() => (this.showSaveErrorDialog = false)}"
      ></jk-dialog>
    `;
  }

  templateKeyBadge() {
    if (!this.currentInput || this.showSearch || this.showHelp) return '';

    const stateClass = this.isInvalidInput
      ? `
      border-rose-500/50
      text-rose-300
      shadow-rose-950/50
    `
      : this.isValidInput
        ? `
        border-emerald-500/50
        text-emerald-300
        shadow-emerald-950/50
      `
        : `
        border-indigo-500/50
        text-indigo-300
        shadow-indigo-950/50
      `;

    return html`
      <div
        class="
        fixed
        bottom-6
        right-6
        z-50

        flex
        items-center
        gap-2

        px-3
        py-2

        rounded-xl

        bg-slate-900/95
        backdrop-blur-sm

        border

        shadow-xl

        font-mono
        text-lg
        font-bold

        transition-all
        duration-200

        animate-fadeIn

        hidden
        sm:flex

        ${stateClass}
      "
      >
        <kbd
          class="
          px-2
          py-1

          rounded-md

          bg-slate-800

          border
          border-slate-700

          shadow-inner

          tracking-wider
        "
        >
          ${this.currentInput}
        </kbd>

        ${
          this.isValidInput
            ? html` <jk-icon icon="check" class="w-4 h-4 text-emerald-400"></jk-icon> `
            : ''
        }
        ${
          this.isInvalidInput
            ? html` <jk-icon icon="x" class="w-4 h-4 text-rose-400"></jk-icon> `
            : ''
        }
      </div>
    `;
  }

  render_() {
    const favs = getTopFavorites(this.categories, this.favorites);
    const filteredServices = getFilteredServices(this.categories, this.searchQuery);
    const showMain = !this.activeCategoryKey && !this.showSearch && !this.showHelp;

    return html` ${this.templateHelpModal()} `;
  }

  render() {
    const favs = getTopFavorites(this.categories, this.favorites);

    const filteredServices = getFilteredServices(this.categories, this.searchQuery);

    const showMain =
      !this.activeCategoryKey && !this.showSearch && !this.showHelp && !this.showConfigModal;

    return html`
      <!-- Global Overlays -->
      ${this.templateKeyBadge()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)} ${this.templateConfigModal()}
      ${this.templateSaveSuccessDialog()} ${this.templateSaveErrorDialog()}

      <!-- Header -->
      <jk-dashboard-header
        .isGridView=${this.isGridView}
        .lang=${this.lang}
        .t=${(key) => this.t(key)}
        @open-help=${() => {
          this.showHelp = true;
        }}
        @open-search=${this.openSearch}
        @open-config=${() => {
          this.showConfigModal = true;
        }}
        @toggle-view=${this.toggleViewMode}
      ></jk-dashboard-header>

      <!-- Main Content -->
      <main
        class="
        container
        mx-auto
        px-4
        py-6
      "
      >
        ${
          showMain && !this.isGridView
            ? html`
                <!-- Favorites -->
                <jk-favorites-view
                  .favorites=${favs}
                  .t=${(key) => this.t(key)}
                  @service-click=${(e) => this.trackClick(e.detail.service)}
                  @clear-favorites=${this.clearFavorites}
                ></jk-favorites-view>

                <!-- Categories -->
                <jk-service-group
                  title="${this.t('categories')}"
                  icon="folder"
                  .services=${this.categories.map((cat) => ({
                    name: cat.category,
                    url: `${cat.services?.length ?? 0} Services`,
                    icon: cat.icon,
                    key: cat.categoryKey,
                  }))}
                  @service-click=${(e) => {
                    const key = e.detail.service.key;

                    this.activeCategoryKey = key;
                    this.currentInput = key.toUpperCase();

                    window.history.pushState(
                      {
                        view: 'category',
                        key,
                      },
                      '',
                    );
                  }}
                ></jk-service-group>
              `
            : html`
                <!-- Grid / Category Detail View -->
                <jk-grid-view
                  .categories=${this.categories}
                  .activeCategoryKey=${this.activeCategoryKey}
                  .t=${(key) => this.t(key)}
                  @service-click=${(e) => this.trackClick(e.detail.service)}
                ></jk-grid-view>
              `
        }
      </main>
    `;
  }
}

customElements.define('dashboard-app', DashboardApp);
