import { LitElement, html } from 'lit';
import './service-card.js';
import './icon.js';
import './icon-button.js';

const styles = {
  section: `mb-8 rounded-2xl border border-amber-500/20 bg-slate-900/20 p-4 sm:p-5`,
  header: `flex items-center gap-3 mb-4`,
  iconBadge: `flex items-center justify-center size-8 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20`,
  icon: `size-4 text-amber-400`,
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
    t: { type: Function },
    renderIcon: { type: Function },
  };

  render() {
    if (!this.favorites || this.favorites.length === 0) {
      return html``;
    }

    return html`
      <section class="${styles.section}">
        <!-- Header -->
        <div class="${styles.header}">
          <div class="${styles.iconBadge}">
            <jk-icon icon="star" class="${styles.icon}"></jk-icon>
          </div>

          <!-- Titel auf Favoriten geändert -->
          <h2 class="${styles.title}">${this.t('favorites') || 'Favoriten'}</h2>

          <jk-icon-button
            icon="trash-2"
            variant="text"
            .text=${this.t('resetFavs')}
            class="${styles.resetButton}"
            @click=${() => {
              this.dispatchEvent(
                new CustomEvent('clear-favorites', {
                  bubbles: true,
                  composed: true,
                }),
              );
            }}
          ></jk-icon-button>
        </div>

        <!-- Cards -->
        <div class="${styles.grid}">
          ${this.favorites.map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${service.key}
                .isFavorite=${true}
                @card-click=${() => {
                  this.dispatchEvent(
                    new CustomEvent('service-click', {
                      detail: { service },
                      bubbles: true,
                      composed: true,
                    }),
                  );
                }}
                @card-long-press=${() => {
                  // Wenn ein bestehender Favorit lang gedrückt wird -> Löschen triggern
                  this.dispatchEvent(
                    new CustomEvent('delete-favorite-slot', {
                      detail: { slot: service.key },
                      bubbles: true,
                      composed: true,
                    }),
                  );
                }}
              ></jk-service-card>
            `,
          )}
        </div>
      </section>
    `;
  }
}

customElements.define('jk-favorites-view', JkFavoritesView);
