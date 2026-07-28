import { html, LitElement } from 'lit';
import './service-card.js';
import './icon.js';
import './icon-button.js';

const styles = {
  section: `mb-8 rounded-2xl border border-amber-500/20 bg-slate-900/20 p-4 sm:p-5`,
  continueSection: `mb-8 rounded-2xl border border-slate-700/60 bg-slate-900/20 p-4 sm:p-5`,
  header: `flex items-center gap-3 mb-4`,
  iconBadge: `flex items-center justify-center size-8 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20`,
  continueIconBadge: `flex items-center justify-center size-8 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`,
  icon: `size-4 text-amber-400`,
  continueIcon: `size-4 text-indigo-300`,
  title: `text-sm font-semibold tracking-wide text-slate-200`,
  resetButton: `ml-auto`,
  grid: `grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`,
};

export class JkFavoritesView extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    favorites: { type: Array },
    continueServices: { type: Array },
    t: { type: Function },
  };

  constructor() {
    super();
    this.favorites = [];
    this.continueServices = [];
    this.t = (key) => key;
  }

  renderFavorites() {
    if (!this.favorites.length) return html``;

    return html`
      <section class=${styles.section}>
        <div class=${styles.header}>
          <div class=${styles.iconBadge}>
            <jk-icon icon="star" class=${styles.icon}></jk-icon>
          </div>
          <h2 class=${styles.title}>${this.t('favorites')}</h2>
          <jk-icon-button
            icon="trash-2"
            variant="text"
            .text=${this.t('resetFavs')}
            class=${styles.resetButton}
            @click=${() => this.dispatchEvent(new CustomEvent('clear-favorites', { bubbles: true, composed: true }))}
          ></jk-icon-button>
        </div>
        <div class=${styles.grid}>
          ${this.favorites.map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .favoriteSlot=${service.favSlot}
                .isFavorite=${true}
                @card-click=${(e) => this.dispatchEvent(new CustomEvent('service-click', { detail: { service, shiftKey: e.detail.shiftKey }, bubbles: true, composed: true }))}
                @card-long-press=${() => this.dispatchEvent(new CustomEvent('delete-favorite-slot', { detail: { slot: service.favSlot }, bubbles: true, composed: true }))}
              ></jk-service-card>
            `
          )}
        </div>
      </section>
    `;
  }

  renderContinue() {
    if (!this.continueServices.length) return html``;

    return html`
      <section class=${styles.continueSection}>
        <div class=${styles.header}>
          <div class=${styles.continueIconBadge}>
            <jk-icon icon="history" class=${styles.continueIcon}></jk-icon>
          </div>
          <h2 class=${styles.title}>${this.t('continue')}</h2>
          <jk-icon-button
            icon="trash-2"
            variant="text"
            .text=${this.t('resetContinue')}
            class=${styles.resetButton}
            @click=${() => this.dispatchEvent(new CustomEvent('clear-continue', { bubbles: true, composed: true }))}
          ></jk-icon-button>
        </div>
        <div class=${styles.grid}>
          ${this.continueServices.map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${`⇧${service.continueSlot}`}
                @card-click=${(e) => this.dispatchEvent(new CustomEvent('continue-click', { detail: { service, shiftKey: e.detail.shiftKey }, bubbles: true, composed: true }))}
                @card-long-press=${() => this.dispatchEvent(new CustomEvent('delete-continue-entry', { detail: { service }, bubbles: true, composed: true }))}
              ></jk-service-card>
            `
          )}
        </div>
      </section>
    `;
  }

  render() {
    return html`${this.renderFavorites()}${this.renderContinue()}`;
  }
}

customElements.define('jk-favorites-view', JkFavoritesView);
