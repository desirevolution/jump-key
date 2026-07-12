import { LitElement, html } from "lit";
import { createIcons, icons } from "lucide";

export class JkDashboardHeader extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    isGridView: { type: Boolean },
    lang: { type: String },
    t: { type: Function },
  };

  constructor() {
    super();
    this.isGridView = false;
    this.lang = "en";

    // Internal reactive state for time/date
    this._timeString = "";
    this._dateString = "";
    this._timeInterval = null;
  }

  static get properties() {
    return {
      isGridView: { type: Boolean },
      lang: { type: String },
      t: { type: Function },
      _timeString: { type: String, state: true },
      _dateString: { type: String, state: true },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateTime();
    this._timeInterval = setInterval(() => this._updateTime(), 1000);
    setTimeout(() => createIcons({ icons }), 0);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timeInterval);
  }

  updated(changedProperties) {
    if (
      changedProperties.has("isGridView") ||
      changedProperties.has("_timeString")
    ) {
      createIcons({ icons });
    }
  }

  _updateTime() {
    const locale = this.lang === "de" ? "de-DE" : "en-US";
    const now = new Date();

    this._timeString = now.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });

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
        <!-- Brand / Logo Section -->
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
              title="${this.t("helpHint")}"
            >
              <i data-lucide="help-circle" class="w-5 h-5 sm:w-6 sm:h-6"></i>
            </button>
          </div>
        </div>

        <!-- Action Buttons & Clock Section -->
        <div class="flex items-center gap-3 font-mono">
          <button
            @click="${() => this._dispatchEvent("toggle-view")}"
            class="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors shadow-md group"
            title="${this.t("hkToggleView")} [#]"
          >
            ${
              this.isGridView
                ? html`<i
                    data-lucide="rows-2"
                    class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
                  ></i>`
                : html`<i
                    data-lucide="layout-grid"
                    class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
                  ></i>`
            }
          </button>

          <button
            @click="${() => this._dispatchEvent("open-search")}"
            class="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors shadow-md group"
            title="${this.t("hkSearch")} [Space]"
          >
            <i
              data-lucide="search"
              class="w-5 h-5 group-hover:text-indigo-400 transition-colors"
            ></i>
          </button>

          <button
            @click="${() => this._dispatchEvent("open-config")}"
            class="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all duration-150 group shadow-md hidden md:block"
            title="${this.t("editConfig")}"
          >
            <i
              data-lucide="settings"
              class="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors"
            ></i>
          </button>

          <!-- Clock Display -->
          <div class="text-center sm:text-right ml-2 select-none">
            <div
              class="text-2xl sm:text-4xl font-bold text-indigo-400 tracking-wider"
            >
              ${this._timeString}
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
