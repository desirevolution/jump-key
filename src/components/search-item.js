import { html, LitElement } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import './icon.js';

// 1. Externalized static base style configurations
const styles = {
  itemBase: `group relative w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 text-left overflow-hidden`,
  accentBar: `absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-500`,
  iconWrapper: `flex items-center justify-center size-10 shrink-0 rounded-lg bg-slate-700/60 ring-1 transition-all duration-200`,
  icon: `size-5`,
  layoutWrapper: `flex items-center gap-3 min-w-0 grow`,
  contentCell: `min-w-0 grow`,
  metaCell: `ml-4 shrink-0`,
  kbdBase: `flex items-center justify-center h-7 px-2 rounded-lg border text-xs font-semibold tracking-widest uppercase`,
  enterKbd: `hidden sm:flex items-center justify-center h-7 px-3 rounded-lg border border-indigo-500 bg-indigo-500/20 text-xs font-semibold tracking-widest uppercase text-indigo-200`,

  // Specific internal sub-content layouts
  engineTitle: `truncate text-base font-semibold tracking-tight text-white`,
  engineUrl: `mt-0.5 truncate text-sm text-slate-400`,
  previewPrefix: `text-sm text-slate-400`,
  previewText: `truncate mt-0.5 text-white`,
  previewTerms: `italic text-indigo-300 ml-2`,
  serviceTitle: `truncate text-base font-semibold tracking-tight text-white`,
  serviceCategory: `mt-0.5 truncate text-xs uppercase tracking-widest text-slate-500`,
};

export class JkDashboardSearchItem extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    active: { type: Boolean },
    type: { type: String }, // engine | preview | service
    data: { type: Object },
    t: { type: Function },
  };

  constructor() {
    super();
    this.active = false;
    this.type = 'service';
    this.data = {};
    this.t = (key) => key;
  }

  render() {
    // Dynamische Klassen als einfache Strings statt als Objekt definieren
    const buttonActiveClasses = this.active
      ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 via-slate-800 to-slate-900 shadow-lg shadow-indigo-500/10'
      : 'border-transparent hover:border-slate-700 hover:bg-slate-800/70';

    const iconActiveClasses = this.active
      ? 'ring-indigo-500/40 bg-indigo-500/20 text-white'
      : 'ring-slate-600/70 text-indigo-400 group-hover:text-white group-hover:bg-indigo-500/15';

    return html`
      <button class="${styles.itemBase} ${buttonActiveClasses}">
        ${this.active ? html`<div class="${styles.accentBar}"></div>` : ''}

        <div class="${styles.layoutWrapper}">
          ${
            this.data.icon
              ? html`
                  <div class="${styles.iconWrapper} ${iconActiveClasses}">
                    <jk-icon
                      .icon=${this.data.icon}
                      class="${styles.icon}"
                    ></jk-icon>
                  </div>
                `
              : ''
          }

          <div class="${styles.contentCell}">${this._renderContent()}</div>
        </div>

        <div class="${styles.metaCell}">${this._renderMeta()}</div>
      </button>
    `;
  }

  _renderContent() {
    switch (this.type) {
      case 'engine':
        return html`
          <div class="min-w-0">
            <div class="${styles.engineTitle}">${this.data.name}</div>
            <div class="${styles.engineUrl}">${this.data.url}</div>
          </div>
        `;

      case 'preview': {
        const terms = this.data.searchTerms?.trim() || '...';
        return html`
          <div class="min-w-0">
            <div class="${styles.previewPrefix}">
              ${this.t('searchEnginePreviewPrefix')}
            </div>
            <div class="${styles.previewText}">
              <span class="font-semibold">${this.data.name}</span>
              <span class="${styles.previewTerms}">"${terms}"</span>
            </div>
          </div>
        `;
      }

      case 'service':
      default:
        return html`
          <div class="min-w-0">
            <div class="${styles.serviceTitle}">${this.data.name}</div>
            <div class="${styles.serviceCategory}">${this.data.category}</div>
          </div>
        `;
    }
  }

  _renderMeta() {
    if (this.type === 'engine') {
      // FIX: Basis-Klasse kbdBase als Computed Property direkt ins Objekt gezogen
      const kbdClasses = {
        [styles.kbdBase]: true,
        'border-indigo-500 bg-indigo-500/20 text-indigo-200': this.active,
        'border-slate-600 bg-slate-900/80 text-slate-300': !this.active,
      };
      return html`
        <kbd class="${classMap(kbdClasses)}"> :${this.data.prefix} </kbd>
      `;
    }

    // Default "Enter" badge path for service/preview when focused
    return this.active ? html`<kbd class="${styles.enterKbd}">Enter</kbd>` : '';
  }
}

customElements.define('jk-dashboard-search-item', JkDashboardSearchItem);
