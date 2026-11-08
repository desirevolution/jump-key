import { allowedNavigation } from './utils/navigation-policy.js';
import { loadWorkspacePreferences, workspacePreferencesEnabled, effectivePreferencesId, WORKSPACE_PREFERENCES_MODE } from './utils/workspace-preferences.js';
import { initializeWorkspaces, reconnectWorkspaces, startWorkspacePrefetch, switchWorkspace, workspaceStorage, migrateWorkspaceIDs } from './utils/workspaces.js';
import {cleanupRemovedWorkspaceCaches} from './utils/workspace-migration.js';
import { cacheWorkspace, cacheManifest, reconcileOfflineCache } from './utils/offline-cache.js';
import { pwaUpdates, APP_VERSION } from './utils/pwa-updates.js';
import { workspaceLabel } from './utils/workspace-label.js';
import { servicePosition } from './utils/reorder.js';
import { reorderCategory, reorderService, toggleCategory, compareServerConfiguration, acceptServerRevision } from './utils/dashboard-actions.js';
import './components/workspace-picker.js';
import { normalizeTimings } from './utils/preferences.js';
import './components/service-actions.js';
import './components/quick-add.js';
import { InstallController } from './utils/install.js';
import { sharedLink, hasSharedInput } from './utils/quick-add.js';
import { migrateConfig, migrateReferences, persistConfig, setWorkspaceETag, setWorkspaceContext } from './utils/configuration.js';
import { html, LitElement } from 'lit';
import { detectLang, t } from './utils/i18n.js';
import {
  generateShortcuts,
  categorySelectionKey,
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
import { renderDashboardContent } from './views/dashboard-content.js';

// Import Sub-Components
import './components/dashboard-header.js';
import './components/config-modal.js';
import './components/change-guard.js';
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
    _quickExitPrompt: { type: Boolean },
    savingConfig: { type: Boolean },
    readOnly: { type: Boolean },
    offlineMode: { type: Boolean },
    offlineCacheStatus: { type: Object },
    pwaState: { type: Object },
    pwaNoticeDismissed: { type: Boolean },
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
    collapsedCategories: { type: Object },
    configSaveError: {},
    serverSnapshot: {},
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
    categoryActionIndex: {},
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
    this._quickExitPrompt = false;
    this.quickReturnToSettings = false;
    this.quickSaveConfig = null;
    this.quickConfig = null;
    this.showSearch = false;
    this.showHelp = false;
    this.showMobileMenu = false;
    this.mobileMenuMode = 'menu';
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.separateWorkspacePreferences=workspacePreferencesEnabled();
    this.readOnly=true;
    this.serverReadOnly=true;
    this.offlineMode=false;
    this.offlineCacheStatus={available:0,total:0,failures:[]};
    this.pwaState={...pwaUpdates.state};
    this.pwaNoticeDismissed=false;
    this._reconnectInFlight=null;
    this._lastReconnectAttempt=0;
    this.workspaces=[];
    this.configInitialTab='general';
    this.workspaceId='default';
    this.collapsedCategories = {};
    this.configSaveError = null;
    this.serverSnapshot = null;
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
    this.categoryActionIndex = null;

    // Bindings
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this._handleBeforeUnload = this._handleBeforeUnload.bind(this);
    this.t = this.t.bind(this);
    this._handleNetworkOffline = this._handleNetworkOffline.bind(this);
    this._handleNetworkOnline = this._handleNetworkOnline.bind(this);
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
  _handleBeforeUnload(event) {
    if (!this.showQuickAdd || !this.querySelector('jk-quick-add')?.hasChanges) return;
    event.preventDefault();event.returnValue='';
  }
  get workspaceItems() { return this.workspaces.map(w => ({ ...w, name: w.name || (w.id === 'default' ? this.t('workspaceDefault') : workspaceLabel(w.id)) })); }

  async cycleWorkspace() {
    const previous = this.actionManager.activeType === 'workspace' ? this.pendingWorkspace : this.workspaceLoading ? this.workspaceRequested : this.workspaceId;
    const index = this.workspaces.findIndex(w=>w.id===previous);
    const target = this.workspaces[(index+1)%this.workspaces.length];
    this.pendingWorkspace = target.id;
    this.cancelInputResetTimer();
    if (!this.preferences.launchDelay) { this.switchWorkspace(target.id); return; }
    const feedback = this.querySelector('jk-action-feedback');
    const action = this.actionManager.start({type:'workspace',cancel:()=>feedback?.cancel()});
    const confirmed = await feedback.show({service:{name:this.workspaceItems.find(w=>w.id===target.id)?.name || target.name,category:this.t('workspace'),icon:'ui:layout-grid'},duration:this.preferences.launchDelay*1000});
    if(!this.actionManager.isActive(action)) return;
    this.actionManager.complete(action);
    if(confirmed) this.switchWorkspace(target.id);
  }
  switchWorkspace(id) { this.showWorkspacePicker=false; this.configSaveError = null; this.serverSnapshot = null; return switchWorkspace(this,id); }

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
    if (this.workspaces.some(w => w.id === this.workspaceId)) {
      const name = workspaceLabel(this.workspaceId, config.workspaceName);
      if (this.workspaces.find(w => w.id === this.workspaceId).name !== name) {
        this.workspaces = this.workspaces.map(w => w.id === this.workspaceId ? { ...w, name } : w);
        // Keep the offline workspace selector consistent after a local edit.
        const cached = readJsonStorage('jumpkey-workspace-manifest', null);
        if (cached?.user === this.workspaceUser && Array.isArray(cached.workspaces)) {
          writeJsonStorage('jumpkey-workspace-manifest', {
            ...cached, workspaces: cached.workspaces.map(w => w.id === this.workspaceId ? { ...w, name } : w)
          });
        }
      }
    }
    this.categories = generateShortcuts(config.categories);
    if (this.activeCategoryKey && !this.categories.some(c => categorySelectionKey(c) === this.activeCategoryKey)) this.resetNavigationInput(false);
    this.searchEngines = config.searchEngines;
    writeJsonStorage(this.storageKeys.configCache, config);
    if (this.workspaces.some(w => w.id === this.workspaceId)) {
      void cacheWorkspace(this.workspaceUser, this.workspaceId, config).catch(() => {});
    }
  }

  reorderCategory(index, direction) { return reorderCategory(this, index, direction); }
  reorderService(id, direction) { return reorderService(this, id, direction); }
  toggleCategory(category) { return toggleCategory(this, category); }

  compareServerConfiguration() { return compareServerConfiguration(this); }
  acceptServerRevision() { return acceptServerRevision(this); }

  async handleSaveConfig(e) {
    if (this.readOnly || this.savingConfig) return;
    this.savingConfig = true;
    this.configSaveError = null;
    this.serverSnapshot = null;
    try {
      const config = await persistConfig(e.detail.newConfig, { base: import.meta.env.BASE_URL });
      this.applyConfiguration(config);
      this.querySelector('jk-config-modal')?.configSaved(config);
      this.showToast(this.t('editConfigSaveDone'), 'success');
    } catch (error) {
      console.error('Configuration save failed:', error);
      this.configSaveError = error.status === 412 ? this.t('configConflict') : error.status === 428 ? this.t('configReloadRequired') : this.t('editConfigSaveFailed');
      this.showToast(this.configSaveError, 'error');
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
      setWorkspaceContext({ user: '', id: 'default', readOnly: false, etag: res.headers.get('ETag') });
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

    this._unsubscribePwa = pwaUpdates.subscribe(state => {
      this.pwaState = state;
      if (state.available && !this._previousPwaAvailable) this.pwaNoticeDismissed=false;
      this._previousPwaAvailable=state.available;
    });
    window.addEventListener('offline', this._handleNetworkOffline);
    window.addEventListener('online', this._handleNetworkOnline);
    window.addEventListener('focus', this._handleNetworkOnline);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('popstate', this.handlePopState);
    window.addEventListener('beforeunload', this._handleBeforeUnload);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribePwa?.();
    window.removeEventListener('offline', this._handleNetworkOffline);
    window.removeEventListener('online', this._handleNetworkOnline);
    window.removeEventListener('focus', this._handleNetworkOnline);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('popstate', this.handlePopState);
    window.removeEventListener('beforeunload', this._handleBeforeUnload);
    clearTimeout(this.resetTimeout);
    this.cancelPendingAction();
  }

  get hasUnsavedDrafts() {
    const settings=this.querySelector('jk-config-modal');
    const manager=settings?.querySelector('jk-management');
    return Boolean(this.savingConfig || settings?._resetting || manager?._busy || this.showQuickAdd && (this.querySelector('jk-quick-add')?.hasChanges || this.querySelector('jk-quick-add')?.saving) ||
      this.showConfigModal && (settings?._hasEditorConfigChanged || manager?.hasUnsavedChanges ||
        settings?.serviceEditor && settings.querySelector('jk-quick-add')?.hasChanges));
  }

  async checkPwaUpdates() {
    this.pwaNoticeDismissed=false;
    await pwaUpdates.check();
  }

  applyPwaUpdate() {
    if (this.hasUnsavedDrafts) {
      this.showToast(this.t('pwaSaveFirst'), 'warn');
      return;
    }
    if (!pwaUpdates.apply()) this.showToast(this.t('pwaUpdateUnavailable'), 'info');
  }

  _handleNetworkOffline() {
    this.offlineMode=true;
    this.readOnly=true;
    const context=this.workspaceUser ? {user:this.workspaceUser,id:this.workspaceId,readOnly:true,etag:null} : null;
    if(context)setWorkspaceContext(context);
  }

  _handleNetworkOnline() {
    if (!this.offlineMode || this.hasUnsavedDrafts || this._reconnectInFlight || navigator.onLine === false) return;
    if (Date.now()-this._lastReconnectAttempt < 10000) return;
    this._lastReconnectAttempt=Date.now();
    this._reconnectInFlight = reconnectWorkspaces(this).catch(() => false).finally(() => { this._reconnectInFlight=null; });
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
        this.currentInput = `${(this.categories.find(c=>categorySelectionKey(c)===this.activeCategoryKey)?.categoryKey || this.categories.find(c=>categorySelectionKey(c)===this.activeCategoryKey)?.category || '').toUpperCase()} → ${service.key.toUpperCase()}`;
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

  openConfig(tab='general') {
    this.configInitialTab=typeof tab==='string'?tab:'general';
    this.configSaveError = null;
    this.serverSnapshot = null;
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
    if (this.categoryActionIndex !== null) {
      const index = this.categoryActionIndex;
      this.actionService = null;
      this.categoryActionIndex = null;
      if(action==='manage')this.openConfig('manage');
      return;
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
    this.quickReturnToSettings = false;
    this.quickSaveConfig = null;
    this.quickConfig = null;
    this._quickExitPrompt = false;
    this.quickInitial = initial;
    this._quickPendingTab = null;
    this.showQuickAdd = true;
  }

  openManagedServiceEditor(detail) {
    this.quickReturnFocus=document.activeElement;
    this.openQuickAdd(detail.initial);
    this.quickReturnToSettings = true;
    this.quickSaveConfig = detail.saveConfig;
    this.quickConfig = detail.config;
    this.quickCategoryIndex = detail.initialCategoryIndex;
    this.quickWorkspaceId = detail.workspaceId;
  }

  requestCloseQuickAdd(targetTab=null) {
    if (this.querySelector('jk-quick-add')?.saving) return;
    this._quickPendingTab=targetTab;
    if (this.querySelector('jk-quick-add')?.hasChanges) this._quickExitPrompt=true;
    else this.closeQuickAdd();
  }

  savedQuickAdd(config) {
    if (!this.quickReturnToSettings || this.quickWorkspaceId===this.workspaceId) this.applyConfiguration(config);
    this.closeQuickAdd();
    this.showToast(this.t('editConfigSaveDone'),'success');
  }

  closeQuickAdd() {
    const destinationTab=this._quickPendingTab;
    this._quickPendingTab=null;
    const restoreFocus=this.quickReturnToSettings?this.quickReturnFocus:null;
    this.showQuickAdd = false;
    this._quickExitPrompt = false;
    if (this.quickReturnToOverview) this.resetNavigationInput(true);
    this.quickReturnToOverview = false;
    this.quickReturnToSettings = false;
    this.quickSaveConfig = null;
    this.quickConfig = null;
    this.quickWorkspaceId = null;
    this.quickCategoryIndex = -1;
    this.quickReturnFocus=null;
    if(destinationTab){
      this.showConfigModal=true;
      this.configInitialTab=destinationTab;
      const settings=this.querySelector('jk-config-modal');
      if(settings)settings._activeTab=destinationTab;
    }
    if(restoreFocus?.isConnected)this.updateComplete.then(()=>this.querySelector('jk-config-modal')?.updateComplete.then(()=>restoreFocus.focus({preventScroll:true})));
  }

  async installApp() {
    this.showMobileMenu = false;
    try { if (await this.installController.install()) return; } catch {}
    this.dialogConfig = { show: true, type: 'info', title: this.t('installApp'),
      message: this.t(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'installIOS' : 'installBrowser'),
      confirmLabel: this.t('close'), onConfirm: null };
  }

  handleWorkspaceManifest(data) {
    if(data.user!==this.workspaceUser)return;
    const previousManifest=readJsonStorage('jumpkey-workspace-manifest',null);
    migrateWorkspaceIDs(data.user,data.renames);
    cleanupRemovedWorkspaceCaches(previousManifest,data);
    this.workspaces=data.workspaces;
    this.workspaceOrderETag=data.orderETag;
    writeJsonStorage('jumpkey-workspace-manifest',data);
    void cacheManifest(data).then(() => reconcileOfflineCache(data.user, data.workspaces.map(w=>w.id), data.renames)).catch(() => {});
    startWorkspacePrefetch(this,data);
    if(!data.workspaces.some(w=>w.id===this.workspaceId)) {
      const newId=data.renames?.[this.workspaceId] || data.workspaces[0]?.id;
      if(newId)this.switchWorkspace(newId);
    }
  }
  handleManagementSaved({id,config,etag}) {
    // A management save may target a workspace different from the dashboard.
    // Refresh that user's offline copy as well, not just the active workspace.
    writeJsonStorage(workspaceStorage(this.workspaceUser,id).configCache,config);
    void cacheWorkspace(this.workspaceUser,id,config,etag).catch(()=>{});
    if(id!==this.workspaceId)return;
    setWorkspaceETag(etag,{id,user:this.workspaceUser});
    this.applyConfiguration(config);
  }

  templateConfigModal() {
    return html`
      <jk-config-modal .workspaceApi=${this.workspaces.length > 0} .readOnly=${this.readOnly}
        .workspaceUser=${this.workspaceUser} .activeWorkspace=${this.workspaceId} .initialTab=${this.showConfigModal?this.configInitialTab:'manage'}
        .workspaceLabel=${this.workspaces.length > 1 ? this.workspaceItems.find(w=>w.id===this.workspaceId)?.name || '' : ''}
        .workspaceFile=${this.workspaces.find(w=>w.id===this.workspaceId)?.file || ''}
        .show=${this.showConfigModal||this.showQuickAdd}
        .serviceEditor=${this.showQuickAdd}
        .serviceConfig=${this.quickConfig}
        .serviceSaveConfig=${this.quickSaveConfig}
        .serviceInitial=${this.quickInitial}
        .serviceCategoryIndex=${this.quickCategoryIndex}
        .serviceReturnToSettings=${this.quickReturnToSettings}
        .serviceWorkspaceLabel=${this.workspaceItems.find(w=>w.id===(this.quickReturnToSettings?this.quickWorkspaceId:this.workspaceId))?.name||(this.quickReturnToSettings?this.quickWorkspaceId:this.workspaceId)}
        .suspended=${false}
        .separateWorkspacePreferences=${this.separateWorkspacePreferences}
        @workspace-preferences-mode=${e=>this.setWorkspacePreferencesMode(e.detail)}
        .preferences=${this.preferences}
        .pwaState=${this.pwaState} .appVersion=${APP_VERSION}
        .offlineMode=${this.offlineMode} .offlineCacheStatus=${this.offlineCacheStatus}
        @pwa-check=${()=>this.checkPwaUpdates()}
        @pwa-apply=${()=>this.applyPwaUpdate()}
        @preferences-change=${e => { this.preferences=e.detail; this.saveLocalPreferences(); this.cancelInputResetTimer(); }}
        .configuration=${this.configuration}
        .saving=${this.savingConfig}
        .saveError=${this.configSaveError}
        .serverSnapshot=${this.serverSnapshot}
        .categories=${this.categories}
        .searchEngines=${this.searchEngines}
        .theme=${this.theme}
        .t=${this.t}
        @notify=${this.handleNotification}
        @theme-change=${this.handleThemeChange}
        @save=${this.handleSaveConfig}
        @dismiss-error=${() => { this.configSaveError = null; }}
        @compare-server=${this.compareServerConfiguration}
        @accept-server-revision=${this.acceptServerRevision}
        @workspaces-refreshed=${e=>this.handleWorkspaceManifest(e.detail)}
        @management-config-saved=${e=>this.handleManagementSaved(e.detail)}
        @open-service-editor=${e=>this.openManagedServiceEditor(e.detail)}
        @service-close-request=${e=>e.detail?.force?this.closeQuickAdd():this.requestCloseQuickAdd()}
        @service-nav-request=${e=>this.requestCloseQuickAdd(e.detail.tab)}
        @service-saved=${e=>this.savedQuickAdd(e.detail)}
        @service-save-error=${()=>{this._quickExitPrompt=false;this._quickPendingTab=null;}}
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
        .hasWorkspaces=${this.workspaces.length > 0}
        .workspaceName=${this.workspaceItems.find(w => w.id === this.workspaceId)?.name || ''}
        @open-workspaces=${() => { this.showMobileMenu = false; this.showWorkspacePicker = true; this.workspaceAnchor = null; }}
        @open-config=${() => { this.showMobileMenu = false; this.openConfig(); }}
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
      ${this.templateConfigModal()}
      ${this.offlineMode ? html`<aside class="jk-offline-banner" role="status"><jk-icon icon="ui:wifi-off" class="size-4"></jk-icon><span>${this.t('pwaOfflineBanner')}</span></aside>` : ''}
      ${this.pwaState.available && !this.pwaNoticeDismissed ? html`
        <aside class="jk-update-banner" role="status" aria-live="polite">
          <div><strong>${this.t('pwaUpdateAvailable')}</strong><p>${this.t('pwaUpdateHint')}</p></div>
          <button type="button" class="jk-btn jk-btn-primary" @click=${()=>this.applyPwaUpdate()}>${this.t('pwaUpdateNow')}</button>
          <button type="button" class="jk-btn jk-btn-secondary" @click=${()=>this.pwaNoticeDismissed=true}>${this.t('pwaUpdateLater')}</button>
        </aside>` : ''}
      ${this.showQuickAdd && this._quickExitPrompt?html`<jk-change-guard .subject=${'Die Service-Eingaben'}
        .destination=${this._quickPendingTab?'zu den Einstellungen wechselst':this.quickReturnToSettings?'zur Verwaltung zurückkehrst':'zum Dashboard zurückkehrst'}
        .busy=${this.querySelector('jk-quick-add')?.saving||false}
        .saveDisabled=${Boolean(this.querySelector('jk-quick-add')?.validationError)}
        @guard-stay=${()=>{this._quickExitPrompt=false;this._quickPendingTab=null;}}
        @guard-discard=${()=>this.closeQuickAdd()}
        @guard-save=${()=>this.querySelector('jk-quick-add')?.save()}></jk-change-guard>`:''}
      ${!this.showConfigModal && !this.showQuickAdd ? html`
      ${this.templateKeyBadge()} ${this.templateActionFeedback()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)}
      ${this.templateMobileMenu()} ${this.templateDialog()}
      ${this.actionService ? html`<jk-service-actions .readOnly=${this.readOnly} .anchor=${this.actionAnchor} .service=${this.actionService}
        .favorite=${Object.values(this.favorites).includes(this.actionService.id)}
        .categoryMode=${this.categoryActionIndex !== null}
        .position=${this.categoryActionIndex !== null ? {index:this.categoryActionIndex, count:this.categories.length} : servicePosition(this.configuration, this.actionService.id)} .t=${this.t}
        @action=${e => this.handleServiceAction(e.detail)}></jk-service-actions>` : ''}
      ${this.showWorkspacePicker ? html`<jk-workspace-picker .readOnly=${this.readOnly} .items=${this.workspaceItems} .active=${this.workspaceId} .anchor=${this.workspaceAnchor} .t=${this.t} @cycle=${async()=>{this.showWorkspacePicker=false;await this.updateComplete;this.cycleWorkspace();}} @close=${()=>this.showWorkspacePicker=false} @select=${e=>this.switchWorkspace(e.detail)} @manage=${()=>{this.showWorkspacePicker=false;this.openConfig('manage');}}></jk-workspace-picker>` : ''}
      <jk-dashboard-header .appVersion=${APP_VERSION} .readOnly=${this.readOnly} ?inert=${this.workspaceLoading}
        .workspaceName=${this.workspaceItems.find(w=>w.id===this.workspaceId)?.name || '—'}
        .hasWorkspaces=${this.workspaces.length > 1 || (!this.readOnly && this.workspaces.length > 0)}
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
      ${renderDashboardContent(this, { favs, continueServices, categoriesWithFavorites, showMain })}
      ` : ''}
            <jk-toast
        .show=${this.toastConfig.show}
        .message=${this.toastConfig.message}
        .type=${this.toastConfig.type}
        @toast-closed=${() => {
          this.toastConfig = { ...this.toastConfig, show: false };
        }}
      ></jk-toast>


    `;
  }
}

customElements.define('dashboard-app', DashboardApp);
