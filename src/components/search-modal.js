import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';
import './search-item.js';

// 1. Static styling dictionary isolating layouts from the rendering engine
const styles = {
  overlay: `fixed inset-0 z-60 flex items-start justify-center pt-10 sm:pt-24 p-4 bg-slate-950/70 backdrop-blur-md`,
  modal: `w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl shadow-black/40 flex flex-col max-h-[80vh]`,
  header: `flex items-center gap-3 px-5 py-4 border-b border-slate-700/70 bg-slate-900/30 shrink-0`,
  iconBadge: `flex items-center justify-center size-9 rounded-xl bg-slate-700/60 ring-1 ring-slate-600/70 text-indigo-300`,
  form: `grow`,
  input: `w-full bg-transparent text-lg sm:text-xl font-medium tracking-tight text-white placeholder-slate-500 focus:outline-none`,
  // FIX: Nur reine Tailwind-Klassen hier rein. Der Selektor-Name bleibt getrennt.
  resultsContainer: `overflow-y-auto p-2 space-y-1 grow scroll-py-2`,
  engineHeader: `px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500`,
  emptyState: `flex flex-col items-center justify-center py-10 text-slate-500`,
  emptyIcon: `size-8 mb-3 opacity-50`,
  emptyText: `text-sm`,
};

export class JkSearchModal extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind configuration styles
  }

  static properties = {
    show: { type: Boolean },
    searchQuery: { type: String },
    searchEngines: { type: Array },
    filteredServices: { type: Array },
    selectedIndex: { type: Number },
    t: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.searchQuery = '';
    this.searchEngines = [];
    this.filteredServices = [];
    this.selectedIndex = 0;
    this.t = (key) => key;
  }

  updated(changedProperties) {
    if (changedProperties.has('selectedIndex')) {
      requestAnimationFrame(() => {
        // FIX: Sicherstellen, dass wir das Element über die dedizierte ID/Klasse finden
        const container = this.querySelector('#searchResults');
        if (!container) return;

        const items = container.querySelectorAll('jk-dashboard-search-item');
        const active = items[this.selectedIndex];

        if (active) {
          if (this.selectedIndex <= 1) {
            container.scrollTop = 0;
            return;
          }

          if (this.selectedIndex === items.length - 1) {
            container.scrollTop = container.scrollHeight;
            return;
          }

          const activeTop = active.offsetTop;
          const activeBottom = activeTop + active.offsetHeight;
          const visibleTop = container.scrollTop;
          const visibleBottom = visibleTop + container.clientHeight;

          const topOffset = 160;

          if (activeTop < visibleTop + topOffset) {
            container.scrollTop = Math.max(0, activeTop - topOffset);
          } else if (activeBottom > visibleBottom) {
            container.scrollTop += activeBottom - visibleBottom;
          }
        }
      });
    }
  }

  _handleClose() {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
  }

  _handleInput(e) {
    this.dispatchEvent(
      new CustomEvent('search-change', {
        detail: { value: e.target.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  _selectEngine(prefix) {
    this.dispatchEvent(
      new CustomEvent('search-change', {
        detail: { value: `:${prefix} ` },
        bubbles: true,
        composed: true,
      })
    );
    setTimeout(() => this.querySelector('#searchInput')?.focus(), 10);
  }

  _triggerServiceClick(service) {
    this.dispatchEvent(
      new CustomEvent('service-click', {
        detail: { service },
        bubbles: true,
        composed: true,
      })
    );
  }

  _handleSubmit(e) {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('execute-submit', { bubbles: true, composed: true })
    );
  }

  _renderEngine(engine, active) {
    return html`
      <jk-dashboard-search-item
        type="engine"
        .active=${active}
        .data=${engine}
        @click="${() => this._selectEngine(engine.prefix)}"
      ></jk-dashboard-search-item>
    `;
  }

  _renderPreview(matchedEngine, searchTermsPreview, active) {
    const previewData = { ...matchedEngine, searchTerms: searchTermsPreview };

    return html`
      <jk-dashboard-search-item
        type="preview"
        .active=${active}
        .data=${previewData}
        .t=${this.t}
        @click="${() => {
          const finalUrl = matchedEngine.url.replace(
            '%s',
            encodeURIComponent(searchTermsPreview.trim())
          );
          window.open(finalUrl, '_blank');
          this._handleClose();
        }}"
      ></jk-dashboard-search-item>
    `;
  }

  _renderService(s, active) {
    return html`
      <jk-dashboard-search-item
        type="service"
        .active=${active}
        .data=${s}
        @click=${() => this._triggerServiceClick(s)}
      ></jk-dashboard-search-item>
    `;
  }

  _buildItems() {
    const queryTrimmed = this.searchQuery.trim();
    let matchedEngine = null;
    let searchTermsPreview = '';
    let candidateEngines = [];
    let isFilteringEngines = false;
    let showPreviewBlock = false;

    if (this.searchQuery.startsWith(':')) {
      const commandString = this.searchQuery.substring(1);
      const firstSpaceIndex = commandString.indexOf(' ');

      if (firstSpaceIndex !== -1) {
        const prefix = commandString
          .substring(0, firstSpaceIndex)
          .toLowerCase();
        searchTermsPreview = commandString.substring(firstSpaceIndex + 1);
        matchedEngine = this.searchEngines.find(
          (e) => e.prefix.toLowerCase() === prefix
        );
        if (matchedEngine) showPreviewBlock = true;
      } else {
        isFilteringEngines = true;
        const currentPrefixToken = commandString.toLowerCase();
        candidateEngines = this.searchEngines.filter((e) =>
          e.prefix.toLowerCase().startsWith(currentPrefixToken)
        );
      }
    }

    const showAllEngines = queryTrimmed === ':';
    const enginesToRender = showAllEngines
      ? this.searchEngines
      : isFilteringEngines
        ? candidateEngines
        : [];

    const items = [];

    enginesToRender.forEach((engine) => {
      items.push({
        isEngineHeadingGroup: true,
        render: (active) => this._renderEngine(engine, active),
      });
    });

    if (showPreviewBlock) {
      items.push({
        render: (active) =>
          this._renderPreview(matchedEngine, searchTermsPreview, active),
      });
    }

    if (!showAllEngines) {
      this.filteredServices.forEach((service) => {
        items.push({
          render: (active) => this._renderService(service, active),
        });
      });
    }

    return { items, showAllEngines, isFilteringEngines };
  }

  render() {
    if (!this.show) return html``;

    const queryTrimmed = this.searchQuery.trim();
    const showQuickTrigger = queryTrimmed === '';
    const { items, showAllEngines, isFilteringEngines } = this._buildItems();

    return html`
      <div @click=${this._handleClose} class="${styles.overlay}">
        <div @click=${(e) => e.stopPropagation()} class="${styles.modal}">
          <!-- Search Header -->
          <div class="${styles.header}">
            <div class="${styles.iconBadge}">
              <jk-icon icon="search" class="size-5"></jk-icon>
            </div>

            <form @submit=${this._handleSubmit} class="${styles.form}">
              <input
                id="searchInput"
                type="text"
                inputmode="search"
                enterkeyhint="search"
                placeholder="${this.t('searchPlaceholder')}"
                .value=${this.searchQuery}
                @input=${this._handleInput}
                class="${styles.input}"
              />
            </form>

            ${
              showQuickTrigger
                ? html`
                    <jk-icon-button
                      icon="globe"
                      title="Search engines"
                      @click=${() => this._selectEngine('')}
                    ></jk-icon-button>
                  `
                : ''
            }

            <jk-icon-button
              icon="x"
              title="Close"
              @click=${this._handleClose}
            ></jk-icon-button>
          </div>

          <!-- Results -->
          <!-- FIX: Eindeutige ID vergeben und die dynamischen Styles sauber getrennt übergeben -->
          <div id="searchResults" class="${styles.resultsContainer}">
            ${
              (showAllEngines || isFilteringEngines) && items.length > 0
                ? html`<div class="${styles.engineHeader}">
                    ${this.t('searchEnginesTitle')}
                  </div>`
                : ''
            }
            ${items.map((item, i) => item.render(i === this.selectedIndex))}
            ${
              this.searchQuery && items.length === 0
                ? html`
                    <div class="${styles.emptyState}">
                      <jk-icon
                        icon="search-x"
                        class="${styles.emptyIcon}"
                      ></jk-icon>
                      <span class="${styles.emptyText}"
                        >${this.t('noServices')}</span
                      >
                    </div>
                  `
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('jk-search-modal', JkSearchModal);
