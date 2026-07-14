import { LitElement, html } from "lit";

export class JkServiceGroup extends LitElement {
  createRenderRoot() {
    return this; // Preserves Tailwind classes
  }

  static properties = {
    title: { type: String },
    icon: { type: String },
    badgeText: { type: String },
    services: { type: Array },
  };

  render() {
    return html`
      <div class="pb-5 border-b border-slate-800/40 last:border-0">
        <div class="flex items-center gap-3 mb-4">
          ${
            this.badgeText
              ? html`
                  <kbd
                    class="hidden px-2 py-0.5 font-mono text-xs font-bold text-indigo-400 bg-slate-900 border border-indigo-500/30 rounded sm:block"
                  >
                    ${this.badgeText.toUpperCase()}
                  </kbd>
                `
              : ""
          }

          <jk-icon
            .icon="${this.icon || "folder"}"
            class="w-4 h-4 text-indigo-400/80"
          ></jk-icon>

          <h2
            class="text-xs font-semibold tracking-wider text-slate-400 uppercase sm:text-sm"
          >
            ${this.title}
          </h2>
        </div>

        <div
          class="grid grid-cols-1 gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]"
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
      </div>
    `;
  }
}

customElements.define("jk-service-group", JkServiceGroup);
