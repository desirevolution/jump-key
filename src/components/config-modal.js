import { LitElement, html, css } from "lit";
import { basicEditor } from "prism-code-editor/setups";
import "prism-code-editor/prism/languages/json";
import { unsafeCSS } from "lit";

import prismLayout from "prism-code-editor/layout.css?inline" with { type: "css" };
import prismTheme from "prism-code-editor/themes/night-owl.css?inline" with { type: "css" };
import "./icon.js";

export class JkConfigModal extends LitElement {
  static properties = {
    show: { type: Boolean },
    categories: { type: Array },
    searchEngines: { type: Array },
    t: { type: Function },
    _isEditorConfigValid: { type: Boolean },
    _hasEditorConfigChanged: { type: Boolean },
    _editorValue: { type: String },
    _originalConfigString: { type: String },
    _editorInstance: { type: Function },
  };

  static styles = [
    // Include external library structural styles inside the component boundary
    css`
      ${unsafeCSS(prismLayout)}
    `,
    css`
      ${unsafeCSS(prismTheme)}
    `,
    css`
      :host {
        display: block;
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          sans-serif;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Backdrop Overlay */
      .backdrop {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background-color: rgba(2, 6, 23, 0.85); /* bg-slate-950/85 */
        backdrop-filter: blur(8px); /* backdrop-blur-sm */
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 1rem;
        animation: fadeIn 0.2s ease-out forwards;
      }

      /* Modal Core Layout Window */
      .modal-box {
        background-color: #1e293b; /* bg-slate-800 */
        border: 1px solid #334155; /* border-slate-700 */
        width: 100%;
        max-width: 64rem; /* max-w-5xl */
        border-radius: 1rem; /* rounded-2xl */
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        height: 80vh; /* h-[80vh] */
        box-sizing: border-box;
      }

      /* Header Area */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      .title {
        font-size: 1.125rem; /* text-lg */
        font-weight: 700;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
      }

      .title-icon {
        color: #818cf8; /* text-indigo-400 */
        width: 1.25rem;
        height: 1.25rem;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      /* Validation Status Indicator */
      .status-indicator {
        padding: 0.5rem;
        transition: all 0.3s ease;
      }

      .status-valid {
        color: #34d399; /* text-emerald-400 */
      }
      .status-invalid {
        color: #f87171; /* text-rose-400 */
      }

      .status-icon {
        width: 1.25rem;
        height: 1.25rem;
      }

      /* Top Close Button */
      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        background-color: #1e293b; /* approximation of slate-850 */
        border: 1px solid #334155;
        border-radius: 0.375rem; /* rounded-md */
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .close-btn:hover {
        background-color: #273549; /* approximation of slate-750 */
        border-color: #6366f1;
      }

      .close-icon {
        display: block;
        width: 1.25rem;
        height: 1.25rem;
        color: #94a3b8;
        transition: color 0.15s ease;
      }

      .close-btn:hover .close-icon {
        color: #818cf8;
      }

      /* Code Editor Layout Element Wrapper */
      #editorContainer {
        width: 100%;
        flex-grow: 1; /* grow */
        border-radius: 0.75rem; /* rounded-xl */
        overflow: hidden;
        background-color: #0f172a; /* bg-slate-900 */
        border: 1px solid #334155;
        transition: border-color 0.2s ease;
        display: grid;
        grid-template-rows: 1fr auto;
        gap: 1em;
      }

      #editorContainer.invalid {
        border-color: #ef4444; /* border-rose-500 */
      }

      #editorContainer:focus-within {
        border-color: #6366f1; /* focus-within:border-indigo-500 */
      }

      #editorContainer.invalid:focus-within {
        border-color: #ef4444; /* lock to rose border if invalid */
      }

      .prism-code-editor {
        border-radius: 0.4em;
      }

      /* Footer Area Action Controls */
      .footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      /* Shared Button Styles */
      .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.75rem; /* rounded-xl */
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .btn-cancel {
        background-color: #334155; /* bg-slate-700 */
        border: 1px solid transparent;
        color: #ffffff;
      }

      .btn-cancel:hover {
        border-color: #6366f1;
      }

      .btn-save {
        border: none;
        color: #ffffff;
        background-color: #4f46e5; /* bg-indigo-600 */
      }

      .btn-save:hover {
        background-color: #6366f1; /* hover:bg-indigo-500 */
      }

      .btn-save:disabled {
        background-color: #334155;
        color: #64748b;
        cursor: not-allowed;
        opacity: 0.5;
      }
    `,
  ];

  constructor() {
    super();
    this.show = false;
    this.categories = [];
    this.searchEngines = [];
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = false;
    this._editorValue = "";
    this._originalConfigString = "";
    this._editorInstance = null;
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
    // Replaced this.querySelector with shadow root target selector
    const container = this.shadowRoot.querySelector("#editorContainer");
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
          this._editorInstance.textarea.focus();
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
    if (!this.show) return html``;

    return html`
      <div @click="${this._handleClose}" class="backdrop">
        <div @click="${(e) => e.stopPropagation()}" class="modal-box">
          <div class="header">
            <h3 class="title">
              <jk-icon icon="edit" class="title-icon"></jk-icon>
              ${this.t("editConfig")}
            </h3>

            <div class="header-actions">
              <div
                class="status-indicator ${this._isEditorConfigValid ? "status-valid" : "status-invalid"}"
                title="${this._isEditorConfigValid ? this.t("editConfigValid") : this.t("editConfigInvalid")}"
              >
                <jk-icon
                  .icon="${this._isEditorConfigValid ? "circle-check" : "triangle-alert"}"
                  class="status-icon"
                ></jk-icon>
              </div>

              <button @click="${this._handleClose}" class="close-btn">
                <jk-icon icon="x" class="close-icon"></jk-icon>
              </button>
            </div>
          </div>

          <div
            id="editorContainer"
            class="${this._isEditorConfigValid ? "" : "invalid"}"
          ></div>

          <div class="footer-actions">
            <button @click="${this._handleClose}" class="btn btn-cancel">
              ${this.t("editConfigCancel")}
            </button>

            <button
              @click="${this._handleSave}"
              ?disabled="${!this._isEditorConfigValid || !this._hasEditorConfigChanged}"
              class="btn btn-save"
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
