import { html, LitElement } from 'lit';
import './service-card.js';
import './icon.js';

const styles = {
  section: `jk-mobile-group rounded-2xl border border-slate-700/50 bg-slate-900/20 p-4 sm:p-5 transition-colors duration-300`,
  header: `flex items-center gap-3 mb-4`,
  iconContainer: `flex items-center justify-center size-8 rounded-xl bg-slate-800/70 ring-1 ring-slate-700/70`,
  icon: `size-4 text-indigo-300`,
  titleWrapper: `flex items-center gap-2 min-w-0`,
  title: `text-sm font-semibold tracking-wide text-slate-200 truncate`,
  badge: `inline-flex shrink-0 items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-300`,
  grid: `grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))]`,
};

export class JkServiceGroup extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    title: { type: String },
    icon: { type: String },
    badgeText: { type: String },
    collapseId: { type: String },
    highlightKeys: { type: Boolean },
    highlightCategoryKey: { type: Boolean },
    services: { type: Array },
    collapsible: { type: Boolean },
    collapsed: { type: Boolean },
    canReorder: { type: Boolean },
    categoryIndex: { type: Number },
    categoryCount: { type: Number },
    t: { type: Function },
  };

  _handleCardClick(event, service) {
    this.dispatchEvent(
      new CustomEvent('service-click', {
        detail: { service, shiftKey: event.detail.shiftKey },
        bubbles: true,
        composed: true,
      })
    );
  }

  _handleCardLongPress(e, service) {
    // Verhindert, dass das originale Event der Service-Card
    // weiter nach oben zur app.js wandert
    e.stopPropagation();

    this.dispatchEvent(
      new CustomEvent('card-long-press', {
        detail: { service },
        bubbles: true,
        composed: true,
      })
    );
  }

  _moveCategory(direction) {
    this.dispatchEvent(new CustomEvent('move-category', {
      detail: { index: this.categoryIndex, direction }, bubbles: true, composed: true,
    }));
  }

  render() {
    return html`
      <section class="${styles.section}">
        <div class="${styles.header}">
          <div class="${styles.iconContainer}">
            <jk-icon .icon=${this.icon || 'ui:folder'} class="${styles.icon}"></jk-icon>
          </div>

          <div class="${styles.titleWrapper}">
            ${
              this.badgeText
                ? html` <kbd class="${styles.badge} ${this.highlightCategoryKey ? 'jk-next-key' : ''}"> ${this.badgeText.toUpperCase()} </kbd> `
                : ''
            }
            <h2 class="${styles.title}">${this.title}</h2>
          </div>
          ${this.collapsible ? html`<div class="ml-auto flex shrink-0 items-center gap-2">
            <span class="text-xs text-slate-400">${this.services?.length ?? 0}</span>

            <button type="button" class="jk-category-collapse" aria-expanded=${String(!this.collapsed)} aria-label=${this.t(this.collapsed ? 'expandCategory' : 'collapseCategory')}
              @click=${()=>this.dispatchEvent(new CustomEvent('toggle-category', { detail: this.collapseId || this.badgeText, bubbles: true, composed: true }))}>
              <jk-icon .icon=${this.collapsed ? 'ui:chevron-down' : 'ui:chevron-up'} class="size-4"></jk-icon>
            </button>
          </div>` : this.badgeText ? html`<span class="ml-auto text-sm text-slate-400 md:hidden">${this.services?.length ?? 0}</span>` : ''}
        </div>

        ${this.collapsed ? '' : html`<div class="${styles.grid}">
          ${(this.services ?? []).map(
            (service) => html`
              <jk-service-card
                .serviceId=${service.id || (service.type === 'category' ? 'cat:' + (service.navigationKey || service.key) : '')}
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${service.key}
                .highlightKey=${this.highlightKeys}
                .favoriteSlot=${service.favSlot || ''}
                .isFavorite=${Boolean(service.favSlot)}
                @card-click=${(e) => this._handleCardClick(e, service)}
                @card-long-press=${(e) => this._handleCardLongPress(e, service)}
              ></jk-service-card>
            `
          )}
        </div>`}
      </section>
    `;
  }
}

customElements.define('jk-service-group', JkServiceGroup);
