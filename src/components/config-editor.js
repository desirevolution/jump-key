import { LitElement, html } from "lit";
import { basicEditor } from "prism-code-editor/setups";
import { validateConfig } from "../utils/config-validator.js";
import "prism-code-editor/prism/languages/json";
import "prism-code-editor/layout.css";
import "prism-code-editor/themes/night-owl.css";

export class JkConfigEditor extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    value: { type: String },
    originalValue: { type: String },
    isValid: { type: Boolean },
  };

  constructor() {
    super();
    this.value = "";
    this.originalValue = "";
    this.isValid = true;
    this._editorInstance = null;
  }

  firstUpdated() {
    this.initEditor();
  }

  initEditor() {
    const container = this.querySelector("#editorContainer");
    if (!container) return;
    container.innerHTML = "";

    this._editorInstance = basicEditor(
      container,
      {
        value: this.value,
        language: "json",
        theme: "night-owl",
        onUpdate: (val) => {
          this.value = val;
          let valid = false;
          try {
            const parsed = JSON.parse(val);
            valid = validateConfig(parsed);
          } catch (err) {
            valid = false;
          }

          this.isValid = valid;

          // Event an Modal senden, damit dieses über Änderungen Bescheid weiß
          this.dispatchEvent(
            new CustomEvent("editor-change", {
              detail: {
                value: val,
                isValid: valid,
                hasChanged: val !== this.originalValue,
              },
              bubbles: true,
              composed: true,
            }),
          );
        },
      },
      () => {
        requestAnimationFrame(() => {
          this._editorInstance?.textarea?.focus();
        });
      },
    );
  }

  render() {
    return html`
      <style>
        #editorContainer {
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 1em;
          overflow: hidden;
        }
        .prism-code-editor {
          border-radius: 0.4em;
        }
      </style>

      <div
        id="editorContainer"
        class="w-full h-full rounded-xl overflow-hidden bg-slate-900 border ${
          this.isValid
            ? "border-slate-700 focus-within:border-indigo-500"
            : "border-rose-500 focus-within:border-rose-500"
        } transition-colors"
      ></div>
    `;
  }
}

customElements.define("jk-config-editor", JkConfigEditor);
