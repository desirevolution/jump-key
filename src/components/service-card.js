import { LitElement, html } from "lit";
import "./icon.js";

export class JkServiceCard extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    name: { type: String },
    url: { type: String },
    icon: { type: String },
    category: { type: String },
    badgeText: { type: String },
    showCategoryBadge: { type: Boolean },
  };

  constructor() {
    super();
    this.name = "";
    this.url = "";
    this.icon = "";
    this.category = "";
    this.badgeText = "";
    this.showCategoryBadge = false;
  }

  _handleClick() {
    this.dispatchEvent(
      new CustomEvent("card-click", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    // Clean up URL preview string (e.g. remove https:// and www.)
    const displayUrl = this.url
      ? this.url.replace(/^https?:\/\/(www\.)?/, "")
      : "";

    return html`
      <button
        @click="${this._handleClick}"
        class="group relative bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-2xl p-4 flex items-center gap-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 active:scale-[0.98] w-full"
      >
        <div
          class="bg-slate-900 rounded-xl text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-all duration-300 shadow-inner shrink-0"
        >
          <jk-icon .icon=${this.icon} class="w-12 h-12"></jk-icon>
        </div>

        <div class="min-w-0 grow pr-8">
          <span
            class="font-bold text-white block text-base truncate tracking-wide mb-0.5 group-hover:text-indigo-300 transition-colors"
          >
            ${this.name}
          </span>
          <span
            class="text-xs text-slate-400 truncate block font-mono opacity-80 group-hover:text-slate-300 transition-colors"
          >
            ${displayUrl}
          </span>

          ${
            this.showCategoryBadge && this.category
              ? html`
                  <span
                    class="inline-block mt-2 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-slate-900 border border-slate-700 text-slate-400 rounded"
                  >
                    ${this.category}
                  </span>
                `
              : ""
          }
        </div>

        ${
          this.badgeText
            ? html`
                <kbd
                  class="absolute top-4 right-4 px-2 py-0.5 font-bold font-mono text-xs sm:text-sm bg-indigo-600 text-white rounded shadow shadow-indigo-500/50 hidden sm:inline"
                >
                  ${this.badgeText.toUpperCase()}
                </kbd>
              `
            : ""
        }
      </button>
    `;
  }
}

customElements.define("jk-service-card", JkServiceCard);
