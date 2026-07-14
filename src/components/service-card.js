import { LitElement, html } from "lit";
import "./icon.js"; // Standardized imported dashboard icon wrapper

export class JkServiceCard extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind configuration styles
  }

  static properties = {
    name: { type: String },
    subtitle: { type: String },
    icon: { type: String },
    badgeText: { type: String },
    isFavorite: { type: Boolean },
  };

  constructor() {
    super();
    this.name = "";
    this.subtitle = "";
    this.icon = "";
    this.badgeText = "";
    this.isFavorite = false;
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
    const isUrl =
      this.subtitle &&
      (this.subtitle.includes(".") || this.subtitle.includes("/")); //
    const displaySubtitle = isUrl
      ? this.subtitle.replace(/^https?:\/\/(www\.)?/, "") //
      : this.subtitle || ""; //

    return html`
      <dialog
        @click="${this._handleClick}"
        class="group relative bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-2xl p-4 flex flex-row items-center gap-4 text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 active:scale-[0.98] w-full"
      >
        <!-- Icon Shell using Web Awesome Custom Styles -->
        <div
          class="flex items-center justify-center size-18 rounded-2xl bg-slate-800 text-indigo-500 shadow-sm transition duration-300 group-hover:bg-slate-700 group-hover:text-slate-200 group-hover:scale-105 shrink-0 overflow-hidden"
        >
          <jk-icon .icon=${this.icon} class="size-full"></jk-icon>
        </div>

        <!-- Content Area -->
        <div class="min-w-0 grow pr-8">
          <span
            class="font-bold text-white block text-base truncate tracking-wide mb-0.5 group-hover:text-indigo-300 transition-colors"
          >
            ${this.name}
          </span>
          <span
            class="text-xs text-slate-400 truncate block font-mono opacity-80 group-hover:text-slate-300 transition-colors"
          >
            ${displaySubtitle}
          </span>
        </div>

        <!-- Shortcut Keyboard Badge -->
        ${
          this.badgeText
            ? html`
                <kbd
                  class=${`absolute top-4 right-4 px-2 py-0.5 font-bold font-mono text-lg border rounded shadow-md hidden sm:inline ${
                    this.isFavorite
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/50"
                      : "bg-slate-900 text-indigo-400 border-slate-700 shadow-black/40"
                  }`}
                >
                  ${this.badgeText.toUpperCase()}
                </kbd>
              `
            : ""
        }
      </dialog>
    `;
  }
}

customElements.define("jk-service-card", JkServiceCard);
