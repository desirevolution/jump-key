import { LitElement, html } from "lit";
import "./icon.js";

export class JkDashboardSearchItem extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    active: { type: Boolean },
    type: { type: String }, // engine | preview | service
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
    const itemClasses = `
      group
      relative
      w-full
      flex
      items-center
      justify-between
      px-4
      py-3
      rounded-xl
      border
      transition-all
      duration-200
      text-left
      overflow-hidden

      ${
        this.active
          ? `
            border-indigo-500/40
            bg-gradient-to-r
            from-indigo-500/15
            via-slate-800
            to-slate-900
            shadow-lg
            shadow-indigo-500/10
          `
          : `
            border-transparent
            hover:border-slate-700
            hover:bg-slate-800/70
          `
      }
    `;

    return html`
      <button class="${itemClasses}">
        ${
          this.active
            ? html`
                <div
                  class="
                  absolute
                  left-0
                  top-2
                  bottom-2
                  w-1
                  rounded-r-full
                  bg-indigo-500
                "
                ></div>
              `
            : ""
        }

        <div class="flex items-center gap-3 min-w-0 grow">
          ${
            this.data.icon
              ? html`
                  <div
                    class="
                    flex
                    items-center
                    justify-center
                    size-10
                    shrink-0
                    rounded-lg
                    bg-slate-700/60
                    ring-1
                    transition-all
                    duration-200

                    ${
                      this.active
                        ? `
                          ring-indigo-500/40
                          bg-indigo-500/20
                          text-white
                        `
                        : `
                          ring-slate-600/70
                          text-indigo-400
                          group-hover:text-white
                          group-hover:bg-indigo-500/15
                        `
                    }
                  "
                  >
                    <jk-icon .icon=${this.data.icon} class="size-5"></jk-icon>
                  </div>
                `
              : ""
          }

          <div class="min-w-0 grow">${this._renderContent()}</div>
        </div>

        <div class="ml-4 shrink-0">${this._renderMeta()}</div>
      </button>
    `;
  }

  _renderContent() {
    switch (this.type) {
      case "engine":
        return html`
          <div class="min-w-0">
            <div
              class="
                truncate
                text-base
                font-semibold
                tracking-tight
                text-white
              "
            >
              ${this.data.name}
            </div>

            <div
              class="
                mt-0.5
                truncate
                text-sm
                text-slate-400
              "
            >
              ${this.data.url}
            </div>
          </div>
        `;

      case "preview": {
        const terms = this.data.searchTerms?.trim() || "...";

        return html`
          <div class="min-w-0">
            <div
              class="
                text-sm
                text-slate-400
              "
            >
              ${this.t("searchEnginePreviewPrefix")}
            </div>

            <div
              class="
                truncate
                mt-0.5
                text-white
              "
            >
              <span class="font-semibold">${this.data.name}</span>

              <span
                class="
                  italic
                  text-indigo-300
                  ml-2
                "
              >
                "${terms}"
              </span>
            </div>
          </div>
        `;
      }

      case "service":
      default:
        return html`
          <div class="min-w-0">
            <div
              class="
                truncate
                text-base
                font-semibold
                tracking-tight
                text-white
              "
            >
              ${this.data.name}
            </div>

            <div
              class="
                mt-0.5
                truncate
                text-xs
                uppercase
                tracking-widest
                text-slate-500
              "
            >
              ${this.data.category}
            </div>
          </div>
        `;
    }
  }

  _renderMeta() {
    switch (this.type) {
      case "engine":
        return html`
          <kbd
            class="
              flex
              items-center
              justify-center
              h-7
              min-w-8
              px-2
              rounded-lg
              border
              text-xs
              font-semibold
              tracking-widest
              uppercase

              ${
                this.active
                  ? `
                    border-indigo-500
                    bg-indigo-500/20
                    text-indigo-200
                  `
                  : `
                    border-slate-600
                    bg-slate-900/80
                    text-slate-300
                  `
              }
            "
          >
            :${this.data.prefix}
          </kbd>
        `;

      case "preview":
      case "service":
      default:
        return this.active
          ? html`
              <kbd
                class="
                  hidden
                  sm:flex
                  items-center
                  justify-center
                  h-7
                  px-3
                  rounded-lg
                  border
                  border-indigo-500
                  bg-indigo-500/20
                  text-xs
                  font-semibold
                  tracking-widest
                  uppercase
                  text-indigo-200
                "
              >
                Enter
              </kbd>
            `
          : "";
    }
  }
}

customElements.define("jk-dashboard-search-item", JkDashboardSearchItem);
