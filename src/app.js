import { allowedNavigation } from './utils/navigation-policy.js';
import { loadWorkspacePreferences, workspacePreferencesEnabled, effectivePreferencesId, WORKSPACE_PREFERENCES_MODE } from './utils/workspace-preferences.js';
import { initializeWorkspaces, switchWorkspace, workspaceStorage } from './utils/workspaces.js';
import './components/workspace-picker.js';
import { normalizeTimings } from './utils/preferences.js';
import './components/service-actions.js';
import './components/quick-add.js';
import { InstallController } from './utils/install.js';
import { sharedLink, hasSharedInput } from './utils/quick-add.js';
import { migrateConfig, migrateReferences, persistConfig } from './utils/configuration.js';
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
import { loadTheme, saveTheme, applyTheme } from './utils/theme.js';
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
  mainContent: 'w-full pt-4 pb-6 md:pt-8',
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
    actionService: { type: Object },
    showQuickAdd: { type: Boolean },
    savingConfig: { type: Boolean },
    readOnly: { type: Boolean },
    categories: { type: Array },
    searchEngines: { type: Array },
    // UI State
    showConfigModal: { type: Boolean },
    activeCategoryKey: { type: String },
    showContinueView: { type: Boolean },
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
    workspaces: { type: Array },
    workspaceId: {},
    workspaceLoading: {},
    showWorkspacePicker: {},
    separateWorkspacePreferences: { type: Boolean },
    preferences: { type: Object },
    categoryCountdown: { type: Number },
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

    this.installController = new InstallController(this);

    // Data & Navigation State
    this.categories = [];
    this.searchEngines = [];
    this.activeCategoryKey = '';
    this.showContinueView = false;
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
    this.separateWorkspacePreferences=workspacePreferencesEnabled();
    this.readOnly=true;
    this.workspaces=[];
    this.workspaceId='default';
    this.storageKeys={...STORAGE_KEYS};
    this.isGridView = readJsonStorage(STORAGE_KEYS.gridView, true);

    // User Data & Search
    this.favorites = readJsonStorage(this.storageKeys.favorites, {});
    this.continueHistory = readJsonStorage(this.storageKeys.continueHistory, []);
    this.lastUsedCycleIndex = 0;
    this.continueLastUsedCycle = false;
    this.searchQuery = '';
    this.lang = detectLang();
    this.theme = loadTheme();

    // Timers & Modes
    this.resetTimeout = null;
    this.actionManager = new ActionManager();
    this.preferences = normalizeTimings(readJsonStorage('dashboard_timings', {}));
    this.categoryCountdown = 0;
    this.favoriteRecording = null;
    this.editRecording = null;

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
    const workspaceTrigger = e.target?.closest?.('.jk-workspace-trigger');
    const blocked = this.showQuickAdd || this.showConfigModal || this.showSearch || this.showHelp || this.showMobileMenu || this.actionService || this.dialogConfig?.show || this.showWorkspacePicker || e.isComposing || (!workspaceTrigger && e.target?.closest?.('input, textarea, select, [contenteditable="true"], button, a'));
    if (!blocked && e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (!e.repeat && this.workspaces.length > 1) this.cycleWorkspace();
      return;
    }
    if (this.actionManager.activeType === 'workspace' && e.key === 'Enter' && !blocked) {
      e.preventDefault(); this.querySelector('jk-action-feedback')?.confirm(); return;
    }
    if (this.workspaceLoading) return;

    const hasPendingLaunch = this.actionManager.activeType === 'launch';

    if (e.key === 'Enter' && hasPendingLaunch) {
      e.preventDefault();
      this.confirmPendingAction();
      return;
    }

    const continuesLastUsedCycle = e.key === '-' && hasPendingLaunch;

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
  get workspaceItems() { return this.workspaces.map(w => w.id === 'default' ? { ...w, name: this.t('workspaceDefault') } : w); }

  async cycleWorkspace() {
    const previous = this.actionManager.activeType === 'workspace' ? this.pendingWorkspace : this.workspaceLoading ? this.workspaceRequested : this.workspaceId;
    const index = this.workspaces.findIndex(w=>w.id===previous);
    const target = this.workspaces[(index+1)%this.workspaces.length];
    this.pendingWorkspace = target.id;
    this.cancelInputResetTimer();
    if (!this.preferences.launchDelay) { this.switchWorkspace(target.id); return; }
    const feedback = this.querySelector('jk-action-feedback');
    const action = this.actionManager.start({type:'workspace',cancel:()=>feedback?.cancel()});
    const confirmed = await feedback.show({service:{name:target.id === 'default' ? this.t('workspaceDefault') : target.name,category:this.t('workspace'),icon:'ui:layout-grid'},duration:this.preferences.launchDelay*1000});
    if(!this.actionManager.isActive(action)) return;
    this.actionManager.complete(action);
    if(confirmed) this.switchWorkspace(target.id);
  }
  switchWorkspace(id) { this.showWorkspacePicker=false; return switchWorkspace(this,id); }

  setWorkspacePreferencesMode(enabled) {
    this.saveLocalPreferences();
    this.separateWorkspacePreferences=enabled;
    writeJsonStorage(WORKSPACE_PREFERENCES_MODE,enabled);
    if (!this.storageKeys.preferences) return;
    const id=effectivePreferencesId(this.workspaceId,enabled);
    const settings=loadWorkspacePreferences(this.workspaceUser,id,{theme:this.theme,gridView:this.isGridView,timings:this.preferences});
    this.storageKeys={...this.storageKeys,preferences:workspaceStorage(this.workspaceUser,id).preferences};
    this.theme=applyTheme(settings.theme);
    this.isGridView=settings.gridView;
    this.preferences=settings.timings;
    this.cancelInputResetTimer();
    this.cancelPendingAction();
  }

  saveLocalPreferences() {
    if (this.storageKeys.preferences) {
      writeJsonStorage(this.storageKeys.preferences,{theme:this.theme,gridView:this.isGridView,timings:this.preferences});
    } else {
      saveTheme(this.theme);
      writeJsonStorage(STORAGE_KEYS.gridView,this.isGridView);
      writeJsonStorage('dashboard_timings',this.preferences);
    }
  }

  handleThemeChange(e) {
    this.theme = applyTheme(e.detail.theme);
    this.saveLocalPreferences();
  }

  handleMobileThemeChange(e) {
    this.theme = applyTheme(e.detail.theme);
    this.saveLocalPreferences();
    const selectedTheme = getTheme(this.theme);
    this.showToast(this.t('themeChanged', { theme: this.t(selectedTheme.nameKey) }), 'info');
  }

  applyConfiguration(config) {
    const refs = migrateReferences(config, this.favorites, this.continueHistory);
    this.favorites = refs.favorites;
    this.continueHistory = refs.history;
    writeJsonStorage(this.storageKeys.favorites, this.favorites);
    writeJsonStorage(this.storageKeys.continueHistory, this.continueHistory);
    this.configuration = config;
    this.categories = generateShortcuts(config.categories);
    if (this.activeCategoryKey && !this.categories.some(c => c.categoryKey === this.activeCategoryKey)) this.resetNavigationInput(false);
    this.searchEngines = config.searchEngines;
    writeJsonStorage(this.storageKeys.configCache, config);
  }

  async handleSaveConfig(e) {
    if (this.readOnly || this.savingConfig) return;
    this.savingConfig = true;
    try {
      const config = await persistConfig(e.detail.newConfig, { base: import.meta.env.BASE_URL });
      this.applyConfiguration(config);
      this.showConfigModal = false;
      this.showToast(this.t('editConfigSaveDone'), 'success');
    } catch (error) {
      console.error('Configuration save failed:', error);
      this.showToast(this.t('editConfigSaveFailed'), 'error');
    } finally {
      this.savingConfig = false;
    }
  }

  // --------------------------------------------------
  // Lifecycle
  // --------------------------------------------------

  async connectedCallback() {
    super.connectedCallback();
    this.theme = saveTheme(this.theme);

    try {
      const supported = await initializeWorkspaces(this);
      if (!supported) {
    this.readOnly=false;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}config/services.json`);
      if (!res.ok) throw new Error(`Configuration request failed: ${res.status}`);
      const data = await res.json();
      const config = migrateConfig(data);
      if (JSON.stringify(data) !== JSON.stringify(config)) {
        try {
          await persistConfig(config, { base: import.meta.env.BASE_URL });
        } catch (error) {
          console.error('Migration could not be saved; it will be retried on the next load.', error);
          this.showToast(this.t('editConfigSaveFailed'), 'error');
        }
      }
      this.applyConfiguration(config);
    } catch (error) {
      console.error('Configuration load failed:', error);
      try {
        const data = readJsonStorage(this.storageKeys.configCache, null);
        if (data) this.applyConfiguration(migrateConfig(data));
      } catch (cacheError) {
        console.error('Invalid configuration cache:', cacheError);
      }
    }

      }
    } catch(error) { this.showToast(this.t('workspaceFailed'),'error'); }
    if (!this.isConnected) return;
    const params = new URLSearchParams(location.search);
    if (hasSharedInput(params) && this.configuration) {
      this.openQuickAdd(sharedLink(params));
      // Remove shared URLs from browser history after handing them to the dialog.
      for (const key of ['share', 'url', 'text', 'title']) params.delete(key);
      history.replaceState(history.state, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
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
    this.categoryCountdown = 0;
    clearTimeout(this.resetTimeout);
    this.resetTimeout = null;
  }

  cancelPendingAction() {
    return this.actionManager.cancel();
  }

  confirmPendingAction() {
    if (this.actionManager.activeType !== 'launch') return false;

    const feedback = this.querySelector('jk-action-feedback');
    return feedback?.confirm() ?? false;
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
    this.editRecording = null;
    this.cancelInputResetTimer();
    this.activeCategoryKey = '';
    this.showContinueView = false;
    this.resetKeyboardInput();

    if (updateHistory && ['category', 'continue'].includes(window.history.state?.view)) {
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
    this.editRecording = null;
    const state = window.history.state;

    this.cancelPendingAction();
    this.cancelInputResetTimer();
    this.activeCategoryKey = '';
    this.showContinueView = false;
    this.resetKeyboardInput();
    this.closeSearch(false);
    this.showHelp = false;

    if (updateHistory && ['category', 'continue', 'search'].includes(state?.view)) {
      window.history.back();
    }
  }

  toggleViewMode() {
    this.isGridView = !this.isGridView;
    this.saveLocalPreferences();
    this.resetInput(true);
  }

  startCategoryTimer() {
    this.cancelInputResetTimer();
    const duration = this.preferences.categoryTimeout * 1000;
    if (!duration) return;
    this.startResetTimer(duration);
    this.categoryCountdown = duration;
    this.updateComplete.then(() => {
      this.querySelector('[data-category-countdown]')?.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration, fill: 'forwards' });
    });
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
    if (!allowedNavigation(service.url, this.readOnly)) { this.showToast(this.t('blockedLink'), 'error'); return; }
    const {
      updateContinue = true,
      shortcutLabel = '',
      openInSameTab = false,
      keyboardFeedback = !this.showSearch,
    } = options;

    this.cancelInputResetTimer();

    const action = keyboardFeedback && this.preferences.launchDelay > 0 ? this.startPendingLaunch() : null;

    if (keyboardFeedback && this.preferences.launchDelay > 0) {
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

    window.open(service.url, '_blank', 'noopener,noreferrer');
  }

  showActionFeedback(service) {
    const category = this.categories.find((item) =>
      item.services?.some(
        (candidate) => candidate.id === service.id
      )
    );

    return (
      this.querySelector('jk-action-feedback')?.show({
        duration: this.preferences.launchDelay * 1000,
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
      service.id,
      ...this.continueHistory.filter((id) => id !== service.id),
    ].slice(0, 10);

    this.lastUsedCycleIndex = 0;
    writeJsonStorage(this.storageKeys.continueHistory, this.continueHistory);
  }

  openContinueView(shortcutLabel = '') {
    const continueServices = getContinueServices(this.categories, this.continueHistory);

    if (continueServices.length === 0) {
      if (shortcutLabel) {
        this.currentInput = shortcutLabel;
        this.isValidInput = false;
        this.isInvalidInput = true;
        this.startResetTimer();
      }

      this.showToast(this.t('continueEmpty'), 'info');
      return;
    }

    this.cancelPendingAction();
    this.cancelInputResetTimer();
    this.activeCategoryKey = '';
    this.showContinueView = true;
    this.closeSearch(false);
    this.showHelp = false;
    this.resetKeyboardInput();

    if (shortcutLabel) {
      this.currentInput = shortcutLabel;
      this.isValidInput = true;
    }

    if (window.history.state?.view !== 'continue') {
      window.history.pushState({ view: 'continue' }, '');
    }

    if (shortcutLabel) this.startCategoryTimer();
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
      this.showContinueView = false;
      this.showSearch = false;
      return;
    }

    if (e.state.view === 'continue') {
      this.activeCategoryKey = '';
      this.showContinueView = true;
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
      icon: 'ui:trash-2',
      iconColor: 'jk-status-danger',
      confirmLabel: this.t('confirmResetConfirm'),
      cancelLabel: this.t('cancel'),
      onConfirm: () => {
        this.favorites = {};
        localStorage.removeItem(this.storageKeys.favorites);
        this.requestUpdate();
      },
    };
  }

  clearContinue() {
    this.dialogConfig = {
      show: true,
      title: this.t('confirmContinueResetTitle'),
      message: this.t('confirmContinueReset'),
      icon: 'ui:trash-2',
      iconColor: 'jk-status-danger',
      confirmLabel: this.t('confirmResetConfirm'),
      cancelLabel: this.t('cancel'),
      onConfirm: () => {
        this.continueHistory = [];
        this.lastUsedCycleIndex = 0;
        localStorage.removeItem(this.storageKeys.continueHistory);
        this.resetNavigationInput(true);
        this.requestUpdate();
      },
    };
  }

  removeContinueService(service) {
    if (!service?.name) return;

    const nextHistory = this.continueHistory.filter((id) => id !== service.id);
    if (nextHistory.length === this.continueHistory.length) return;

    this.continueHistory = nextHistory;
    this.lastUsedCycleIndex = 0;
    writeJsonStorage(this.storageKeys.continueHistory, this.continueHistory);
    this.showToast(`"${service.name}" ${this.t('continueRemoved')}`, 'success');

    if (!nextHistory.length && this.showContinueView) {
      this.resetNavigationInput(true);
    }

    this.requestUpdate();
  }

  handleServiceLongPress(service) {
    const existingSlot = FAVORITE_SLOTS.find((slot) => this.favorites[slot] === service.id);

    if (existingSlot) {
      this.handleDeleteFavoriteSlot(existingSlot);
      return;
    }

    const freeSlot = FAVORITE_SLOTS.find((slot) => !this.favorites[slot]);
    if (!freeSlot) {
      this.showToast(this.t('favFull'), 'warn');
      return;
    }

    this.favorites = { ...this.favorites, [freeSlot]: service.id };
    writeJsonStorage(this.storageKeys.favorites, this.favorites);

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
    const serviceName = getFavorites(this.categories, this.favorites).find(s => s.favSlot === slot)?.name;
    if (!serviceName) return;

    this.lastDeletedFavorite = { slot, name: serviceName };

    const { [slot]: _removed, ...remainingFavorites } = this.favorites;
    this.favorites = remainingFavorites;
    writeJsonStorage(this.storageKeys.favorites, this.favorites);

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

  async handleServiceAction(action) {
    const service = this.actionService;
    if (!service) return;
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(service.url);
        this.showToast(this.t('urlCopied'), 'success');
      } catch {
        this.showToast(this.t('urlCopyFailed'), 'error');
        return;
      }
    }
    this.actionService = null;
    if (action === 'favorite') this.handleServiceLongPress(service);
    if (action === 'edit') {
      await this.updateComplete;
      this.openQuickAdd({ serviceId: service.id });
    }
  }

  openQuickAdd(initial = {}, returnToOverview = false) {
    if (this.readOnly) return;
    if (!this.configuration) return;
    this.cancelPendingAction();
    this.showSearch = false;
    this.showMobileMenu = false;
    this.editRecording = null;
    this.favoriteRecording = null;
    this.cancelInputResetTimer();
    this.quickReturnToOverview = returnToOverview;
    this.quickInitial = initial;
    this.showQuickAdd = true;
  }

  closeQuickAdd() {
    this.showQuickAdd = false;
    if (this.quickReturnToOverview) this.resetNavigationInput(true);
    this.quickReturnToOverview = false;
  }

  async installApp() {
    this.showMobileMenu = false;
    try { if (await this.installController.install()) return; } catch {}
    this.dialogConfig = { show: true, type: 'info', title: this.t('installApp'),
      message: this.t(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'installIOS' : 'installBrowser'),
      confirmLabel: this.t('close'), onConfirm: null };
  }

  templateConfigModal() {
    return html`
      <jk-config-modal .workspaceApi=${this.workspaces.length > 0} .readOnly=${this.readOnly}
        .workspaceLabel=${this.workspaces.length > 1 ? this.workspaceItems.find(w=>w.id===this.workspaceId)?.name || '' : ''}
        .workspaceFile=${this.workspaces.find(w=>w.id===this.workspaceId)?.file || ''}
        .show=${this.showConfigModal}
        .separateWorkspacePreferences=${this.separateWorkspacePreferences}
        @workspace-preferences-mode=${e=>this.setWorkspacePreferencesMode(e.detail)}
        .preferences=${this.preferences}
        @preferences-change=${e => { this.preferences=e.detail; this.saveLocalPreferences(); this.cancelInputResetTimer(); }}
        .configuration=${this.configuration}
        .saving=${this.savingConfig}
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
      <jk-mobile-menu .readOnly=${this.readOnly}
        .show=${this.showMobileMenu}
        .mode=${this.mobileMenuMode}
        .canInstall=${this.installController.available}
        @install-app=${this.installApp}
        @quick-add=${() => this.openQuickAdd()}
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
        .destructive=${this.dialogConfig.icon === 'ui:trash-2'}
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
      <jk-help-modal .readOnly=${this.readOnly}
        .show=${this.showHelp}
        .isGridView=${this.isGridView}
        .t=${this.t}
        @close=${() => (this.showHelp = false)}
      ></jk-help-modal>
    `;
  }

  templateSearchModal(filteredServices) {
    return html`
      <jk-search-modal .readOnly=${this.readOnly}
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
      !this.activeCategoryKey &&
      !this.showContinueView &&
      !this.showSearch &&
      !this.showHelp &&
      !this.showConfigModal;

    return html`
      ${this.templateKeyBadge()} ${this.templateActionFeedback()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)} ${this.templateConfigModal()}
      ${this.templateMobileMenu()} ${this.templateDialog()}
      ${this.showQuickAdd && !this.readOnly ? html`<jk-quick-add .config=${this.configuration} .initial=${this.quickInitial} .categoryKey=${this.activeCategoryKey} .t=${this.t}
        @close=${() => this.closeQuickAdd()}
        @saved=${e => {this.applyConfiguration(e.detail);this.closeQuickAdd();this.showToast(this.t('editConfigSaveDone'),'success');}}
      ></jk-quick-add>` : ''}

      ${this.actionService ? html`<jk-service-actions .readOnly=${this.readOnly} .anchor=${this.actionAnchor} .service=${this.actionService}
        .favorite=${Object.values(this.favorites).includes(this.actionService.id)} .t=${this.t}
        @action=${e => this.handleServiceAction(e.detail)}></jk-service-actions>` : ''}
      <jk-toast
        .show=${this.toastConfig.show}
        .message=${this.toastConfig.message}
        .type=${this.toastConfig.type}
        @toast-closed=${() => {
          this.toastConfig = { ...this.toastConfig, show: false };
        }}
      ></jk-toast>


      ${this.showWorkspacePicker ? html`<jk-workspace-picker .items=${this.workspaceItems} .active=${this.workspaceId} .anchor=${this.workspaceAnchor} .t=${this.t} @cycle=${async()=>{this.showWorkspacePicker=false;await this.updateComplete;this.cycleWorkspace();}} @close=${()=>this.showWorkspacePicker=false} @select=${e=>this.switchWorkspace(e.detail)}></jk-workspace-picker>` : ''}
      <jk-dashboard-header .readOnly=${this.readOnly} ?inert=${this.workspaceLoading}
        .workspaceName=${this.workspaceItems.find(w=>w.id===this.workspaceId)?.name || '—'}
        .hasWorkspaces=${this.workspaces.length > 1}
        .workspaceNames=${this.workspaceItems.map(w => w.name)}
        .workspaceOpen=${this.showWorkspacePicker}
        @open-workspaces=${e=>{this.enterUiMode();this.workspaceAnchor=e.detail.anchor;this.showWorkspacePicker=true;}}
        @quick-add=${() => this.openQuickAdd()}
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

      ${this.installController.available && !this.installController.dismissed ? html`
        <aside class="jk-install-banner md:hidden" aria-label=${this.t('installApp')}>
          <div><strong>${this.t('installApp')}</strong><p>${this.t('installHint')}</p></div>
          <button class="jk-btn jk-btn-primary" @click=${this.installApp}>${this.t('installAction')}</button>
          <jk-icon-button icon="ui:x" .label=${this.t('close')} @click=${()=>this.installController.dismiss()}></jk-icon-button>
        </aside>` : ''}
      <main ?inert=${this.workspaceLoading} class="${styles.mainContent}" @service-actions=${e => {
        this.cancelPendingAction();
        this.cancelInputResetTimer();
        this.actionAnchor = e.detail.anchor;
        this.actionService = this.categories.flatMap(c => c.services).find(s => s.id === e.detail.id);
      }}>
        ${this.activeCategoryKey || this.showContinueView ? html`<button type="button" class="mb-3 flex min-h-11 items-center gap-2 text-sm text-indigo-300" @click=${()=>this.resetNavigationInput(true)}><jk-icon icon="ui:arrow-left" class="size-4"></jk-icon>${this.t('backOverview')}</button>${this.categoryCountdown ? html`<div class="mb-3 h-0.5 w-40 overflow-hidden rounded bg-slate-700" aria-hidden="true"><div data-category-countdown class="h-full origin-left bg-indigo-400"></div></div>` : ''}` : ''}
        ${
          showMain && !this.isGridView
            ? html`
                <jk-favorites-view
                  .favorites=${favs}
                  .t=${this.t}
                  @service-click=${(e) => {
                    this.trackClick(e.detail.service, {
                      openInSameTab: e.detail.shiftKey,
                      keyboardFeedback: false,
                    });
                  }}
                  @clear-favorites=${this.clearFavorites}
                  @delete-favorite-slot=${(e) => {
                    this.handleDeleteFavoriteSlot(e.detail.slot);
                  }}
                ></jk-favorites-view>

                <jk-service-group
                  title="${this.t('categories')}"
                  .highlightKeys=${true}
                  icon="ui:folder"
                  .services=${[
                    ...(continueServices.length
                      ? [
                          {
                            name: this.t('continue'),
                            url: `${continueServices.length} ${this.t('serviceCount')}`,
                            icon: 'ui:history',
                            key: '⇧-',
                            type: 'continue',
                            isCategory: true,
                          },
                        ]
                      : []),
                    ...this.categories.map((cat) => ({
                      name: cat.category,
                      url: `${cat.services?.length ?? 0} ${this.t('serviceCount')}`,
                      icon: cat.icon,
                      key: cat.categoryKey,
                      type: 'category',
                      isCategory: true,
                    })),
                  ]}
                  @service-click=${(e) => {
                    const item = e.detail.service;
                    if (item.type === 'continue') {
                      this.openContinueView();
                      return;
                    }

                    const key = item.key;
                    this.activeCategoryKey = key;
                    this.showContinueView = false;
                    this.currentInput = key.toUpperCase();

                    this.cancelInputResetTimer();

                    window.history.pushState({ view: 'category', key }, '');
                  }}
                  @card-long-press=${this.handleCardLongPress}
                ></jk-service-group>
              `
            : this.showContinueView
              ? html`
                  <jk-favorites-view
                    .favorites=${[]}
                    .continueServices=${continueServices}
                    .t=${this.t}
                    @continue-click=${(e) => {
                      this.trackClick(e.detail.service, {
                        updateContinue: false,
                        openInSameTab: e.detail.shiftKey,
                        keyboardFeedback: false,
                      });
                    }}
                    @clear-continue=${this.clearContinue}
                    @delete-continue-entry=${(e) => {
                      this.removeContinueService(e.detail.service);
                    }}
                  ></jk-favorites-view>
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
