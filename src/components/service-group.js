import { LitElement, html } from "lit";
import "./service-card.js";
import "./icon.js";

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

  render() {
    return html`
      <section
        class="
          rounded-2xl

          border
          border-slate-700/50

          bg-slate-900/20

          p-4
          sm:p-5

          transition-colors
          duration-300
        "
      >
        <!-- Group Header -->

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

              bg-slate-800/70

              ring-1
              ring-slate-700/70
            "
          >
            <jk-icon
              .icon=${this.icon || "folder"}
              class="
                size-4

                text-indigo-300
              "
            ></jk-icon>
          </div>

          <!-- Title -->

          <div
            class="
              flex
              items-center
              gap-2

              min-w-0
            "
          >
            <h2
              class="
                text-sm

                font-semibold

                tracking-wide

                text-slate-200

                truncate
              "
            >
              ${this.title}
            </h2>

            ${
              this.badgeText
                ? html`
                    <kbd
                      class="
                        hidden
                        sm:inline-flex

                        items-center

                        rounded-lg

                        border
                        border-indigo-500/30

                        bg-indigo-500/10

                        px-2
                        py-0.5

                        font-mono

                        text-[11px]

                        font-bold

                        text-indigo-300
                      "
                    >
                      ${this.badgeText.toUpperCase()}
                    </kbd>
                  `
                : ""
            }
          </div>
        </div>

        <!-- Services Grid -->

        <div
          class="
            grid

            grid-cols-1

            gap-3

            sm:gap-4

            grid-cols-[repeat(auto-fill,minmax(280px,1fr))]
          "
        >
          ${(this.services ?? []).map(
            (service) => html`
              <jk-service-card
                .name=${service.name}
                .subtitle=${service.url}
                .icon=${service.icon}
                .badgeText=${service.key}
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
      </section>
    `;
  }
}

customElements.define("jk-service-group", JkServiceGroup);
