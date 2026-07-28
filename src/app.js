import { html, LitElement } from 'lit';
import { detectLang, t } from './utils/i18n.js';
import {
  generateShortcuts,
  getFavorites,
  addFavoriteSlots,
  getFilteredServices,
  FAVORITE_SLOTS,
  getContinueServices,
  getContinueService,
} from './utils/shortcuts.js';
import { readJsonStorage, writeJsonStorage } from './utils/storage.js';
import { handleGlobalKeyDown } from './utils/keyboard/index.js';
import { loadTheme, saveTheme } from './utils/theme.js';
import { getTheme } from './themes/themes.js';
import { ActionManager } from './utils/action-manager.js';

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
import './components/action-feedback.js';
import './components/mobile-menu.js';

const styles = {
  mainContent: 'container mx-auto px-4 pt-8 pb-6',
};

const STORAGE_KEYS = {
  configCache: 'services-cache',
  favorites: 'dashboard_favs',
  continueHistory: 'dashboard_continue',
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
    continueHistory: { type: Array },
    lang: { type: String },
    theme: { type: String },
    // Feedback UI
    dialogConfig: { type: Object },
    toastConfig: { type: Object },
    actionFeedbackVisible: { type: Boolean },
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
    this.continueHistory = readJsonStorage(STORAGE_KEYS.continueHistory, []);
    this.lastUsedCycleIndex = 0;
    this.continueLastUsedCycle = false;
    this.searchQuery = '';
    this.lang = detectLang();
    this.theme = loadTheme();

    // Timers & Modes
    this.resetTimeout = null;
    this.actionManager = new ActionManager();
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

    this.actionFeedbackVisible = false;

    // Bindings
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.t = this.t.bind(this);
  }

  t(key, params) {
    return t(this.lang, key, params);
  }

  handleKeyDown(e) {
    const continuesLastUsedCycle = e.key === '-' && this.actionManager.activeType === 'launch';

    this.cancelPendingAction();

    if (!continuesLastUsedCycle) {
      this.lastUsedCycleIndex = 0;
    }

    this.continueLastUsedCycle = continuesLastUsedCycle;
    try {
      handleGlobalKeyDown(e, this);
    } finally {
      this.continueLastUsedCycle = false;
    }
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
      const backupResponse = await fetch(`/config/services.backup-${timestamp}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig, null, 2),
      });

      if (!backupResponse.ok) {
        throw new Error('Failed to create configuration backup.');
      }

      const response = await fetch('/config/services.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig, null, 2),
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
    this.cancelPendingAction();
  }

  // --------------------------------------------------
  // Core Actions & State
  // --------------------------------------------------

  cancelInputResetTimer() {
    clearTimeout(this.resetTimeout);
    this.resetTimeout = null;
  }

  cancelPendingAction() {
    return this.actionManager.cancel();
  }

  enterUiMode() {
    this.cancelInputResetTimer();
    this.cancelPendingAction();
    this.resetKeyboardInput();
  }

  resetKeyboardInput() {
    this.currentInput = '';
    this.isInvalidInput = false;
    this.isValidInput = false;
  }

  resetNavigationInput(updateHistory = true) {
    this.cancelInputResetTimer();
    this.activeCategoryKey = '';
    this.resetKeyboardInput();

    if (updateHistory && window.history.state?.view === 'category') {
      window.history.back();
    }
  }

  closeSearch(updateHistory = true) {
    this.showSearch = false;
    this.searchQuery = '';
    this.selectedIndex = 0;

    if (updateHistory && window.history.state?.view === 'search') {
      window.history.back();
    }
  }

  resetInput(updateHistory = true) {
    const state = window.history.state;

    this.cancelPendingAction();
    this.cancelInputResetTimer();
    this.activeCategoryKey = '';
    this.resetKeyboardInput();
    this.closeSearch(false);
    this.showHelp = false;

    if (updateHistory && (state?.view === 'category' || state?.view === 'search')) {
      window.history.back();
    }
  }

  toggleViewMode() {
    this.isGridView = !this.isGridView;
    writeJsonStorage(STORAGE_KEYS.gridView, this.isGridView);
    this.resetInput(true);
  }

  startResetTimer(duration = 3000) {
    this.cancelInputResetTimer();
    this.resetTimeout = setTimeout(() => {
      this.resetTimeout = null;
      this.resetNavigationInput(true);
    }, duration);
  }

  startPendingLaunch() {
    const feedback = this.querySelector('jk-action-feedback');
    return this.actionManager.start({
      type: 'launch',
      cancel: () => feedback?.cancel(),
    });
  }

  async trackClick(service, options = {}) {
    const {
      updateContinue = true,
      shortcutLabel = '',
      openInSameTab = false,
      keyboardFeedback = !this.showSearch,
    } = options;

    this.cancelInputResetTimer();

    const action = keyboardFeedback ? this.startPendingLaunch() : null;

    if (keyboardFeedback) {
      if (shortcutLabel) {
        this.currentInput = shortcutLabel;
      } else if (this.activeCategoryKey && service.key) {
        this.currentInput = `${this.activeCategoryKey.toUpperCase()} → ${service.key.toUpperCase()}`;
      } else if (service.key || service.favSlot) {
        this.currentInput = (service.favSlot || service.key).toUpperCase();
      }

      this.isValidInput = true;
      this.isInvalidInput = false;

      const shouldLaunch = await this.showActionFeedback(service);

      if (!this.actionManager.isActive(action)) return;

      this.actionManager.complete(action);
      if (!shouldLaunch) return;
    }

    if (updateContinue) {
      this.rememberContinueService(service);
    }

    // Complete the active interaction synchronously before navigation.
    // No pending input timer may change an unrelated UI state afterwards.
    if (this.showSearch) {
      this.closeSearch(true);
    } else if (keyboardFeedback) {
      this.resetNavigationInput(true);
    }

    if (openInSameTab) {
      window.location.assign(service.url);
      return;
    }

    window.open(service.url, '_blank');
  }

  showActionFeedback(service) {
    const category = this.categories.find((item) =>
      item.services?.some(
        (candidate) => candidate.name === service.name && candidate.url === service.url
      )
    );

    return (
      this.querySelector('jk-action-feedback')?.show({
        service: {
          ...service,
          category: service.category || category?.category || '',
        },
      }) ?? Promise.resolve(true)
    );
  }

  rememberContinueService(service) {
    if (!service?.name || !service?.url) return;

    this.continueHistory = [
      service.name,
      ...this.continueHistory.filter((name) => name !== service.name),
    ].slice(0, 10);

    this.lastUsedCycleIndex = 0;
    writeJsonStorage(STORAGE_KEYS.continueHistory, this.continueHistory);
  }

  launchContinueSlot(slot) {
    const service = getContinueService(this.categories, this.continueHistory, slot);
    if (!service) return;

    this.trackClick(service, {
      updateContinue: false,
      shortcutLabel: `⇧${slot}`,
    });
  }

  async toggleLastService() {
    const services = getContinueServices(this.categories, this.continueHistory);
    if (!services.length) return;

    if (this.continueLastUsedCycle) {
      this.lastUsedCycleIndex = (this.lastUsedCycleIndex + 1) % services.length;
    } else {
      this.lastUsedCycleIndex = 0;
    }
    this.continueLastUsedCycle = false;

    await this.trackClick(services[this.lastUsedCycleIndex], {
      updateContinue: false,
      shortcutLabel: '-',
    });
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
    this.enterUiMode();

    this.showHelp = false;
    this.showSearch = true;
    this.selectedIndex = 0;

    if (window.history.state?.view !== 'search') {
      window.history.pushState({ view: 'search' }, '');
    }
    setTimeout(() => this.searchInput?.focus(), 100);
  }

  openHelp() {
    this.enterUiMode();
    this.showSearch = false;
    this.showHelp = true;
  }

  openConfig() {
    this.enterUiMode();
    this.showSearch = false;
    this.showHelp = false;
    this.showConfigModal = true;
  }

  openMobileMenu() {
    this.enterUiMode();
    this.mobileMenuMode = 'menu';
    this.showMobileMenu = true;
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

  clearContinue() {
    this.dialogConfig = {
      show: true,
      title: this.t('confirmContinueResetTitle'),
      message: this.t('confirmContinueReset'),
      icon: 'trash-2',
      iconColor: 'jk-status-danger',
      confirmLabel: this.t('confirmResetConfirm'),
      cancelLabel: this.t('cancel'),
      onConfirm: () => {
        this.continueHistory = [];
        this.lastUsedCycleIndex = 0;
        localStorage.removeItem(STORAGE_KEYS.continueHistory);
        this.requestUpdate();
      },
    };
  }

  removeContinueService(service) {
    if (!service?.name) return;

    const nextHistory = this.continueHistory.filter((name) => name !== service.name);
    if (nextHistory.length === this.continueHistory.length) return;

    this.continueHistory = nextHistory;
    this.lastUsedCycleIndex = 0;
    writeJsonStorage(STORAGE_KEYS.continueHistory, this.continueHistory);
    this.showToast(`"${service.name}" ${this.t('continueRemoved')}`, 'success');
    this.requestUpdate();
  }

  handleServiceLongPress(service) {
    const existingSlot = FAVORITE_SLOTS.find((slot) => this.favorites[slot] === service.name);

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

    this.showToast(`"${service.name}" ${this.t('favSaved', { slot: freeSlot })}`, 'success');
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

    this.showToast(`"${serviceName}" ${this.t('favRemoved', { slot })}`, 'success');

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
          this.openHelp();
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
          this.trackClick(e.detail.service, {
            openInSameTab: e.detail.shiftKey,
            keyboardFeedback: false,
          });
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

  templateActionFeedback() {
    return html`
      <jk-action-feedback
        @feedback-visibility-change=${(e) => {
          this.actionFeedbackVisible = e.detail.visible;
        }}
      ></jk-action-feedback>
    `;
  }

  render() {
    const favs = getFavorites(this.categories, this.favorites);
    const continueServices = getContinueServices(this.categories, this.continueHistory);
    const categoriesWithFavorites = addFavoriteSlots(this.categories, this.favorites);
    const filteredServices = getFilteredServices(this.categories, this.searchQuery);
    const showMain =
      !this.activeCategoryKey && !this.showSearch && !this.showHelp && !this.showConfigModal;

    return html`
      ${this.templateKeyBadge()} ${this.templateActionFeedback()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)} ${this.templateConfigModal()}
      ${this.templateMobileMenu()} ${this.templateDialog()}

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
          this.openHelp();
        }}
        @open-search=${this.openSearch}
        @open-config=${() => {
          this.openConfig();
        }}
        @open-mobile-menu=${() => {
          this.openMobileMenu();
        }}
        @toggle-view=${this.toggleViewMode}
      ></jk-dashboard-header>

      <main class="${styles.mainContent}">
        ${
          showMain && !this.isGridView
            ? html`
                <jk-favorites-view
                  .favorites=${favs}
                  .continueServices=${continueServices}
                  .t=${this.t}
                  @service-click=${(e) => {
                    this.trackClick(e.detail.service, {
                      openInSameTab: e.detail.shiftKey,
                      keyboardFeedback: false,
                    });
                  }}
                  @continue-click=${(e) => {
                    this.trackClick(e.detail.service, {
                      updateContinue: false,
                      openInSameTab: e.detail.shiftKey,
                      keyboardFeedback: false,
                    });
                  }}
                  @clear-favorites=${this.clearFavorites}
                  @clear-continue=${this.clearContinue}
                  @delete-continue-entry=${(e) => {
                    this.removeContinueService(e.detail.service);
                  }}
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
                    this.trackClick(e.detail.service, {
                      openInSameTab: e.detail.shiftKey,
                      keyboardFeedback: false,
                    });
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
