import { LitElement, html } from "lit";
import "./icon.js"; // Ensure icon component is imported

export class JkIconButton extends LitElement {
  // Disable Shadow DOM to allow global Tailwind styles to apply seamlessly
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      icon: { type: String },
      title: { type: String },
      extraClass: { type: String }, // For things like "hidden md:block"
    };
  }

  constructor() {
    super();
    this.icon = "";
    this.title = "";
    this.extraClass = "";
  }

  render() {
    return html`
      <button
        class="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-all duration-150 group shadow-md ${this.extraClass}"
        title="${this.title}"
      >
        <slot name="prefix"></slot>
        <jk-icon
          icon="${this.icon}"
          class="w-5 h-5 group-hover:text-indigo-400 transition-colors text-slate-400"
        ></jk-icon>
        <slot></slot>
      </button>
    `;
  }
}

customElements.define("jk-icon-button", JkIconButton);
