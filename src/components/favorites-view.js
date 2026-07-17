import { LitElement, html } from "lit";
import "./service-card.js";
import "./icon.js";
import "./icon-button.js";

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
      <section
        class="
          mb-8

          rounded-2xl

          border
          border-amber-500/20

          bg-slate-900/20

          p-4
          sm:p-5
        "
      >
        <!-- Header -->

        <div
          class="
            flex
            items-center
            gap-3

            mb-4
          "
        >
          <!-- Icon -->

          <div
            class="
              flex
              items-center
              justify-center

              size-8

              rounded-xl

              bg-amber-500/10

              ring-1
              ring-amber-500/20
            "
          >
            <jk-icon
              icon="star"
              class="
                size-4

                text-amber-400

              "
            ></jk-icon>
          </div>

          <!-- Title -->

          <h2
            class="
              text-sm

              font-semibold

              tracking-wide

              text-slate-200
            "
          >
            ${this.t("frequent")}
          </h2>

          <!-- Reset -->

          <jk-icon-button
            icon="trash-2"
            variant="text"
            .text=${this.t("resetFavs")}
            class="ml-auto"
            @click=${() => {
              this.dispatchEvent(
                new CustomEvent("clear-favorites", {
                  bubbles: true,
                  composed: true,
                }),
              );
            }}
          ></jk-icon-button>
        </div>

        <!-- Cards -->

        <div
          class="
            grid

            grid-cols-1

            gap-3

            sm:gap-4

            grid-cols-[repeat(auto-fill,minmax(280px,1fr))]
          "
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
                      detail: {
                        service,
                      },

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

customElements.define("jk-favorites-view", JkFavoritesView);
