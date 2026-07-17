import { LitElement, html } from "lit";
import "./icon.js";

export class JkHelpModal extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind styling classes
  }

  static properties = {
    show: { type: Boolean },
    isGridView: { type: Boolean },
    t: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.isGridView = false;
    this.t = (key) => key;
  }

  _handleClose() {
    this.show = false; // Close locally
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  render() {
    if (!this.show) return html``;

    const shortcuts = [
      {
        keys: ["Space"],
        desc: this.t("hkSearch"),
      },
      {
        keys: ["#"],
        desc: this.t("hkToggleView"),
      },
    ];

    if (!this.isGridView) {
      shortcuts.push({
        keys: ["1", "-", "0"],
        desc: this.t("hkFavs"),
      });
    }

    shortcuts.push(
      {
        keys: ["A-Z"],
        desc: this.t("hkCat"),
      },
      {
        keys: ["A-Z"],
        desc: this.t("hkService"),
        context: true,
      },
      {
        keys: [":"],
        desc: this.t("hkSearchEngines"),
      },
      {
        keys: ["↑", "↓"],
        desc: this.t("hkNavigate"),
      },
      {
        keys: ["ESC"],
        desc: this.t("hkReset"),
      },
    );

    return html`
      <div
        @click=${this._handleClose}
        class="
        fixed
        inset-0
        z-50

        flex
        items-center
        justify-center

        p-4

        bg-slate-950/70

        backdrop-blur-md
      "
      >
        <div
          @click=${(e) => e.stopPropagation()}
          class="
          w-full
          max-w-md

          rounded-2xl

          border
          border-slate-700/70

          bg-gradient-to-br
          from-slate-800
          to-slate-900

          shadow-2xl
          shadow-black/40

          p-5

          font-mono
        "
        >
          <!-- Header -->

          <div
            class="
            flex
            items-center
            justify-between

            mb-5
          "
          >
            <div
              class="
              flex
              items-center
              gap-3
            "
            >
              <div
                class="
                flex
                items-center
                justify-center

                size-9

                rounded-xl

                bg-indigo-500/10

                ring-1
                ring-indigo-500/20
              "
              >
                <jk-icon
                  icon="keyboard"
                  class="
                  size-5
                  text-indigo-300
                "
                ></jk-icon>
              </div>

              <h3
                class="
                text-base

                font-semibold

                text-white
              "
              >
                ${this.t("helpTitle")}
              </h3>
            </div>

            <jk-icon-button
              icon="x"
              label="Close"
              @click=${this._handleClose}
            ></jk-icon-button>
          </div>

          <!-- Shortcuts -->

          <div
            class="
            space-y-1
          "
          >
            ${shortcuts.map(
            (item) => html`
              <div
                class="
                  flex
                  items-center
                  justify-between

                  gap-4

                  rounded-xl

                  px-3
                  py-2.5

                  transition-colors

                  hover:bg-slate-800/60
                "
              >
                <span
                  class="
                    text-sm

                    text-slate-400
                  "
                >
                  ${item.desc}
                </span>

                <div
                  class="
                    flex
                    items-center
                    gap-1

                    shrink-0
                  "
                >
                  ${
                    item.context
                      ? html`
                          <span
                            class="
                              mr-1

                              rounded-lg

                              border
                              border-indigo-500/20

                              bg-indigo-500/10

                              px-1.5
                              py-0.5

                              text-[10px]

                              font-bold

                              text-indigo-300
                            "
                          >
                            ${this.t("contextInCat")}
                          </span>
                        `
                      : ""
                  }
                  ${item.keys.map(
                    (key) => html`
                      <kbd
                        class="
                          inline-flex
                          items-center
                          justify-center

                          min-w-8
                          h-7

                          rounded-lg

                          border
                          border-slate-700

                          bg-slate-950

                          px-2

                          text-xs

                          font-bold

                          text-indigo-300

                          shadow-inner
                          shadow-black/40
                        "
                      >
                        ${key}
                      </kbd>
                    `,
                  )}
                </div>
              </div>
            `,
          )}
          </div>

          <div
            class="
            mt-5

            text-center

            text-[11px]

            text-slate-500
          "
          >
            ${this.t("helpExit")}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-help-modal", JkHelpModal);
