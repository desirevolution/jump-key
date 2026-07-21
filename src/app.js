import { html, LitElement } from 'lit';
import { detectLang, t } from './utils/i18n.js';
import {
  generateShortcuts,
  getFavorites,
  getFilteredServices,
} from './utils/shortcuts.js';
import { handleGlobalKeyDown } from './utils/keyboard/index.js';

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

const styles = {
  badgeBase:
    'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-sm border shadow-xl font-mono text-lg font-bold transition-all duration-200 animate-fadeIn hidden sm:flex',
  badgeInvalid: 'border-rose-500/50 text-rose-300 shadow-rose-950/50',
  badgeValid: 'border-emerald-500/50 text-emerald-300 shadow-emerald-950/50',
  badgeDefault: 'border-indigo-500/50 text-indigo-300 shadow-indigo-950/50',
  kbd: 'px-2 py-1 rounded-md bg-slate-800 border border-slate-700 shadow-inner tracking-wider',
  iconBadge: 'w-4 h-4',
  mainContent: 'container mx-auto px-4 pt-8 pb-6',
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
    // Layout
    isGridView: { type: Boolean },
    // Keyboard navigation
    selectedIndex: { type: Number },
    // Data
    favorites: { type: Object },
    lang: { type: String },
    // Feedback UI
    dialogConfig: { type: Object },
    toastConfig: { type: Object },
  };

  get searchInput() {
    return this.querySelector('#searchInput');
  }

  get searchResultsContainer() {
    return this.querySelector('.search-results');
  }

  get activeSearchItem() {
    return this.querySelector('.search-item-active');
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
    this.isInvalidInput = false;
    this.isValidInput = false;
    this.isGridView =
      JSON.parse(localStorage.getItem('dashboard_grid_view')) || false;

    // User Data & Search
    this.favorites = JSON.parse(localStorage.getItem('dashboard_favs')) || {};
    this.searchQuery = '';
    this.lang = detectLang();

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

  t(key) {
    return t(this.lang, key);
  }

  handleKeyDown(e) {
    handleGlobalKeyDown(e, this);
  }

  // --------------------------------------------------
  // Lifecycle
  // --------------------------------------------------

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
    localStorage.setItem(
      'dashboard_grid_view',
      JSON.stringify(this.isGridView)
    );
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

    window.history.pushState({ view: 'search' }, '');
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
      iconColor: 'text-rose-400',
      confirmLabel: this.t('confirmResetConfirm'),
      cancelLabel: this.t('cancel'),
      onConfirm: () => {
        this.favorites = {};
        localStorage.removeItem('dashboard_favs');
        this.requestUpdate();
      },
    };
  }

  handleServiceLongPress(service) {
    const slots = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const existingSlot = slots.find(
      (slot) => this.favorites[slot] === service.name
    );

    if (existingSlot) {
      this.handleDeleteFavoriteSlot(existingSlot);
      return;
    }

    const freeSlot = slots.find((slot) => !this.favorites[slot]);
    if (!freeSlot) {
      this.showToast('Alle Favoritenplätze sind belegt', 'error');
      return;
    }

    this.favorites[freeSlot] = service.name;
    localStorage.setItem('dashboard_favs', JSON.stringify(this.favorites));

    this.resetInput(true);

    this.showToast(
      `"${service.name}" als Favorit auf Taste ${freeSlot} gespeichert`,
      'success',
      true
    );
    this.requestUpdate();
  }

  handleCardLongPress(e) {
    const service = e.detail.service;

    // Prüfen, ob es sich um eine Kategorie handelt
    if (service && (service.isCategory === true || service.key)) {
      if (service.isCategory || !service.url || service.key) {
        this.showToast(this.t('cannotFavoriteCategory'), 'info');
        return;
      }
    }

    // Wenn es ein echter Service ist, ab zur Favoriten-Logik
    this.handleServiceLongPress(service);
  }

  handleDeleteFavoriteSlot(slot) {
    const serviceName = this.favorites[slot];
    if (!serviceName) return;

    this.lastDeletedFavorite = { slot, name: serviceName };

    delete this.favorites[slot];
    localStorage.setItem('dashboard_favs', JSON.stringify(this.favorites));

    this.showToast(
      `"${serviceName}" von Taste ${slot} entfernt`,
      'success',
      true
    );

    this.resetInput(false);
    this.requestUpdate();
  }

  handleNotification(e) {
    const { type, message } = e.detail;
    this.showToast(message, type);
  }

  // --------------------------------------------------
  // Search Scrolling
  // --------------------------------------------------

  scrollToSelected() {
    setTimeout(() => {
      const active = this.activeSearchItem;
      const container = this.searchResultsContainer;

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

  // --------------------------------------------------
  // Layout Helper Snippets
  // --------------------------------------------------

  templateConfigModal() {
    return html`
      <jk-config-modal
        .show=${this.showConfigModal}
        .categories=${this.categories}
        .searchEngines=${this.searchEngines}
        .t=${this.t}
        @notify=${this.handleNotification}
        @close=${() => (this.showConfigModal = false)}
      ></jk-config-modal>
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
      ${this.templateConfigModal()} ${this.templateDialog()}

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
                    url: `${cat.services?.length ?? 0} ${this.t('serviceCount') || 'Services'}`,
                    icon: cat.icon,
                    key: cat.categoryKey,
                    isCategory: true,
                  }))}
                  @service-click=${(e) => {
                    const key = e.detail.service.key;
                    this.activeCategoryKey = key;
                    this.currentInput = key.toUpperCase();

                    // NEU: Reset-Timer auch beim Mausklick starten!
                    this.startResetTimer();

                    window.history.pushState({ view: 'category', key }, '');
                  }}
                  @card-long-press=${this.handleCardLongPress}
                ></jk-service-group>
              `
            : html`
                <jk-grid-view
                  .categories=${this.categories}
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
