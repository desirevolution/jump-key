import { LitElement, html } from "lit";
import "./icon.js"; // Importiert dein flexibles jk-icon

export class JkIconButton extends LitElement {
  createRenderRoot() {
    return this; // Behält Tailwind-Strukturen für einfaches Styling von außen
  }

  static properties = {
    // Reicht alle flexiblen Icon-Eigenschaften 1:1 an jk-icon weiter
    icon: { type: String },

    // Nützliche Button-Eigenschaften für Barrierefreiheit und Interaktion
    disabled: { type: Boolean },
    label: { type: String }, // Für Screenreader (aria-label)
  };

  constructor() {
    super();
    this.disabled = false;
    this.label = "";
  }

  render() {
    return html`
      <button
        type="button"
        ?disabled=${this.disabled}
        aria-label=${this.label || this.icon || "button"}
        class="group p-2 rounded-xl border border-slate-700/50 bg-slate-800/40 text-slate-400 
               hover:text-white hover:bg-slate-700/60 hover:border-indigo-500/50
               active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none 
               transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <jk-icon
          .icon=${this.icon}
          class="w-5 h-5 transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
        ></jk-icon>
      </button>
    `;
  }
}

customElements.define("jk-icon-button", JkIconButton);
