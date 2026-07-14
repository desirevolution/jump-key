import { LitElement, html } from "lit";
import { basicEditor } from "prism-code-editor/setups";
import "prism-code-editor/prism/languages/json";
import "prism-code-editor/layout.css";
import "prism-code-editor/themes/night-owl.css";
import "./icon.js";
import "./jk-icon-button.js";
import "./dialog.js";

export class JkConfigModal extends LitElement {
  createRenderRoot() {
    return this;
  }

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
    _showDiscardDialog: { type: Boolean },
  };

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
    this._showDiscardDialog = false;
    this.t = (key) => key;

    // Bind keyboard interceptor
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  willUpdate(changed) {
    if (changed.has("show")) {
      if (this.show) {
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
        this._showDiscardDialog = false;

        // Register capture-phase listener to intercept global Escape keys and Ctrl+S
        window.addEventListener("keydown", this._handleKeyDown, true);
      } else {
        // Cleanup when hiding
        window.removeEventListener("keydown", this._handleKeyDown, true);
      }
    }
  }

  async updated(changedProperties) {
    if (changedProperties.has("show") && this.show) {
      await this.updateComplete;
      this.initEditor();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._handleKeyDown, true);
  }

  // Helper utility to safely query and focus our modal buttons
  async _focusButton(id) {
    await this.updateComplete;
    const btn = this.querySelector(`#${id}`);
    if (btn) {
      btn.focus();
    }
  }

  // Intercept keyboard events globally while modal is active
  _handleKeyDown(e) {
    // If the discard warning dialog is currently showing, let it handle its own keys!
    if (this._showDiscardDialog) {
      return;
    }

    // 1. Ctrl + S (or Cmd + S) Shortcut to Save
    const isSaveShortcut =
      (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
    if (isSaveShortcut) {
      e.preventDefault();
      e.stopPropagation();

      if (this._isEditorConfigValid && this._hasEditorConfigChanged) {
        this._handleSave();
      }
      return;
    }

    // 2. Arrow Key Navigation between footer buttons
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const activeElementId = document.activeElement?.id;
      const isSaveEnabled =
        this._isEditorConfigValid && this._hasEditorConfigChanged;

      // Only navigate if focus is already on one of our action buttons
      if (
        activeElementId === "cancelModalBtn" ||
        activeElementId === "saveModalBtn"
      ) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "ArrowLeft" && activeElementId === "saveModalBtn") {
          this._focusButton("cancelModalBtn");
        } else if (
          e.key === "ArrowRight" &&
          activeElementId === "cancelModalBtn" &&
          isSaveEnabled
        ) {
          this._focusButton("saveModalBtn");
        }
        return;
      }
    }

    // 3. Escape Shortcut to Close
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this._handleClose();
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
    if (this._hasEditorConfigChanged) {
      this._showDiscardDialog = true;
    } else {
      this._forceClose();
    }
  }

  _forceClose() {
    this._showDiscardDialog = false;
    window.removeEventListener("keydown", this._handleKeyDown, true);
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
              id="cancelModalBtn"
              @click="${this._handleClose}"
              class="px-4 py-2 bg-slate-700 border border-transparent focus:border-indigo-500 hover:border-indigo-500 rounded-xl text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              ${this.t("editConfigCancel")}
            </button>

            <button
              type="button"
              id="saveModalBtn"
              @click="${this._handleSave}"
              ?disabled="${!this._isEditorConfigValid || !this._hasEditorConfigChanged}"
              class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                this._isEditorConfigValid && this._hasEditorConfigChanged
                  ? "bg-indigo-600 hover:bg-indigo-500 cursor-pointer border border-transparent focus:border-indigo-300"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed opacity-50 border border-transparent"
              }"
              title="${
                this._isEditorConfigValid && this._hasEditorConfigChanged
                  ? "Ctrl + S"
                  : ""
              }"
            >
              ${this.t("editConfigSave")}
            </button>
          </div>
        </div>
      </div>

      <jk-dialog
        .show="${this._showDiscardDialog}"
        title="${this.t("discardChangesTitle") || "Unsaved Changes"}"
        message="${this.t("discardChangesMsg") || "You have unsaved changes in your editor. Are you sure you want to discard them?"}"
        icon="triangle-alert"
        iconColor="text-rose-400"
        confirmLabel="${this.t("discardChangesConfirm") || "Discard Changes"}"
        cancelLabel="${this.t("discardChangesCancel") || "Keep Editing"}"
        @confirm="${this._forceClose}"
        @cancel="${() => (this._showDiscardDialog = false)}"
      ></jk-dialog>
    `;
  }
}

customElements.define("jk-config-modal", JkConfigModal);
