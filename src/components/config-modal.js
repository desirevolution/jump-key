import { LitElement, html } from "lit";
import "./icon.js";
import "./icon-button.js";
import "./dialog.js";
import "./config-data.js";
import "./config-editor.js";

export class JkConfigModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    show: { type: Boolean },
    categories: { type: Array },
    searchEngines: { type: Array },
    t: { type: Function },
    _activeTab: { type: String }, // "data" | "editor"
    _isEditorConfigValid: { type: Boolean },
    _hasEditorConfigChanged: { type: Boolean },
    _editorValue: { type: String },
    _originalConfigString: { type: String },
    _showDiscardDialog: { type: Boolean },
  };

  constructor() {
    super();
    this.show = false;
    this.categories = [];
    this.searchEngines = [];

    this._activeTab = "data"; // Start-Tab ist jetzt "Daten & Backup"
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = false;
    this._editorValue = "";
    this._originalConfigString = "";
    this._showDiscardDialog = false;
    this.t = (key) => key;

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
        this._activeTab = "data";

        window.addEventListener("keydown", this._handleKeyDown, true);
      } else {
        window.removeEventListener("keydown", this._handleKeyDown, true);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._handleKeyDown, true);
  }

  async _focusButton(id) {
    await this.updateComplete;
    const btn = this.querySelector(`#${id}`);
    if (btn) btn.focus();
  }

  _handleKeyDown(e) {
    if (this._showDiscardDialog) return;

    // Tab-Wechsel Shortcuts: Ctrl + 1 (Daten & Backup) oder Ctrl + 2 (JSON-Editor)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "1") {
        e.preventDefault();
        e.stopPropagation();
        this._setActiveTab("data");
        return;
      } else if (e.key === "2") {
        e.preventDefault();
        e.stopPropagation();
        this._setActiveTab("editor");
        return;
      }
    }

    // Shortcuts nur verarbeiten, wenn wir uns im Editor-Tab befinden
    if (this._activeTab === "editor") {
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

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const activeElementId = document.activeElement?.id;
        const isSaveEnabled =
          this._isEditorConfigValid && this._hasEditorConfigChanged;

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
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this._handleClose();
    }
  }

  _setActiveTab(tab) {
    this._activeTab = tab;
  }

  _handleEditorChange(e) {
    const { value, isValid, hasChanged } = e.detail;
    this._editorValue = value;
    this._isEditorConfigValid = isValid;
    this._hasEditorConfigChanged = hasChanged;
  }

  _handleConfigImported(e) {
    const importedConfig = e.detail;
    this._editorValue = JSON.stringify(importedConfig, null, 2);
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = true;

    // Nach erfolgreichem Import direkt in den Editor wechseln
    this._setActiveTab("editor");
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
          detail: {
            newConfig: parsedJson,
            oldConfig: this._originalConfigString,
          },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      console.error("Failed to parse editor JSON on save", e);
    }
  }

  _renderActiveTabContent() {
    switch (this._activeTab) {
      case "data":
        return html`
          <jk-config-data
            .categories="${this.categories}"
            .searchEngines="${this.searchEngines}"
            .t="${this.t}"
            @config-imported="${this._handleConfigImported}"
          ></jk-config-data>
        `;
      case "editor":
      default:
        return html`
          <jk-config-editor
            .value="${this._editorValue}"
            .originalValue="${this._originalConfigString}"
            .isValid="${this._isEditorConfigValid}"
            @editor-change="${this._handleEditorChange}"
          ></jk-config-editor>
        `;
    }
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div
        @click="${this._handleClose}"
        class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      >
        <div
          @click="${(e) => e.stopPropagation()}"
          class="bg-slate-800 border border-slate-700 w-full max-w-7xl rounded-2xl shadow-2xl p-6 flex flex-col h-[85vh] font-sans"
        >
          <div
            class="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/60"
          >
            <span class="text-lg font-bold text-white flex items-center gap-2">
              <jk-icon
                icon="settings"
                class="text-indigo-400 w-5 h-5"
              ></jk-icon>
              ${this.t("dashboardSettings") || "Dashboard-Einstellungen"}
            </span>

            <div class="flex items-center gap-3">
              ${
                this._activeTab === "editor"
                  ? html`
                      <div
                        class="p-2 transition-all duration-300 ${
                        this._isEditorConfigValid
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }"
                        title="${
                        this._isEditorConfigValid
                          ? this.t("editConfigValid")
                          : this.t("editConfigInvalid")
                      }"
                      >
                        <jk-icon
                          .icon="${this._isEditorConfigValid ? "circle-check" : "triangle-alert"}"
                          class="w-5 h-5"
                        ></jk-icon>
                      </div>
                    `
                  : html``
              }

              <jk-icon-button
                icon="x"
                class="hover:bg-slate-700 rounded-lg transition-colors duration-200"
                @click="${this._handleClose}"
              ></jk-icon-button>
            </div>
          </div>

          <div class="flex flex-1 gap-6 overflow-hidden min-h-0">
            <div
              class="w-56 flex flex-col gap-1 shrink-0 border-r border-slate-700/60 pr-4"
            >
              <button
                @click="${() => this._setActiveTab("data")}"
                title="Ctrl + 1"
                class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left outline-none ${
                  this._activeTab === "data"
                    ? "bg-indigo-600/15 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                }"
              >
                💾 ${this.t("tabData") || "Daten & Backup"}
              </button>

              <button
                @click="${() => this._setActiveTab("editor")}"
                title="Ctrl + 2"
                class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left outline-none ${
                  this._activeTab === "editor"
                    ? "bg-indigo-600/15 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                }"
              >
                💻 ${this.t("tabEditor") || "JSON-Editor"}
              </button>
            </div>

            <div class="flex-1 flex flex-col overflow-y-auto pr-1">
              ${this._renderActiveTabContent()}
            </div>
          </div>

          ${
            this._activeTab === "editor"
              ? html`
                  <div
                    class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/60"
                  >
                    <button
                      type="button"
                      id="cancelModalBtn"
                      @click="${this._handleClose}"
                      class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer text-white"
                    >
                      ${this.t("editConfigCancel") || "Abbrechen"}
                    </button>

                    <button
                      type="button"
                      id="saveModalBtn"
                      @click="${this._handleSave}"
                      ?disabled="${!this._isEditorConfigValid || !this._hasEditorConfigChanged}"
                      class="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/50 ${
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
                      ${this.t("editConfigSave") || "Speichern"}
                    </button>
                  </div>
                `
              : html`
                  <div
                    class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/60"
                  >
                    <button
                      type="button"
                      @click="${this._handleClose}"
                      class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors cursor-pointer text-white"
                    >
                      ${this.t("close") || "Schließen"}
                    </button>
                  </div>
                `
          }
        </div>
      </div>

      <jk-dialog
        .show="${this._showDiscardDialog}"
        title="${this.t("discardChangesTitle") || "Ungespeicherte Änderungen"}"
        message="${this.t("discardChangesMsg") || "Du hast ungespeicherte Änderungen vorgenommen. Möchtest du diese wirklich verwerfen?"}"
        icon="triangle-alert"
        iconColor="text-rose-400"
        confirmLabel="${this.t("discardChangesConfirm") || "Änderungen verwerfen"}"
        cancelLabel="${this.t("discardChangesCancel") || "Weiter editieren"}"
        @confirm="${this._forceClose}"
        @cancel="${() => (this._showDiscardDialog = false)}"
      ></jk-dialog>
    `;
  }
}

customElements.define("jk-config-modal", JkConfigModal);
