import { LitElement, html } from "lit";
import "./icon.js";
import "./icon-button.js";

export class JkDashboardHeader extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind styling classes
  }

  static get properties() {
    return {
      isGridView: { type: Boolean },
      lang: { type: String },
      t: { type: Function },
      // Track only the raw Date object as internal state
      _now: { type: Object, state: true },
    };
  }

  constructor() {
    super();
    this.isGridView = false;
    this.lang = "en";
    this._now = new Date();
    this._timeInterval = null;
  }

  // Set up the interval here so it restarts if the component is re-appended to the DOM
  connectedCallback() {
    super.connectedCallback();
    this._now = new Date();
    this._timeInterval = setInterval(() => {
      this._now = new Date();
    }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timeInterval) {
      clearInterval(this._timeInterval);
    }
  }

  // Clean, reactive getters to derive formatted strings on the fly
  get _hours() {
    return String(this._now.getHours()).padStart(2, "0");
  }

  get _minutes() {
    return String(this._now.getMinutes()).padStart(2, "0");
  }

  get _dateString() {
    const locale = this.lang === "de" ? "de-DE" : "en-US";
    const isMobile = window.matchMedia("(max-width: 639px)").matches;

    if (isMobile) {
      return this._now.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return this._now.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
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
        <!-- Left Side: Logo and Title -->
        <div class="flex items-center gap-4 shrink-0">
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

        <!-- Right Side: Optimized spacing container -->
        <div
          class="flex flex-1 justify-end items-center gap-4 sm:gap-6 font-mono min-w-0"
        >
          <!-- Icons Group: uses responsive gaps to breathe on larger screens -->
          <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <jk-icon-button
              icon="${this.isGridView ? "rows-2" : "layout-grid"}"
              title="${this.t ? this.t("hkToggleView") : ""} [#]"
              @click="${() => this._dispatchEvent("toggle-view")}"
            ></jk-icon-button>

            <jk-icon-button
              icon="search"
              title="${this.t ? this.t("hkSearch") : ""} [Space]"
              @click="${() => this._dispatchEvent("open-search")}"
            ></jk-icon-button>

            <jk-icon-button
              icon="settings"
              title="${this.t ? this.t("editConfig") : ""}"
              .hideOnMobile="${true}"
              @click="${() => this._dispatchEvent("open-config")}"
            ></jk-icon-button>
          </div>

          <!-- Time Display -->
          <div
            class="text-right select-none shrink-0 pl-1 border-l border-slate-800/50 sm:border-0"
          >
            <div
              class="text-2xl sm:text-4xl font-bold text-indigo-400 tracking-wider flex items-center justify-end"
            >
              <span>${this._hours}</span>
              <span class="mx-[1px] relative -top-[2px]">:</span>
              <span>${this._minutes}</span>
            </div>
            <div
              class="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 whitespace-nowrap"
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
