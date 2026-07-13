import { LitElement, html } from "lit";
import "./icon.js";

export class JkSearchItem extends LitElement {
  createRenderRoot() {
    return this; // Für globales Tailwind-Styling
  }

  static properties = {
    active: { type: Boolean },
    type: { type: String }, // 'engine' | 'preview' | 'service'
    data: { type: Object },
    t: { type: Function },
  };

  constructor() {
    super();
    this.active = false;
    this.type = "service";
    this.data = {};
    this.t = (key) => key;
  }

  render() {
    const itemClasses = `w-full flex items-center justify-between p-3 rounded-xl text-left font-mono text-sm transition-all ${
      this.active
        ? "search-item-active sm:bg-indigo-600 text-white"
        : "hover:bg-slate-700/30 text-slate-300"
    } active:bg-indigo-600 active:text-white`;

    return html`
      <button class="${itemClasses}">
        <div class="flex items-center gap-3 min-w-0 grow">
          ${this.data.icon ? html`<jk-icon .icon=${this.data.icon} class="w-5 h-5 shrink-0 ${this.active ? "text-white" : "text-indigo-400"}"></jk-icon>` : ""}

          <div class="min-w-0 text-xs sm:text-sm">${this._renderContent()}</div>
        </div>
        <div class="flex items-center shrink-0 ml-3">${this._renderMeta()}</div>
      </button>
    `;
  }

  _renderContent() {
    switch (this.type) {
      case "engine":
        return html`
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-bold text-white shrink-0">${this.data.name}</span>
            <span
              class="truncate text-xs ${this.active ? "text-indigo-200" : "text-slate-500"}"
            >
              (${this.data.url})
            </span>
          </div>
        `;

      case "preview":
        const terms = this.data.searchTerms?.trim() || "...";
        return html`
          <div class="truncate">
            ${this.t("searchEnginePreviewPrefix")}
            <span class="font-bold text-white">${this.data.name}</span>:
            <span
              class="italic ${this.active ? "text-indigo-100" : "text-indigo-300"}"
              >"${terms}"</span
            >
          </div>
        `;

      case "service":
      default:
        return html`
          <div class="truncate">
            <span class="font-medium block sm:inline text-white"
              >${this.data.name}</span
            >
            <span class="text-xs opacity-60 sm:ml-1"
              >(${this.data.category})</span
            >
          </div>
        `;
    }
  }
  _renderMeta() {
    switch (this.type) {
      case "engine":
        return html`
          <kbd
            class="px-2 py-0.5 text-xs font-bold rounded shadow ${this.active ? "bg-indigo-700 text-white border-indigo-500" : "bg-slate-900 border border-slate-700 text-indigo-400"}"
          >
            :${this.data.prefix}
          </kbd>
        `;

      case "preview":
      case "service":
      default:
        return this.active
          ? html`<span
              class="text-xs font-mono bg-indigo-700 px-2 py-0.5 rounded shadow hidden sm:inline"
              >Enter</span
            >`
          : "";
    }
  }
}

customElements.define("jk-search-item", JkSearchItem);
