import { LitElement, html, css } from "lit";
import "./icon.js";

export class JkDashboardHeader extends LitElement {
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

  static styles = css`
    :host {
      display: block;
      width: 100%;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif;
    }

    /* Outer Wrapper Flex Box Container */
    .header-container {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem; /* mb-8 */
      border-bottom: 1px solid #1e293b; /* border-slate-800 */
      padding-bottom: 1.5rem; /* pb-6 */
      gap: 1rem; /* gap-4 */
    }

    /* Left-Side Logo and Branding Layout */
    .brand-section {
      display: flex;
      align-items: center;
      gap: 1rem; /* gap-4 */
    }

    .logo-link {
      display: block;
      flex-shrink: 0; /* shrink-0 */
      transition: transform 0.2s ease;
    }

    .logo-link:hover {
      transform: scale(1.05); /* hover:scale-105 */
    }

    .logo-link:active {
      transform: scale(0.95); /* active:scale-95 */
    }

    .logo-img {
      width: 3rem; /* w-12 */
      height: 3rem; /* h-12 */
      object-fit: contain; /* object-contain */
      border-radius: 0.5rem; /* rounded-lg */
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* shadow-md */
      cursor: pointer;
    }

    .title-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem; /* gap-2 */
    }

    .title-text {
      font-size: 1.5rem; /* text-2xl */
      font-weight: 700; /* font-bold */
      letter-spacing: -0.025em; /* tracking-tight */
      color: #ffffff; /* text-white */
      margin: 0;
    }

    /* Help Floating Text Control Trigger Trigger button */
    .help-btn {
      color: #64748b; /* text-slate-500 */
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      display: none; /* hidden */
      align-items: center;
      transition: color 0.15s ease;
    }

    .help-btn:hover {
      color: #818cf8; /* hover:text-indigo-400 */
    }

    .help-icon {
      width: 1.25rem; /* w-5 */
      height: 1.25rem; /* h-5 */
    }

    /* Right Side Panel / Interactive Functional Layout Controllers */
    .actions-section {
      display: flex;
      align-items: center;
      gap: 0.75rem; /* gap-3 */
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; /* font-mono */
    }

    /* Generic Utility Control Action Push-Buttons */
    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem; /* p-2.5 */
      background-color: #1e293b; /* bg-slate-800 */
      border: 1px solid #334155; /* border-slate-700 */
      border-radius: 0.75rem; /* rounded-xl */
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* shadow-md */
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background-color: #273549; /* hover:bg-slate-750 */
      border-color: #6366f1; /* hover:border-indigo-500 */
    }

    .btn-icon {
      width: 1.25rem; /* w-5 */
      height: 1.25rem; /* h-5 */
      color: #94a3b8; /* text-slate-400 fallback */
      transition: color 0.15s ease;
    }

    .action-btn:hover .btn-icon {
      color: #818cf8; /* group-hover:text-indigo-400 */
    }

    /* Hide Config element action initially */
    .config-btn {
      display: none; /* hidden */
    }

    /* Time & Date Display Blocks */
    .clock-display {
      text-align: center; /* text-center */
      margin-left: 0.5rem; /* ml-2 */
      user-select: none; /* select-none */
    }

    .time-digits {
      font-size: 1.5rem; /* text-2xl */
      font-weight: 700; /* font-bold */
      color: #818cf8; /* text-indigo-400 */
      letter-spacing: 0.05em; /* tracking-wider */
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .time-digits span {
      display: inline-block;
    }

    .time-colon {
      margin-left: 1px;
      margin-right: 1px; /* mx-[1px] */
      position: relative;
      top: -2px; /* -top-[2px] */
    }

    .date-label {
      font-size: 10px; /* text-[10px] */
      color: #94a3b8; /* text-slate-400 */
      font-weight: 500; /* font-medium */
      margin-top: 0.125rem; /* mt-0.5 */
    }

    /* Responsive adjustments via Media Breakpoints matching Tailwind 'sm' & 'md' */
    @media (min-width: 640px) {
      .header-container {
        margin-bottom: 3rem; /* sm:mb-12 */
      }
      .logo-img {
        width: 4rem; /* sm:w-16 */
        height: 4rem; /* sm:h-16 */
      }
      .title-text {
        font-size: 1.875rem; /* sm:text-3xl */
      }
      .clock-display {
        text-align: right; /* sm:text-right */
      }
      .time-digits {
        font-size: 2.25rem; /* sm:text-4xl */
        justify-content: flex-end; /* sm:justify-end */
      }
      .date-label {
        font-size: 0.75rem; /* sm:text-xs */
      }
    }

    @media (min-width: 768px) {
      .help-btn {
        display: flex; /* md:block alternative */
      }
      .config-btn {
        display: flex; /* md:block alternative */
      }
      .help-icon {
        width: 1.5rem; /* sm:w-6 */
        height: 1.5rem; /* sm:h-6 */
      }
    }
  `;

  constructor() {
    super();
    this.isGridView = false;
    this.lang = "en";
    this._hoursString = "";
    this._minutesString = "";
    this._dateString = "";
    this._timeInterval = null;
  }

  firstUpdated() {
    this._updateTime();
    this._timeInterval = setInterval(() => this._updateTime(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timeInterval);
  }

  _updateTime() {
    const locale = this.lang === "de" ? "de-DE" : "en-US";
    const now = new Date();

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
      <div class="header-container">
        <div class="brand-section">
          <a
            href="https://github.com/desirevolution/jump-key"
            target="_blank"
            rel="noopener noreferrer"
            class="logo-link"
          >
            <img src="./jump-key.png" alt="JumpKey Logo" class="logo-img" />
          </a>
          <div class="title-wrapper">
            <h1 class="title-text">JumpKey</h1>
            <button
              @click="${() => this._dispatchEvent("open-help")}"
              class="help-btn"
              title="${this.t ? this.t("helpHint") : ""}"
            >
              <jk-icon icon="help-circle" class="help-icon"></jk-icon>
            </button>
          </div>
        </div>

        <div class="actions-section">
          <button
            @click="${() => this._dispatchEvent("toggle-view")}"
            class="action-btn"
            title="${this.t ? this.t("hkToggleView") : ""} [#]"
          >
            ${
              this.isGridView
                ? html`<jk-icon icon="rows-2" class="btn-icon"></jk-icon>`
                : html`<jk-icon icon="layout-grid" class="btn-icon"></jk-icon>`
            }
          </button>

          <button
            @click="${() => this._dispatchEvent("open-search")}"
            class="action-btn"
            title="${this.t ? this.t("hkSearch") : ""} [Space]"
          >
            <jk-icon icon="search" class="btn-icon"></jk-icon>
          </button>

          <button
            @click="${() => this._dispatchEvent("open-config")}"
            class="action-btn config-btn"
            title="${this.t ? this.t("editConfig") : ""}"
          >
            <jk-icon icon="settings" class="btn-icon"></jk-icon>
          </button>

          <div class="clock-display">
            <div class="time-digits">
              <span>${this._hoursString}</span>
              <span class="time-colon">:</span>
              <span>${this._minutesString}</span>
            </div>
            <div class="date-label">${this._dateString}</div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-dashboard-header", JkDashboardHeader);
