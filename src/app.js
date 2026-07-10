import { LitElement, html } from 'lit'
import { createIcons, icons } from 'lucide'
import { t, detectLang } from './i18n.js'
import { generateShortcuts, getFilteredServices, getTopFavorites } from './shortcuts.js'

class DashboardApp extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    categories:      { type: Array },
    activeCategoryKey: { type: String },
    currentInput:    { type: String },
    isInvalidInput:  { type: Boolean },
    isValidInput:    { type: Boolean },
    searchQuery:     { type: String },
    showSearch:      { type: Boolean },
    showHelp:        { type: Boolean },
    isGridView:      { type: Boolean }, // <-- Added property
    selectedIndex:   { type: Number },
    timeString:      { type: String },
    dateString:      { type: String },
    favorites:       { type: Object },
    lang:            { type: String }
  };

  constructor() {
    super();
    this.categories      = [];
    this.activeCategoryKey = '';
    this.currentInput    = '';
    this.isInvalidInput  = false;
    this.isValidInput    = false;
    this.searchQuery     = '';
    this.showSearch      = false;
    this.showHelp        = false;
    this.isGridView      = JSON.parse(localStorage.getItem('dashboard_grid_view')) || false; // <-- Loaded from storage
    this.selectedIndex   = 0;
    this.timeString      = '';
    this.dateString      = '';
    this.favorites       = JSON.parse(localStorage.getItem('dashboard_favs')) || {};
    this.resetTimeout    = null;
    this.lang            = detectLang();

    this.handleKeyDown  = this.handleKeyDown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  t(key) { return t(this.lang, key); }

  // --- Lifecycle ---

  async connectedCallback() {
    super.connectedCallback();
    try {
      const res  = await fetch('./services.json');
      const data = await res.json();
      localStorage.setItem('services-cache', JSON.stringify(data));
      this.categories = generateShortcuts(data);
    } catch {
      const cached = localStorage.getItem('services-cache');
      if (cached) this.categories = generateShortcuts(JSON.parse(cached));
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('popstate', this.handlePopState);
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
    this.updateComplete.then(() => createIcons({ icons }));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('popstate', this.handlePopState);
    clearInterval(this.timeInterval);
  }

  updated() { createIcons({ icons }); }

  // --- State helpers ---

  updateTime() {
    const locale = this.lang === 'de' ? 'de-DE' : 'en-US';
    const now = new Date();
    this.timeString = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    this.dateString = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  resetInput(updateHistory = true) {
    this.activeCategoryKey = '';
    this.currentInput      = '';
    this.isInvalidInput    = false;
    this.isValidInput      = false;
    this.showSearch        = false;
    this.showHelp          = false;
    this.searchQuery       = '';
    this.selectedIndex     = 0;
    if (updateHistory && window.history.state?.view === 'category') window.history.back();
  }

  toggleViewMode() {
    this.isGridView = !this.isGridView;
    localStorage.setItem('dashboard_grid_view', JSON.stringify(this.isGridView));
    this.resetInput(true);
    this.updateComplete.then(() => {
    import('lucide').then(({ createIcons, icons }) => createIcons({ icons }));
  });
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

  clearFavorites() {
    if (confirm(this.t('confirmReset'))) {
      this.favorites = {};
      localStorage.removeItem('dashboard_favs');
      this.requestUpdate();
    }
  }

  // --- Event handlers ---

  handlePopState(e) {
    if (!e.state?.view) this.resetInput(false);
  }

  openSearch() {
    this.showHelp   = false;
    this.showSearch = true;
    this.selectedIndex = 0;
    setTimeout(() => this.querySelector('#searchInput')?.focus(), 100);
  }

  handleSearchInput(e) {
    this.searchQuery   = e.target.value;
    this.selectedIndex = 0;
  }

  handleCategoryUISelection(cat, event) {
    if (event?.screenX === 0 && event?.screenY === 0) return;
    this.activeCategoryKey = cat.categoryKey;
    this.currentInput      = cat.categoryKey.toUpperCase();
    this.isInvalidInput    = false;
    this.isValidInput      = false;
    clearTimeout(this.resetTimeout);
    window.history.pushState({ view: 'category', key: cat.categoryKey }, '');
  }

  handleKeyDown(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const filtered = getFilteredServices(this.categories, this.searchQuery);

    if (this.showSearch) {
      if (e.key === 'Escape')    { this.resetInput(true); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.selectedIndex = (this.selectedIndex + 1) % filtered.length; this.scrollToSelected(); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); this.selectedIndex = (this.selectedIndex - 1 + filtered.length) % filtered.length; this.scrollToSelected(); return; }
      if (e.key === 'Enter')     { e.preventDefault(); if (filtered[this.selectedIndex]) this.trackClick(filtered[this.selectedIndex]); return; }
      return;
    }

    if (this.showHelp) { e.preventDefault(); this.showHelp = false; return; }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Escape')              { this.resetInput(true); return; }
    if (e.key === '?')                   { e.preventDefault(); this.showHelp = true; return; }
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); this.openSearch(); return; }
    
    // Bind 'v' key to toggle layouts when no category is actively opened
    if (e.key.toLowerCase() === '#' && !this.activeCategoryKey) {
      e.preventDefault();
      this.toggleViewMode();
      return;
    }

    if (e.key.length !== 1) return;

    const key = e.key.toLowerCase();

    if (!this.activeCategoryKey) {
      // Direct favorites can only be run via 1-0 hotkeys if we are NOT in full grid view mode
      if (/^[0-9]$/.test(key) && !this.isGridView) {
        const favService = getTopFavorites(this.categories, this.favorites).find(s => s.key === key);
        if (favService) { this.currentInput = key.toUpperCase(); this.trackClick(favService, true); return; }
      }
      if (this.categories.some(c => c.categoryKey === key)) {
        this.activeCategoryKey = key;
        this.currentInput      = key.toUpperCase();
        this.isInvalidInput    = false;
        this.startResetTimer();
        window.history.pushState({ view: 'category', key }, '');
      } else {
        this.currentInput   = key.toUpperCase();
        this.isInvalidInput = true;
        this.startResetTimer(1500);
      }
    } else {
      this.currentInput += ` → ${key.toUpperCase()}`;
      const cat = this.categories.find(c => c.categoryKey === this.activeCategoryKey);
      const service = cat?.services?.find(s => s.key === key);
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
    setTimeout(() => this.querySelector('.search-item-active')?.scrollIntoView({ block: 'nearest' }), 10);
  }

  // --- Templates ---

  renderIcon(icon, extraClass = 'w-6 h-6') {
    if (!icon) return html`<i data-lucide="help-circle" class="${extraClass}"></i>`;
    if (/\.(png|jpe?g|svg|webp)$/i.test(icon)) {
      return html`
        <img src="./icons/${icon}" alt="" class="${extraClass} object-contain"
             @error="${e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}">
        <i data-lucide="globe" class="${extraClass} hidden"></i>
      `;
    }
    return html`<i data-lucide="${icon}" class="${extraClass}"></i>`;
  }

  templateHeader() {
    return html`
      <div class="flex flex-row justify-between items-center mb-8 sm:mb-12 border-b border-slate-800 pb-6 gap-4">
        <div class="flex items-center gap-4">
          <a href="https://github.com/desirevolution/jump-key" target="_blank" rel="noopener noreferrer"
             class="transition-transform hover:scale-105 active:scale-95 block shrink-0">
            <img src="./jump-key.png" alt="JumpKey Logo" class="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-lg shadow-md cursor-pointer">
          </a>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">JumpKey</h1>
            <button @click="${() => this.showHelp = true}"
                    class="text-xs text-slate-500 hover:text-indigo-400 font-mono mt-1 text-left flex items-center gap-1.5 transition-colors">
              <i data-lucide="help-circle" class="w-3.5 h-3.5"></i> ${this.t('helpHint')}
            </button>
          </div>
        </div>
        <div class="flex items-center gap-3 font-mono">

<button @click="${this.toggleViewMode}"
        class="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors shadow-md group"
        title="${this.t('hkToggleView')} [#]">
  ${this.isGridView ? html`
    <i data-lucide="rows-2" class="w-5 h-5 group-hover:text-indigo-400 transition-colors"></i>
  ` : html`
    <i data-lucide="layout-grid" class="w-5 h-5 group-hover:text-indigo-400 transition-colors"></i>
  `}
</button>

          <button @click="${this.openSearch}"
                  class="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors shadow-md group"
                  title="Suche [Space]">
            <i data-lucide="search" class="w-5 h-5 group-hover:text-indigo-400 transition-colors"></i>
          </button>
          <div class="text-right ml-2">
            <div class="text-2xl sm:text-4xl font-bold text-indigo-400 tracking-wider">${this.timeString}</div>
            <div class="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">${this.dateString}</div>
          </div>
        </div>
      </div>
    `;
  }

  templateHelpModal() {
    if (!this.showHelp) return '';
    const shortcuts = [
      { keys: ['Space'],          desc: this.t('hkSearch') },
      { keys: ['#'],              desc: this.t('hkToggleView') }, // <-- Added
    ];
    
    if (!this.isGridView) {
      shortcuts.push({ keys: ['1', '↓', '0'], desc: this.t('hkFavs') });
    }

    shortcuts.push(
      { keys: ['A-Z'],            desc: this.t('hkCat') },
      { keys: ['A-Z'],            desc: this.t('hkService'), context: true },
      { keys: ['ESC'],            desc: this.t('hkReset') }
    );

    return html`
      <div @click="${() => this.showHelp = false}"
           class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
        <div @click="${e => e.stopPropagation()}"
             class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative font-mono text-slate-300">
          <div class="flex items-center justify-between mb-6 border-b border-slate-700 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <i data-lucide="keyboard" class="text-indigo-400 w-5 h-5"></i> ${this.t('helpTitle')}
            </h3>
            <button @click="${() => this.showHelp = false}"
                    class="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 p-1.5 rounded-lg transition-colors">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="space-y-4">
            ${shortcuts.map(item => html`
              <div class="flex items-center justify-between gap-4 py-1.5 border-b border-slate-700/30">
                <span class="text-sm text-slate-400">${item.desc}</span>
                <div class="flex items-center gap-1 shrink-0">
                  ${item.context ? html`<span class="text-[10px] bg-slate-900 px-1 py-0.5 rounded text-indigo-400 mr-1 uppercase">In Cat</span>` : ''}
                  ${item.keys.map(k => html`<kbd class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-indigo-400 shadow shadow-black/40">${k}</kbd>`)}
                </div>
              </div>
            `)}
          </div>
          <div class="text-[11px] text-slate-500 text-center mt-6">${this.t('helpExit')}</div>
        </div>
      </div>
    `;
  }

  templateKeyBadge() {
    if (!this.currentInput || this.showSearch || this.showHelp) return '';
    const stateClass = this.isInvalidInput
      ? 'bg-rose-600 text-white border-rose-400 animate-bounce'
      : this.isValidInput
        ? 'bg-emerald-600 text-white border-emerald-400 scale-105 shadow-emerald-900/50'
        : 'bg-indigo-600 text-white border-indigo-400 animate-pulse';
    return html`
      <div class="fixed bottom-6 right-6 font-mono text-xl font-bold px-4 py-2 rounded-lg shadow-2xl border z-50 animate-fadeIn hidden sm:block transition-all duration-150 ${stateClass}">
        ${this.currentInput}
      </div>
    `;
  }

  templateSearchModal(filteredServices) {
    if (!this.showSearch) return '';
    return html`
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-24 z-50 animate-fadeIn">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden mx-4 flex flex-col max-h-[80vh]">
          <div class="p-4 border-b border-slate-700 flex items-center gap-3 shrink-0">
            <i data-lucide="search" class="text-slate-400 w-5 h-5"></i>
            <input id="searchInput" type="text" placeholder="${this.t('searchPlaceholder')}"
                   @input="${this.handleSearchInput}"
                   class="bg-transparent w-full focus:outline-none text-base sm:text-lg text-white placeholder-slate-500">
            <button @click="${() => this.resetInput(true)}"
                    class="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded sm:hidden">${this.t('close')}</button>
          </div>
          <div class="overflow-y-auto p-2 space-y-1 grow">
            ${filteredServices.map((s, i) => html`
              <button @click="${() => this.trackClick(s)}"
                      class="w-full flex items-center justify-between p-3 rounded-xl transition-all text-left
                             ${i === this.selectedIndex ? 'search-item-active sm:bg-indigo-600 text-white' : 'hover:bg-slate-700/30 text-slate-300'}
                             active:bg-indigo-600 active:text-white">
                <div class="flex items-center gap-3">
                  ${this.renderIcon(s.icon, 'w-6 h-6')}
                  <div>
                    <span class="font-medium block sm:inline">${s.name}</span>
                    <span class="text-xs opacity-60 sm:ml-1">(${s.category})</span>
                  </div>
                </div>
                ${i === this.selectedIndex ? html`<span class="text-xs font-mono bg-indigo-700 px-2 py-0.5 rounded shadow hidden sm:inline">Enter</span>` : ''}
              </button>
            `)}
            ${this.searchQuery && filteredServices.length === 0 ? html`
              <p class="text-center text-slate-500 text-sm py-4">${this.t('noServices')}</p>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // --- 1. Unified Favorites Template ---
  templateFavorites(favs) {
    if (favs.length === 0 || this.isGridView) return '';
    return html`
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">${this.t('frequent')}</h2>
          <button @click="${this.clearFavorites}"
                  class="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> ${this.t('resetFavs')}
          </button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:gap-4" style="grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));">
          ${favs.map(s => html`
            <button @click="${() => this.trackClick(s, true)}"
                    class="group text-left flex items-center gap-4 w-full p-4 sm:p-5 bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all active:scale-[0.98] relative min-w-0">
              <div class="shrink-0 flex items-center justify-center">
                ${this.renderIcon(s.icon, 'w-12 h-12 text-indigo-400')}
              </div>
              <div class="overflow-hidden pr-8 grow min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-slate-200 group-hover:text-white leading-tight break-words">${s.name}</h3>
                <p class="text-xs text-slate-500 truncate block mt-1">${s.url.replace('https://', '')}</p>
              </div>
              <kbd class="absolute top-4 right-4 px-2 py-0.5 font-bold font-mono text-xs sm:text-sm text-indigo-400 bg-slate-900 border border-slate-700 rounded shadow-md shadow-black/40 hidden sm:inline">
                ${s.key}
              </kbd>	    
            </button>
          `)}
        </div>
      </div>
    `;
  }

  // --- 2. Unified Primary Categories List Template ---
  templateCategoriesList() {
    return html`
      <div>
        <h2 class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">${this.t('categories')}</h2>
        <div class="grid grid-cols-1 gap-3 sm:gap-4" style="grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));">
          ${this.categories.map(cat => html`
            <button @click="${e => this.handleCategoryUISelection(cat, e)}"
                    class="group text-left flex items-center gap-4 w-full p-4 sm:p-5 bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all active:scale-[0.98] relative min-w-0">
              <div class="shrink-0 flex items-center justify-center">
                ${this.renderIcon(cat.icon, 'w-12 h-12 text-indigo-400')}
              </div>
              <div class="overflow-hidden pr-8 grow min-w-0">
                <h3 class="text-sm sm:text-base font-semibold text-slate-200 group-hover:text-white leading-tight break-words">${cat.category}</h3>
                <p class="text-xs text-slate-500 block mt-1">
                  ${cat.services?.length ?? 0} ${this.t('services')}
                </p>
              </div>
              <kbd class="absolute top-4 right-4 px-2 py-0.5 font-bold font-mono text-lg sm:text-sm text-indigo-400 bg-slate-900 border border-slate-700 rounded shadow-md shadow-black/40 hidden sm:inline">
                ${cat.categoryKey?.toUpperCase() ?? ''}
              </kbd>
            </button>
          `)}
        </div>
      </div>
    `;
  }

  // --- 3. Unified All-in-One Full Grid View Template ---
  templateFullGridView() {
    return html`
      <div class="animate-fadeIn space-y-5">
        ${this.categories.map(cat => html`
          <div class="border-b border-slate-800/40 pb-5 last:border-0">
            <div class="flex items-center gap-3 mb-3">
              <kbd class="px-2 py-0.5 font-bold font-mono text-xs text-indigo-400 bg-slate-900 border border-indigo-500/30 rounded">
                ${cat.categoryKey?.toUpperCase() ?? ''}
              </kbd>
              ${cat.icon ? this.renderIcon(cat.icon, 'w-4 h-4 text-indigo-400/80') : ''}
              <h2 class="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">${cat.category}</h2>
            </div>
            
            <div class="grid grid-cols-1 gap-3 sm:gap-4" style="grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));">
              ${(cat.services ?? []).map(service => html`
                <button @click="${() => this.trackClick(service)}"
                        class="group text-left flex items-center gap-4 w-full p-4 sm:p-5 bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all active:scale-[0.98] relative min-w-0">
                  <div class="shrink-0 flex items-center justify-center">
                    ${this.renderIcon(service.icon, 'w-12 h-12 text-indigo-400')}
                  </div>
                  <div class="overflow-hidden pr-8 grow min-w-0">
                    <h3 class="text-sm sm:text-base font-semibold text-slate-200 group-hover:text-white leading-tight break-words">${service.name}</h3>
                    <p class="text-xs text-slate-500 truncate block mt-1">${service.url.replace('https://', '')}</p>
                  </div>
                  <kbd class="absolute top-4 right-4 px-2 py-0.5 font-bold font-mono text-lg sm:text-sm text-indigo-400 bg-slate-900 border border-slate-700 rounded shadow-md shadow-black/40 hidden sm:inline">
                    ${service.key?.toUpperCase() ?? ''}
                  </kbd>
                </button>
              `)}
            </div>
          </div>
        `)}
      </div>
    `;
  }

  templateServicesGrid(activeGroup) {
    if (!this.activeCategoryKey || !activeGroup || this.showSearch) return '';
    return html`
      <div class="animate-fadeIn">
        <div class="flex items-center gap-3 mb-6">
          <button @click="${() => this.resetInput(true)}"
                  class="text-slate-400 hover:text-white text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-all">
            ← ${this.t('back')}
          </button>
          <span class="text-slate-600 hidden sm:inline">/</span>
          <span class="text-xl font-bold text-indigo-400 font-mono hidden sm:inline">[${activeGroup.categoryKey?.toUpperCase() ?? ''}]</span>
          ${activeGroup.icon ? this.renderIcon(activeGroup.icon, 'w-6 h-6 text-indigo-400') : ''}
          <h2 class="text-lg sm:text-xl font-bold text-slate-200">${activeGroup.category}</h2>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:gap-6" style="grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));">
          ${activeGroup.services.map(service => html`
            <button @click="${() => this.trackClick(service)}"
                    class="group text-left flex items-center gap-4 w-full p-4 sm:p-5 bg-slate-800 border border-indigo-500/20 hover:border-indigo-500 rounded-xl transition-all shadow-md active:scale-[0.98] relative min-w-0">
              <div class="shrink-0 flex items-center justify-center">
                ${this.renderIcon(service.icon, 'w-12 h-12 text-indigo-400')}
              </div>
              <div class="overflow-hidden pr-8 grow min-w-0">
                <h3 class="text-sm sm:text-lg font-semibold text-slate-200 group-hover:text-white leading-tight break-words">${service.name}</h3>
                <p class="text-xs text-slate-500 truncate mt-1">${service.url.replace('https://', '')}</p>
              </div>
              <kbd class="absolute top-4 right-4 px-2 py-0.5 font-bold font-mono text-xs sm:text-sm bg-indigo-600 text-white rounded shadow shadow-indigo-500/50 hidden sm:inline">
                ${service.key?.toUpperCase() ?? ''}
              </kbd>
            </button>
          `)}
        </div>
      </div>
    `;
  }

  render() {
    const favs            = getTopFavorites(this.categories, this.favorites);
    const filteredServices = getFilteredServices(this.categories, this.searchQuery);
    const activeGroup     = this.categories.find(c => c.categoryKey === this.activeCategoryKey);
    const showMain        = !this.activeCategoryKey && !this.showSearch && !this.showHelp;

    return html`
      ${this.templateHeader()}
      ${this.templateKeyBadge()}
      ${this.templateHelpModal()}
      ${this.templateSearchModal(filteredServices)}
      ${showMain ? html`
        ${this.isGridView ? this.templateFullGridView() : html`
          <div class="animate-fadeIn space-y-8 sm:space-y-10">
            ${this.templateFavorites(favs)}
            ${this.templateCategoriesList()}
          </div>
        `}
      ` : ''}
      ${this.templateServicesGrid(activeGroup)}
    `;
  }
}

customElements.define('dashboard-app', DashboardApp);
