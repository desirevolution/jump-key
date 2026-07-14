import { LitElement, html } from "lit";

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
    if (!this.favorites || this.favorites.length === 0) return html``;

    return html`
      <div class="mb-8">
        <h2
          class="flex items-center gap-2 mb-4 text-xs font-semibold tracking-wider text-slate-400 uppercase sm:text-sm"
        >
          <jk-icon
            icon="star"
            class="w-4 h-4 text-amber-500 fill-amber-400/20"
          ></jk-icon>
          ${this.t("frequent")}
        </h2>

        <div
          class="grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
        >
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
                    new CustomEvent("service-click", {
                      detail: { service },
                      bubbles: true,
                      composed: true,
                    }),
                  );
                }}
              ></jk-service-card>
            `,
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("jk-favorites-view", JkFavoritesView);
