import { LitElement, html } from 'lit';
import { t, detectLang } from './utils/i18n.js';
import { generateShortcuts, getFilteredServices, getFavorites } from './utils/shortcuts.js';
import { handleGlobalKeyDown } from './utils/keyboard-handler.js';

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

const styles = {
  badgeBase: `fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-sm border shadow-xl font-mono text-lg font-bold transition-all duration-200 animate-fadeIn hidden sm:flex`,
  badgeInvalid: `border-rose-500/50 text-rose-300 shadow-rose-950/50`,
  badgeValid: `border-emerald-500/50 text-emerald-300 shadow-emerald-950/50`,
  badgeDefault: `border-indigo-500/50 text-indigo-300 shadow-indigo-950/50`,
  kbd: `px-2 py-1 rounded-md bg-slate-800 border border-slate-700 shadow-inner tracking-wider`,
  iconBadge: `w-4 h-4`,
  mainContent: `container mx-auto px-4 pt-8 pb-6`,
};

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
    dialogConfig: { type: Object },
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
    this.resetTimeout = null;
    this.lang = detectLang();

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

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.t = this.t.bind(this); // Wichtig für die direkte Referenzübergabe (.t=${this.t})
    this.favorites = JSON.parse(localStorage.getItem('dashboard_favs')) || {};
    this.favoriteRecording = null; // Neuer Zustand für die Tastatur-Aufnahme
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

  trackClick(service) {
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
    // Optimiert: Nutzt gecashten Query-Fokus statt querySelector
    setTimeout(() => this.searchInput?.focus(), 100);
  }

  _closeDialog() {
    this.dialogConfig = { ...this.dialogConfig, show: false };
  }

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

  // Automatische Zuweisung für Mobile / Desktop Long-Press im normalen Grid
  handleServiceLongPress(service) {
    const slots = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    // 1. Prüfen, ob der Service bereits in den Favoriten existiert
    const alreadyFavSlot = slots.find((slot) => this.favorites[slot] === service.name);
    if (alreadyFavSlot) {
      this.currentInput = `${service.name.toUpperCase()} IST BEREITS AUF TASTE ${alreadyFavSlot}`;
      this.isInvalidInput = true;
      this.startResetTimer(1500);
      this.requestUpdate();
      return;
    }

    // 2. Nächsten freien Slot ermitteln
    const nextFreeSlot = slots.find((slot) => !this.favorites[slot]);

    // 3. Wenn alle Slots voll sind, Dialog anzeigen
    if (!nextFreeSlot) {
      this.dialogConfig = {
        show: true,
        type: 'error',
        title: this.t('errorTitle') || 'Favoriten voll',
        message: 'Alle Favoriten-Slots (1-0) sind bereits belegt! Lösche zuerst einen Favoriten.',
        confirmLabel: this.t('tabEditorOk') || 'OK',
      };
      this.requestUpdate();
      return;
    }

    // 4. Favorit automatisch zuweisen und speichern
    this.favorites[nextFreeSlot] = service.name;
    localStorage.setItem('dashboard_favs', JSON.stringify(this.favorites));

    // 5. Visuelles Feedback über das KeyBadge geben
    this.currentInput = `FAV ${nextFreeSlot}: ${service.name.toUpperCase()}`;
    this.isValidInput = true;

    this.startResetTimer(2000);
    this.requestUpdate();
  }

  // Löschen via Long-Press aus der Favoriten-Leiste heraus
  handleDeleteFavoriteSlot(slot) {
    const serviceName = this.favorites[slot];
    if (!serviceName) return;

    this.dialogConfig = {
      show: true,
      title: 'Favorit entfernen?',
      message: `Möchtest du den Favoriten "${serviceName}" von Taste ${slot} löschen?`,
      icon: 'trash-2',
      iconColor: 'text-rose-400',
      confirmLabel: this.t('confirmResetConfirm') || 'Löschen',
      cancelLabel: this.t('cancel') || 'Abbrechen',
      onConfirm: () => {
        delete this.favorites[slot];
        localStorage.setItem('dashboard_favs', JSON.stringify(this.favorites));
        this.requestUpdate();
      },
    };
    this.requestUpdate();
  }

  _handleNotification(e) {
    const { type, message } = e.detail;
    this.dialogConfig = {
      show: true,
      type: type,
      title: type === 'success' ? this.t('successTitle') : this.t('errorTitle'),
      message: message,
      confirmLabel: this.t('tabEditorOk'),
    };
  }

  handleKeyDown(e) {
    handleGlobalKeyDown(e, this);
  }

  scrollToSelected() {
    setTimeout(() => {
      // Optimiert: Nutzt die über @query gecashten DOM-Knoten
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

  // --- Backend Sync (WebDAV) ---

  async saveConfiguration(newConfig, oldConfig) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupResponse = await fetch(`/config/services.backup-${timestamp}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: oldConfig,
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
        this.categories = generateShortcuts(newConfig.categories || newConfig);
        if (newConfig.searchEngines) this.searchEngines = newConfig.searchEngines;

        this.showConfigModal = false;
        this.dialogConfig = {
          show: true,
          title: this.t('tabEditorSaveDoneTitle'),
          message: this.t('tabEditorSaveDone'),
          icon: 'circle-check',
          iconColor: 'text-emerald-400',
          confirmLabel: this.t('tabEditorOk'),
        };
      } else {
        throw new Error('Failed to save configuration.');
      }
    } catch (error) {
      console.error('WebDAV Error:', error);
      this.dialogConfig = {
        show: true,
        title: this.t('tabEditorSaveFailedTitle'),
        message: this.t('tabEditorSaveFailed'),
        icon: 'triangle-alert',
        iconColor: 'text-rose-400',
        confirmLabel: this.t('tabEditorOk'),
      };
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
        .show="${this.showConfigModal}"
        .categories="${this.categories}"
        .searchEngines="${this.searchEngines}"
        .t=${this.t}
        @notify="${this._handleNotification}"
        @close="${() => (this.showConfigModal = false)}"
      ></jk-config-modal>
    `;
  }

  templateDialog() {
    if (!this.dialogConfig.show) return '';

    return html`
      <jk-dialog
        .show="${this.dialogConfig.show}"
        .type="${this.dialogConfig.type || 'info'}"
        .title="${this.dialogConfig.title}"
        .message="${this.dialogConfig.message}"
        .icon="${this.dialogConfig.icon || ''}"
        .iconColor="${this.dialogConfig.iconColor || ''}"
        .confirmLabel="${this.dialogConfig.confirmLabel || this.t('tabEditorOk')}"
        .cancelLabel="${this.dialogConfig.cancelLabel || ''}"
        @confirm="${() => {
          if (this.dialogConfig.onConfirm) this.dialogConfig.onConfirm();
          this._closeDialog();
        }}"
        @close="${this._closeDialog}"
        @cancel="${this._closeDialog}"
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
        @service-click=${(e) => this.trackClick(e.detail.service)}
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
    if (!this.currentInput || this.showSearch || this.showHelp) return '';

    const stateClass = this.isInvalidInput
      ? styles.badgeInvalid
      : this.isValidInput
        ? styles.badgeValid
        : styles.badgeDefault;

    return html`
      <div class="${styles.badgeBase} ${stateClass}">
        <kbd class="${styles.kbd}"> ${this.currentInput} </kbd>
        ${this.isValidInput ? html`<jk-icon icon="check" class="${styles.iconBadge} text-emerald-400"></jk-icon>` : ''}
        ${this.isInvalidInput ? html`<jk-icon icon="x" class="${styles.iconBadge} text-rose-400"></jk-icon>` : ''}
      </div>
    `;
  }

  render() {
    const favs = getFavorites(this.categories, this.favorites);
    const filteredServices = getFilteredServices(this.categories, this.searchQuery);
    const showMain =
      !this.activeCategoryKey && !this.showSearch && !this.showHelp && !this.showConfigModal;

    return html`
      <!-- Global Overlays -->
      ${this.templateKeyBadge()} ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)} ${this.templateConfigModal()}
      ${this.templateDialog()}

      <!-- Header -->
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

      <!-- Main Content -->
      <main class="${styles.mainContent}">
        ${
          showMain && !this.isGridView
            ? html`
                <jk-favorites-view
                  .favorites=${favs}
                  .t=${this.t}
                  @service-click=${(e) => this.trackClick(e.detail.service)}
                  @clear-favorites=${this.clearFavorites}
                  @delete-favorite-slot=${(e) => this.handleDeleteFavoriteSlot(e.detail.slot)}
                ></jk-favorites-view>

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
                    window.history.pushState({ view: 'category', key }, '');
                  }}
                ></jk-service-group>
              `
            : html`
                <jk-grid-view
                  .categories=${this.categories}
                  .activeCategoryKey=${this.activeCategoryKey}
                  .t=${this.t}
                  @service-click=${(e) => this.trackClick(e.detail.service)}
                  @card-long-press=${(e) => this.handleServiceLongPress(e.detail.service)}
                ></jk-grid-view>
              `
        }
      </main>
    `;
  }
}

customElements.define('dashboard-app', DashboardApp);
