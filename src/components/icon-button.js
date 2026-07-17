import { LitElement, html } from "lit";
import { classMap } from "lit/directives/class-map.js";

import "./icon.js";

export class JkIconButton extends LitElement {
  createRenderRoot() {
    return this; // Behält Tailwind-Strukturen
  }

  static properties = {
    icon: { type: String },
    disabled: { type: Boolean },
    label: { type: String },
    variant: { type: String },
    text: { type: String },
    hideOnMobile: { type: Boolean },
  };

  constructor() {
    super();
    this.disabled = false;
    this.label = "";
    this.variant = "default";
    this.text = "";
    this.hideOnMobile = false;
  }

  render() {
    const isTextVariant = this.variant === "text";

    // Wir nutzen hier flex-row, damit das Icon IMMER links vom Text steht
    const buttonClasses = {
      hidden: this.hideOnMobile,
      "md:inline-flex": this.hideOnMobile,
      "inline-flex": !this.hideOnMobile,
      "group items-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 transition-colors px-2 py-1 rounded hover:bg-slate-800/80 focus:outline-none":
        isTextVariant,
      "group p-2 rounded-xl border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 hover:border-indigo-500/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-150 items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50":
        !isTextVariant,
    };

    const iconClasses = isTextVariant
      ? "w-3.5 h-3.5 block pointer-events-none"
      : "w-5 h-5 transition-transform duration-150 group-hover:scale-105 group-active:scale-95 pointer-events-none";

    return html`
      <button
        type="button"
        ?disabled=${this.disabled}
        aria-label=${this.label || this.text || this.icon || "button"}
        class=${classMap(buttonClasses)}
      >
        <jk-icon .icon=${this.icon} class=${iconClasses}></jk-icon>

        ${
          this.text
            ? html`<span class="text-[11px] leading-none pointer-events-none"
                >${this.text}</span
              >`
            : ""
        }
      </button>
    `;
  }
}

customElements.define("jk-icon-button", JkIconButton);
