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
    }, 60 * 1000);
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
      class="
        mb-8
        sm:mb-10
        flex
        items-center
        justify-between
        gap-4

        rounded-2xl
        border
        border-slate-700/70

        bg-gradient-to-br
        from-slate-900/80
        to-slate-800/60

        px-4
        py-4
        sm:px-6
        sm:py-5

        shadow-xl
        shadow-black/20

        backdrop-blur-md
      "
    >

      <!-- Left: Branding -->
      <div
        class="
          flex
          items-center
          gap-3
          min-w-0
        "
      >

        <!-- Logo Shell -->
        <a
          href="https://github.com/desirevolution/jump-key"
          target="_blank"
          rel="noopener noreferrer"
          class="
            group
            flex
            items-center
            justify-center

            size-12
            sm:size-14

            shrink-0

            rounded-xl

            bg-slate-700/60
            ring-1
            ring-slate-600/70

            transition-all
            duration-300

            hover:bg-indigo-500/15
            hover:ring-indigo-500/40
            hover:-translate-y-0.5
          "
        >
          <img
            src="/jump-key.png"
            alt="JumpKey"
            class="
              size-9
              sm:size-11
              object-contain

              transition-transform
              duration-300

              group-hover:scale-105
            "
          />
        </a>


        <!-- Title -->
        <div
          class="
            flex
            items-center
            gap-2
            min-w-0
          "
        >

<div
  class="
    flex
    items-center
    gap-1
    font-mono
    font-bold
    text-2xl
    sm:text-3xl
  "
>
  <span class="text-white">
    Jump
  </span>

  <span
    class="
      text-indigo-400
    "
  >
    Key
  </span>
</div>

          <button
            @click=${() => this._dispatchEvent("open-help")}
            title="${this.t ? this.t("helpHint") : ""}"
            class="
              hidden
              md:flex

              items-center
              justify-center

              size-7

              rounded-lg

              text-slate-500

              transition-all
              duration-200

              hover:bg-slate-700/60
              hover:text-indigo-300

              focus:outline-none
              focus:ring-2
              focus:ring-indigo-500/40
            "
          >
            <jk-icon
              icon="help-circle"
              class="size-5"
            ></jk-icon>
          </button>

        </div>

      </div>



      <!-- Right -->
      <div
        class="
          flex
          items-center
          gap-3
          sm:gap-5
          shrink-0
        "
      >

        <!-- Action Group -->
        <div
          class="
            flex
            items-center
            gap-1

            rounded-xl

            border
            border-slate-700/60

            bg-slate-800/50

            p-1
          "
        >

          <jk-icon-button
            icon="${this.isGridView ? "rows-2" : "layout-grid"}"
            title="${this.t ? this.t("hkToggleView") : ""} [#]"
            @click=${() => this._dispatchEvent("toggle-view")}
          ></jk-icon-button>


          <jk-icon-button
            icon="search"
            title="${this.t ? this.t("hkSearch") : ""} [Space]"
            @click=${() => this._dispatchEvent("open-search")}
          ></jk-icon-button>


          <jk-icon-button
            icon="settings"
            title="${this.t ? this.t("editConfig") : ""}"
            .hideOnMobile=${true}
            @click=${() => this._dispatchEvent("open-config")}
          ></jk-icon-button>

        </div>



        <!-- Clock -->
        <div
          class="
            hidden
            sm:block

            text-right
            select-none
          "
        >

          <div
            class="
              flex
              items-center
              justify-end

              text-3xl

              font-semibold
              tracking-tight

              text-indigo-300
            "
          >
            <span>${this._hours}</span>
            <span class="mx-0.5 opacity-70">:</span>
            <span>${this._minutes}</span>
          </div>


          <div
            class="
              mt-1

              text-xs

              font-medium

              text-slate-400

              whitespace-nowrap
            "
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
