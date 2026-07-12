import { LitElement, html } from "lit";
import "./icon.js";

export class JkDashboardHeader extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      isGridView: { type: Boolean },
      lang: { type: String },
      t: { type: Function },
      _hoursString: { type: String, state: true },
      _minutesString: { type: String, state: true },
      _dateString: { type: String, state: true },
    };
  }

  constructor() {
    super();
    this.isGridView = false;
    this.lang = "en";
    this._hoursString = "";
    this._minutesString = "";
    this._dateString = "";
    this._timeInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    setTimeout(() => createIcons({ icons }), 0);
  }

  firstUpdated() {
    this._updateTime();
    // 1000ms ist super, damit der Doppelpunkt präzise jede Sekunde pulsiert
    this._timeInterval = setInterval(() => this._updateTime(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timeInterval);
  }

  updated(changedProperties) {
    if (changedProperties.has("isGridView")) {
      setTimeout(() => createIcons({ icons }), 0);
    }
  }
  _updateTime() {
    const locale = this.lang === "de" ? "de-DE" : "en-US";
    const now = new Date();

    // Reine Zahlen extrahieren und mit führender Null formatieren (z.B. "09" statt "9")
    this._hoursString = String(now.getHours()).padStart(2, "0");
    this._minutesString = String(now.getMinutes()).padStart(2, "0");

    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (isMobile) {
      this._dateString = now.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } else {
      this._dateString = now.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
  }

  _dispatchEvent(eventName) {
    this.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, composed: true }),
    );
  }

  render() {
    return html`
      <div
        class="flex flex-row justify-between items-center mb-8 sm:mb-12 border-b border-slate-800 pb-6 gap-4"
      >
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/desirevolution/jump-key"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-transform hover:scale-105 active:scale-95 block shrink-0"
          >
            <img
              src="./jump-key.png"
              alt="JumpKey Logo"
              class="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-lg shadow-md cursor-pointer"
            />
          </a>
          <div class="flex items-center gap-2">
            <h1
              class="text-2xl sm:text-3xl font-bold tracking-tight text-white"
            >
              JumpKey
            </h1>
            <button
              @click="${() => this._dispatchEvent("open-help")}"
              class="text-slate-500 hover:text-indigo-400 transition-colors flex items-center alignment-baseline dynamic-icon hidden md:block"
              title="${this.t ? this.t("helpHint") : ""}"
            >
              <jk-icon
                icon="help-circle"
                class="w-5 h-5 sm:w-6 sm:h-6"
              ></jk-icon>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3 font-mono">
          <button
            @click="${() => this._dispatchEvent("toggle-view")}"
            class="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all duration-150 group shadow-md hidden md:block"
            title="${this.t ? this.t("hkToggleView") : ""} [#]"
          >
            ${
              this.isGridView
                ? html`<jk-icon
                    icon="rows-2"
                    class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
                  ></jk-icon>`
                : html`<jk-icon
                    icon="layout-grid"
                    class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
                  ></jk-icon>`
            }
          </button>

          <button
            @click="${() => this._dispatchEvent("open-search")}"
            class="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all duration-150 group shadow-md hidden md:block"
            title="${this.t ? this.t("hkSearch") : ""} [Space]"
          >
            <jk-icon
              icon="search"
              class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
            ></jk-icon>
          </button>

          <button
            @click="${() => this._dispatchEvent("open-config")}"
            class="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all duration-150 group shadow-md hidden md:block"
            title="${this.t ? this.t("editConfig") : ""}"
          >
            <jk-icon
              icon="settings"
              class="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors"
            ></jk-icon>
          </button>

          <div class="text-center sm:text-right ml-2 select-none">
            <div
              class="text-2xl sm:text-4xl font-bold text-indigo-400 tracking-wider flex items-center justify-center sm:justify-end"
            >
              <span>${this._hoursString}</span>
              <span class="mx-[1px] relative -top-[2px]">:</span>
              <span>${this._minutesString}</span>
            </div>
            <div
              class="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5"
            >
              ${this._dateString}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-dashboard-header", JkDashboardHeader);
