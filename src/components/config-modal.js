import { LitElement, html } from "lit";
import { basicEditor } from "prism-code-editor/setups";
import "prism-code-editor/prism/languages/json";
import "prism-code-editor/layout.css";
import "prism-code-editor/themes/night-owl.css";
import "./icon.js"; // Standardized wa-dashboard-icon wrapper
import "./jk-icon-button.js"; // Standardized wa-dashboard-icon-button wrapper

export class JkConfigModal extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind configuration styles
  }

  static properties = {
    show: { type: Boolean },
    categories: { type: Array },
    searchEngines: { type: Array },
    t: { type: Function }, // Pass down translation helper
    _isEditorConfigValid: { type: Boolean },
    _hasEditorConfigChanged: { type: Boolean },
    _editorValue: { type: String },
    _originalConfigString: { type: String },
    _editorInstance: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.categories = [];
    this.searchEngines = [];

    // Internal reactive states
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = false;
    this._editorValue = "";
    this._originalConfigString = "";
    this._editorInstance = null;
    this.t = (key) => key;
  }

  willUpdate(changed) {
    if (changed.has("show") && this.show) {
      this._editorValue = JSON.stringify(
        {
          categories: this.categories,
          searchEngines: this.searchEngines,
        },
        null,
        2,
      );
      this._originalConfigString = this._editorValue;
      this._isEditorConfigValid = true;
      this._hasEditorConfigChanged = false;
    }
  }

  async updated(changedProperties) {
    if (changedProperties.has("show") && this.show) {
      await this.updateComplete;
      this.initEditor();
    }
  }

  initEditor() {
    const container = this.querySelector("#editorContainer");
    if (!container) return;
    container.innerHTML = "";

    this._editorInstance = basicEditor(
      container,
      {
        value: this._editorValue,
        language: "json",
        theme: "night-owl",
        onUpdate: (value) => {
          this._editorValue = value;
          try {
            const changed = value !== this._originalConfigString;
            if (this._hasEditorConfigChanged !== changed) {
              this._hasEditorConfigChanged = changed;
            }
            const parsed = JSON.parse(value);
            const isStructureValid = this.validateConfig(parsed);
            if (this._isEditorConfigValid !== isStructureValid) {
              this._isEditorConfigValid = isStructureValid;
            }
          } catch (err) {
            if (this._isEditorConfigValid) {
              this._isEditorConfigValid = false;
            }
          }
        },
      },
      (editor) => {
        requestAnimationFrame(() => {
          this._editorInstance?.textarea?.focus();
        });
      },
    );
  }

  validateConfig(jsonObj) {
    if (!jsonObj || typeof jsonObj !== "object") return false;

    const hasCategories =
      Array.isArray(jsonObj.categories) && jsonObj.categories.length > 0;
    const hasSearchEngines =
      Array.isArray(jsonObj.searchEngines) && jsonObj.searchEngines.length > 0;

    if (!hasCategories || !hasSearchEngines) return false;

    const isCategoriesValid = jsonObj.categories.every(
      (cat) =>
        typeof cat.category === "string" &&
        typeof cat.categoryKey === "string" &&
        Array.isArray(cat.services),
    );

    const isSearchEnginesValid = jsonObj.searchEngines.every(
      (engine) =>
        typeof engine.name === "string" &&
        typeof engine.prefix === "string" &&
        typeof engine.url === "string",
    );

    return isCategoriesValid && isSearchEnginesValid;
  }

  _handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  _handleSave() {
    try {
      const parsedJson = JSON.parse(this._editorValue);
      this.dispatchEvent(
        new CustomEvent("save", {
          detail: { config: parsedJson },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      console.error("Failed to parse editor JSON on save", e);
    }
  }

  render() {
    // 1. Restore visibility guard-clause
    if (!this.show) return html``;

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
        @click="${this._handleClose}"
        class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      >
        <div
          @click="${(e) => e.stopPropagation()}"
          class="bg-slate-800 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl p-6 flex flex-col h-[80vh] font-mono"
        >
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-bold text-white flex items-center gap-2">
              <jk-icon icon="edit" class="text-indigo-400 w-5 h-5"></jk-icon>
              ${this.t("editConfig")}
            </span>

            <div class="flex items-center gap-3">
              <div
                class="p-2 transition-all duration-300 ${
                  this._isEditorConfigValid
                    ? "text-emerald-400"
                    : "text-rose-400"
                }"
                title="${this._isEditorConfigValid ? this.t("editConfigValid") : this.t("editConfigInvalid")}"
              >
                <jk-icon
                  .icon="${this._isEditorConfigValid ? "circle-check" : "triangle-alert"}"
                  class="w-5 h-5"
                ></jk-icon>
              </div>

              <jk-icon-button
                icon="x"
                @click="${this._handleClose}"
              ></jk-icon-button>
            </div>
          </div>

          <div
            id="editorContainer"
            class="w-full grow rounded-xl overflow-hidden bg-slate-900 border ${
              this._isEditorConfigValid
                ? "border-slate-700 focus-within:border-indigo-500"
                : "border-rose-500 focus-within:border-rose-500"
            } transition-colors"
          ></div>

          <div class="flex justify-end gap-3 mt-4">
            <button
              type="button"
              @click="${this._handleClose}"
              class="px-4 py-2 bg-slate-700 border border-transparent hover:border-indigo-500 rounded-xl text-sm font-medium transition-colors"
            >
              ${this.t("editConfigCancel")}
            </button>

            <button
              type="button"
              @click="${this._handleSave}"
              ?disabled="${!this._isEditorConfigValid || !this._hasEditorConfigChanged}"
              class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all ${
                this._isEditorConfigValid && this._hasEditorConfigChanged
                  ? "bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed opacity-50"
              }"
            >
              ${this.t("editConfigSave")}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-config-modal", JkConfigModal);
