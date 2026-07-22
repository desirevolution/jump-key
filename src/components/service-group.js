import { html, LitElement } from 'lit';
import './service-card.js';
import './icon.js';

const styles = {
  section: `rounded-2xl border border-slate-700/50 bg-slate-900/20 p-4 sm:p-5 transition-colors duration-300`,
  header: `flex items-center gap-3 mb-4`,
  iconContainer: `flex items-center justify-center size-8 rounded-xl bg-slate-800/70 ring-1 ring-slate-700/70`,
  icon: `size-4 text-indigo-300`,
  titleWrapper: `flex items-center gap-2 min-w-0`,
  title: `text-sm font-semibold tracking-wide text-slate-200 truncate`,
  badge: `hidden sm:inline-flex items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-300`,
  grid: `grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`,
};

export class JkServiceGroup extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    title: { type: String },
    icon: { type: String },
    badgeText: { type: String },
    services: { type: Array },
  };

  _handleCardClick(service) {
    this.dispatchEvent(
      new CustomEvent('service-click', {
        detail: { service },
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

  render() {
    return html`
      <section class="${styles.section}">
        <div class="${styles.header}">
          <div class="${styles.iconContainer}">
            <jk-icon
              .icon=${this.icon || 'folder'}
              class="${styles.icon}"
            ></jk-icon>
          </div>

          <div class="${styles.titleWrapper}">
            <h2 class="${styles.title}">${this.title}</h2>
            ${
              this.badgeText
                ? html`
                    <kbd class="${styles.badge}">
                      ${this.badgeText.toUpperCase()}
                    </kbd>
                  `
                : ''
            }
          </div>
        </div>

        <div class="${styles.grid}">
          ${(this.services ?? []).map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${service.key}
                .favoriteSlot=${service.favSlot || ''}
                .isFavorite=${Boolean(service.favSlot)}
                @card-click=${() => this._handleCardClick(service)}
                @card-long-press=${(e) => this._handleCardLongPress(e, service)}
              ></jk-service-card>
            `
          )}
        </div>
      </section>
    `;
  }
}

customElements.define('jk-service-group', JkServiceGroup);
