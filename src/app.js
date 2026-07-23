import { html, LitElement } from 'lit';
import { detectLang, t } from './utils/i18n.js';
import {
  generateShortcuts,
  getFavorites,
  addFavoriteSlots,
  getFilteredServices,
  FAVORITE_SLOTS,
} from './utils/shortcuts.js';
import { readJsonStorage, writeJsonStorage } from './utils/storage.js';
import { handleGlobalKeyDown } from './utils/keyboard/index.js';
import { loadTheme, saveTheme } from './utils/theme.js';
import { getTheme } from './themes/themes.js';

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
import './components/toast.js';
import './components/keystroke-badge.js';
import './components/mobile-menu.js';

const styles = {
  mainContent: 'container mx-auto px-4 pt-8 pb-6',
};

const STORAGE_KEYS = {
  configCache: 'services-cache',
  favorites: 'dashboard_favs',
  gridView: 'dashboard_grid_view',
};

class DashboardApp extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    categories: { type: Array },
    searchEngines: { type: Array },
    // UI State
    showConfigModal: { type: Boolean },
    activeCategoryKey: { type: String },
    currentInput: { type: String },
    isInvalidInput: { type: Boolean },
    isValidInput: { type: Boolean },
    // Search
    searchQuery: { type: String },
    showSearch: { type: Boolean },
    // Modals
    showHelp: { type: Boolean },
    showMobileMenu: { type: Boolean },
    mobileMenuMode: { type: String },
    // Layout
    isGridView: { type: Boolean },
    // Keyboard navigation
    selectedIndex: { type: Number },
    // Data
    favorites: { type: Object },
    lang: { type: String },
    theme: { type: String },
    // Feedback UI
    dialogConfig: { type: Object },
    toastConfig: { type: Object },
  };

  get searchInput() {
    return this.querySelector('#searchInput');
  }

  constructor() {
    super();

    // Data & Navigation State
    this.categories = [];
    this.searchEngines = [];
    this.activeCategoryKey = '';
    this.currentInput = '';
    this.selectedIndex = 0;

    // UI & Layout State
    this.showConfigModal = false;
    this.showSearch = false;
    this.showHelp = false;
    this.showMobileMenu = false;
    this.mobileMenuMode = 'menu';
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.isGridView = readJsonStorage(STORAGE_KEYS.gridView, false);

    // User Data & Search
    this.favorites = readJsonStorage(STORAGE_KEYS.favorites, {});
    this.searchQuery = '';
    this.lang = detectLang();
    this.theme = loadTheme();

    // Timers & Modes
    this.resetTimeout = null;
    this.favoriteRecording = null;

    // Dialog state
    this.dialogConfig = {
      show: false,
      type: 'info',
      title: '',
      message: '',
      icon: '',
      iconColor: '',
      confirmLabel: '',
      cancelLabel: '',
      onConfirm: null,
    };

    // Toast state
    this.toastConfig = {
      show: false,
      message: '',
      type: 'success',
    };

    // Bindings
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.t = this.t.bind(this);
  }

  t(key, params) {
    return t(this.lang, key, params);
  }

  handleKeyDown(e) {
    handleGlobalKeyDown(e, this);
  }
  handleThemeChange(e) {
    this.theme = saveTheme(e.detail.theme);
  }

  handleMobileThemeChange(e) {
    this.theme = saveTheme(e.detail.theme);
    const selectedTheme = getTheme(this.theme);
    this.showToast(this.t('themeChanged', { theme: this.t(selectedTheme.nameKey) }), 'info');
  }


  async saveConfiguration(updatedConfig) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupResponse = await fetch(
        `/config/services.backup-${timestamp}.json`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig),
        }
      );

      if (!backupResponse.ok) {
        throw new Error('Failed to create configuration backup.');
      }

      const response = await fetch('/config/services.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

        this.showToast(this.t('editConfigSaveDone'), 'success');
      } else {
        this.showToast(this.t('editConfigSaveFailed'), 'error');
      }
    } catch (error) {
      console.error('WebDAV Error:', error);
      this.showToast(this.t('editConfigSaveFailed'), 'error');
    }
  }

  async handleSaveConfig(e) {
    const updatedConfig = e.detail.newConfig ?? e.detail.config;
    await this.saveConfiguration(updatedConfig);
  }

  // --------------------------------------------------
  // Lifecycle
  // --------------------------------------------------

  async connectedCallback() {
    super.connectedCallback();
    this.theme = saveTheme(this.theme);

    try {
      const res = await fetch('./config/services.json');
      if (!res.ok) throw new Error(`Configuration request failed: ${res.status}`);
      const data = await res.json();
      writeJsonStorage(STORAGE_KEYS.configCache, data);
      this.categories = generateShortcuts(data.categories || data);
      this.searchEngines = data.searchEngines || [];
    } catch {
      const data = readJsonStorage(STORAGE_KEYS.configCache, null);
      if (data) {
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
    clearTimeout(this.resetTimeout);
  }

  // --------------------------------------------------
  // Core Actions & State
  // --------------------------------------------------

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
      const state = window.history.state;
      if (state?.view === 'category' || state?.view === 'search') {
        window.history.back();
      }
    }
  }

  toggleViewMode() {
    this.isGridView = !this.isGridView;
    writeJsonStorage(STORAGE_KEYS.gridView, this.isGridView);
    this.resetInput(true);
  }

  startResetTimer(duration = 3000) {
    clearTimeout(this.resetTimeout);
    this.resetTimeout = setTimeout(() => this.resetInput(), duration);
  }

  trackClick(service) {
    // Klick-Logik mit automatischer Keystroke-Ermittlung
    if (this.activeCategoryKey && service.key) {
      this.currentInput = `${this.activeCategoryKey.toUpperCase()} → ${service.key.toUpperCase()}`;
    } else if (service.key || service.favSlot) {
      this.currentInput = (service.favSlot || service.key).toUpperCase();
    }

    this.isValidInput = true;
    this.isInvalidInput = false;

    // 300ms Bestätigungspause
    setTimeout(() => {
      window.open(service.url, '_blank');

      setTimeout(() => this.resetInput(true), 100);
    }, 300);
  }

  handlePopState(e) {
    if (!e.state?.view) {
      this.resetInput(false);
      return;
    }

    if (e.state.view === 'category') {
      this.activeCategoryKey = e.state.key;
      this.showSearch = false;
    }
  }

  // --------------------------------------------------
  // Toast
  // --------------------------------------------------

  showToast(message, type = 'success') {
    this.toastConfig = {
      show: true,
      message,
      type,
    };
    this.requestUpdate();
  }

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  openSearch() {
    this.showHelp = false;
    this.showSearch = true;
    this.selectedIndex = 0;

    if (window.history.state?.view !== 'search') {
      window.history.pushState({ view: 'search' }, '');
    }
    setTimeout(() => this.searchInput?.focus(), 100);
  }

  // --------------------------------------------------
  // Dialog Handling
  // --------------------------------------------------

  closeDialog() {
    this.dialogConfig = {
      ...this.dialogConfig,
      show: false,
    };
  }

  // --------------------------------------------------
  // Favorites
  // --------------------------------------------------

  clearFavorites() {
    this.dialogConfig = {
      show: true,
      title: this.t('confirmResetTitle'),
      message: this.t('confirmReset'),
      icon: 'trash-2',
      iconColor: 'jk-status-danger',
      confirmLabel: this.t('confirmResetConfirm'),
      cancelLabel: this.t('cancel'),
      onConfirm: () => {
        this.favorites = {};
        localStorage.removeItem(STORAGE_KEYS.favorites);
        this.requestUpdate();
      },
    };
  }

  handleServiceLongPress(service) {
    const existingSlot = FAVORITE_SLOTS.find(
      (slot) => this.favorites[slot] === service.name
    );

    if (existingSlot) {
      this.handleDeleteFavoriteSlot(existingSlot);
      return;
    }

    const freeSlot = FAVORITE_SLOTS.find((slot) => !this.favorites[slot]);
    if (!freeSlot) {
      this.showToast(this.t('favFull'), 'warn');
      return;
    }

    this.favorites = { ...this.favorites, [freeSlot]: service.name };
    writeJsonStorage(STORAGE_KEYS.favorites, this.favorites);

    this.resetInput(true);

    this.showToast(
      `"${service.name}" ${this.t('favSaved', { slot: freeSlot })}`,
      'success'
    );
    this.requestUpdate();
  }

  handleCardLongPress(e) {
    const service = e.detail.service;

    if (!service?.url || service.isCategory) {
      this.showToast(this.t('cannotFavoriteCategory'), 'info');
      return;
    }

    this.handleServiceLongPress(service);
  }

  handleDeleteFavoriteSlot(slot) {
    const serviceName = this.favorites[slot];
    if (!serviceName) return;

    this.lastDeletedFavorite = { slot, name: serviceName };

    const { [slot]: _removed, ...remainingFavorites } = this.favorites;
    this.favorites = remainingFavorites;
    writeJsonStorage(STORAGE_KEYS.favorites, this.favorites);

    this.showToast(
      `"${serviceName}" ${this.t('favRemoved', { slot })}`,
      'success'
    );

    this.resetInput(false);
    this.requestUpdate();
  }

  handleNotification(e) {
    const { type, message } = e.detail;
    this.showToast(message, type);
  }

  // --------------------------------------------------
  // Layout Helper Snippets
  // --------------------------------------------------

  templateConfigModal() {
    return html`
      <jk-config-modal
        .show=${this.showConfigModal}
        .categories=${this.categories}
        .searchEngines=${this.searchEngines}
        .theme=${this.theme}
        .t=${this.t}
        @notify=${this.handleNotification}
        @theme-change=${this.handleThemeChange}
        @save=${this.handleSaveConfig}
        @close=${() => (this.showConfigModal = false)}
      ></jk-config-modal>
    `;
  }


  templateMobileMenu() {
    return html`
      <jk-mobile-menu
        .show=${this.showMobileMenu}
        .mode=${this.mobileMenuMode}
        .theme=${this.theme}
        .t=${this.t}
        @close=${() => {
          this.showMobileMenu = false;
          this.mobileMenuMode = 'menu';
        }}
        @back=${() => (this.mobileMenuMode = 'menu')}
        @open-help=${() => {
          this.showMobileMenu = false;
          this.mobileMenuMode = 'menu';
          this.showHelp = true;
        }}
        @open-themes=${() => (this.mobileMenuMode = 'themes')}
        @theme-change=${this.handleMobileThemeChange}
      ></jk-mobile-menu>
    `;
  }

  templateDialog() {
    if (!this.dialogConfig.show) return '';

    return html`
      <jk-dialog
        .show=${this.dialogConfig.show}
        .type=${this.dialogConfig.type || 'info'}
        .title=${this.dialogConfig.title}
        .message=${this.dialogConfig.message}
        .icon=${this.dialogConfig.icon || ''}
        .iconColor=${this.dialogConfig.iconColor || ''}
        .confirmLabel=${this.dialogConfig.confirmLabel || this.t('tabEditorOk')}
        .cancelLabel=${this.dialogConfig.cancelLabel || ''}
        @confirm=${() => {
          if (this.dialogConfig.onConfirm) {
            this.dialogConfig.onConfirm();
          }
          this.closeDialog();
        }}
        @close=${this.closeDialog}
        @cancel=${this.closeDialog}
      ></jk-dialog>
    `;
  }

  templateHelpModal() {
    return html`
      <jk-help-modal
        .show=${this.showHelp}
        .isGridView=${this.isGridView}
        .t=${this.t}
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
        .t=${this.t}
        @close=${() => this.resetInput(true)}
        @search-change=${(e) => {
          this.searchQuery = e.detail.value;
          this.selectedIndex = 0;
        }}
        @service-click=${(e) => {
          this.trackClick(e.detail.service);
        }}
        @execute-submit=${() => {
          this.handleKeyDown({
            key: 'Enter',
            preventDefault: () => {},
            target: { tagName: 'BUTTON' },
          });
        }}
      ></jk-search-modal>
    `;
  }

  templateKeyBadge() {
    return html`
      <jk-keystroke-badge
        .input=${this.currentInput}
        .isValid=${this.isValidInput}
        .isInvalid=${this.isInvalidInput}
        .hidden=${this.showSearch || this.showHelp}
      ></jk-keystroke-badge>
    `;
  }

  render() {
    const favs = getFavorites(this.categories, this.favorites);
    const categoriesWithFavorites = addFavoriteSlots(
      this.categories,
      this.favorites
    );
    const filteredServices = getFilteredServices(
      this.categories,
      this.searchQuery
    );
    const showMain =
      !this.activeCategoryKey &&
      !this.showSearch &&
      !this.showHelp &&
      !this.showConfigModal;

    return html`
      ${this.templateKeyBadge()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)}
      ${this.templateConfigModal()} ${this.templateMobileMenu()} ${this.templateDialog()}

      <jk-toast
        .show=${this.toastConfig.show}
        .message=${this.toastConfig.message}
        .type=${this.toastConfig.type}
        @toast-closed=${() => {
          this.toastConfig = { ...this.toastConfig, show: false };
        }}
      ></jk-toast>

      <jk-dashboard-header
        .isGridView=${this.isGridView}
        .lang=${this.lang}
        .t=${this.t}
        @open-help=${() => {
          this.showHelp = true;
        }}
        @open-search=${this.openSearch}
        @open-config=${() => {
          this.showConfigModal = true;
        }}
        @open-mobile-menu=${() => {
          this.mobileMenuMode = 'menu';
          this.showMobileMenu = true;
        }}
        @toggle-view=${this.toggleViewMode}
      ></jk-dashboard-header>

      <main class="${styles.mainContent}">
        ${
          showMain && !this.isGridView
            ? html`
                <jk-favorites-view
                  .favorites=${favs}
                  .t=${this.t}
                  @service-click=${(e) => {
                    this.trackClick(e.detail.service);
                  }}
                  @clear-favorites=${this.clearFavorites}
                  @delete-favorite-slot=${(e) => {
                    this.handleDeleteFavoriteSlot(e.detail.slot);
                  }}
                ></jk-favorites-view>

                <jk-service-group
                  title="${this.t('categories')}"
                  icon="folder"
                  .services=${this.categories.map((cat) => ({
                    name: cat.category,
                    url: `${cat.services?.length ?? 0} ${this.t('serviceCount')}`,
                    icon: cat.icon,
                    key: cat.categoryKey,
                    isCategory: true,
                  }))}
                  @service-click=${(e) => {
                    const key = e.detail.service.key;
                    this.activeCategoryKey = key;
                    this.currentInput = key.toUpperCase();

                    this.startResetTimer();

                    window.history.pushState({ view: 'category', key }, '');
                  }}
                  @card-long-press=${this.handleCardLongPress}
                ></jk-service-group>
              `
            : html`
                <jk-grid-view
                  .categories=${categoriesWithFavorites}
                  .activeCategoryKey=${this.activeCategoryKey}
                  .t=${this.t}
                  @service-click=${(e) => {
                    this.trackClick(e.detail.service);
                  }}
                  @card-long-press=${(e) => {
                    this.handleServiceLongPress(e.detail.service);
                  }}
                ></jk-grid-view>
              `
        }
      </main>
    `;
  }
}

customElements.define('dashboard-app', DashboardApp);
