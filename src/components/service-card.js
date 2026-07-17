import { LitElement, html } from "lit";
import "./icon.js";

export class JkServiceCard extends LitElement {
  createRenderRoot() {
    return this; // Tailwind global verwenden
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
      (this.subtitle.includes(".") || this.subtitle.includes("/"));

    const displaySubtitle = isUrl
      ? this.subtitle.replace(/^https?:\/\/(www\.)?/, "")
      : this.subtitle || "";

    return html`
      <div
        @click=${this._handleClick}
        class="
          group
          relative
          flex
          items-center
          gap-4
          w-full
          overflow-hidden
          rounded-2xl
          border
          border-slate-700/70
          bg-gradient-to-br
          from-slate-800
          to-slate-900
          px-5
          py-4
          cursor-pointer
          transition-all
          duration-300
          ease-out
          hover:-translate-y-1
          hover:border-indigo-500/60
          hover:shadow-xl
          hover:shadow-indigo-500/10
          active:scale-[0.98]
        "
      >
        <!-- Hover Accent -->
        <div
          class="
            absolute
            left-0
            top-4
            bottom-4
            w-1
            rounded-r-full
            bg-indigo-500
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-300
          "
        ></div>

        <!-- Hover Glow -->
        <div
          class="
            pointer-events-none
            absolute
            inset-0
            rounded-2xl
            bg-gradient-to-r
            from-indigo-500/0
            via-indigo-500/5
            to-indigo-500/0
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-500
          "
        ></div>

        <!-- Icon -->
        <div
          class="
            relative
            z-10
            flex
            items-center
            justify-center
            size-14
            shrink-0
            overflow-hidden
            rounded-xl
            bg-slate-700/60
            ring-1
            ring-slate-600/70
            text-indigo-400
            transition-all
            duration-300
            ease-out
            group-hover:bg-indigo-500/15
            group-hover:ring-indigo-500/40
            group-hover:text-white
            group-hover:-translate-y-0.5
          "
        >
          <jk-icon
            .icon=${this.icon}
            class="
              size-8
              transition-transform
              duration-300
              group-hover:scale-105
            "
          >
          </jk-icon>
        </div>

        <!-- Content -->
        <div
          class="
            relative
            z-10
            flex
            min-w-0
            grow
            flex-col
            justify-center
            pr-10
          "
        >
          <span
            class="
              truncate
              text-lg
              font-semibold
              leading-tight
              tracking-tight
              text-white
              transition-colors
              duration-300
              group-hover:text-indigo-200
            "
          >
            ${this.name}
          </span>

          <span
            class="
              mt-1
              truncate
              text-sm
              leading-snug
              text-slate-400
              transition-colors
              duration-300
              group-hover:text-slate-300
            "
          >
            ${displaySubtitle}
          </span>
        </div>

        ${
          this.badgeText
            ? html`
                <kbd
                  class="
                    absolute
                    top-4
                    right-4
                    z-20
                    hidden
                    sm:flex
                    items-center
                    justify-center
                    min-w-7
                    h-7
                    px-2
                    rounded-lg
                    text-xs
                    font-semibold
                    tracking-widest
                    uppercase
                    transition-all
                    duration-300
                    ${
                      this.isFavorite
                        ? `
                        border border-indigo-500
                        bg-indigo-500/20
                        text-indigo-200
                        shadow-lg
                        shadow-indigo-500/20
                        group-hover:bg-indigo-500/30
                      `
                        : `
                        border border-slate-600
                        bg-slate-900/80
                        text-slate-300
                        group-hover:border-indigo-500/40
                        group-hover:text-indigo-300
                      `
                    }
                  "
                >
                  ${this.badgeText.toUpperCase()}
                </kbd>
              `
            : ""
        }
      </div>
    `;
  }
}

customElements.define("jk-service-card", JkServiceCard);
