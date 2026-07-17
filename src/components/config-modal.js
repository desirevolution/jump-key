import { LitElement, html } from 'lit';
import './icon.js';
import './icon-button.js';
import './dialog.js';
import './config-data.js';
import './config-editor.js';

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

    this._activeTab = 'data'; // Start-Tab ist jetzt "Daten & Backup"
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = false;
    this._editorValue = '';
    this._originalConfigString = '';
    this._showDiscardDialog = false;
    this.t = (key) => key;

    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  willUpdate(changed) {
    if (changed.has('show')) {
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
        this._activeTab = 'data';

        window.addEventListener('keydown', this._handleKeyDown, true);
      } else {
        window.removeEventListener('keydown', this._handleKeyDown, true);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._handleKeyDown, true);
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
      if (e.key === '1') {
        e.preventDefault();
        e.stopPropagation();
        this._setActiveTab('data');
        return;
      } else if (e.key === '2') {
        e.preventDefault();
        e.stopPropagation();
        this._setActiveTab('editor');
        return;
      }
    }

    // Shortcuts nur verarbeiten, wenn wir uns im Editor-Tab befinden
    if (this._activeTab === 'editor') {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (isSaveShortcut) {
        e.preventDefault();
        e.stopPropagation();
        if (this._isEditorConfigValid && this._hasEditorConfigChanged) {
          this._handleSave();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const activeElementId = document.activeElement?.id;
        const isSaveEnabled = this._isEditorConfigValid && this._hasEditorConfigChanged;

        if (activeElementId === 'cancelModalBtn' || activeElementId === 'saveModalBtn') {
          e.preventDefault();
          e.stopPropagation();

          if (e.key === 'ArrowLeft' && activeElementId === 'saveModalBtn') {
            this._focusButton('cancelModalBtn');
          } else if (
            e.key === 'ArrowRight' &&
            activeElementId === 'cancelModalBtn' &&
            isSaveEnabled
          ) {
            this._focusButton('saveModalBtn');
          }
          return;
        }
      }
    }

    if (e.key === 'Escape') {
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
    this._setActiveTab('editor');
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
    window.removeEventListener('keydown', this._handleKeyDown, true);
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  _handleSave() {
    try {
      const parsedJson = JSON.parse(this._editorValue);
      this.dispatchEvent(
        new CustomEvent('save', {
          detail: {
            newConfig: parsedJson,
            oldConfig: this._originalConfigString,
          },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      console.error('Failed to parse editor JSON on save', e);
    }
  }

  _renderActiveTabContent() {
    switch (this._activeTab) {
      case 'data':
        return html`
          <jk-config-data
            .categories="${this.categories}"
            .searchEngines="${this.searchEngines}"
            .t="${this.t}"
            @config-imported="${this._handleConfigImported}"
          ></jk-config-data>
        `;
      case 'editor':
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
        class="
        fixed
        inset-0

        z-50

        flex
        items-center
        justify-center

        p-4

        bg-slate-950/80

        backdrop-blur-md

        animate-fadeIn
      "
      >
        <div
          @click="${(e) => e.stopPropagation()}"
          class="
          w-full
          max-w-7xl

          h-[88vh]
          max-h-[900px]

          flex
          flex-col

          rounded-3xl

          border
          border-slate-700/70

          bg-slate-900/95

          shadow-2xl
          shadow-black/50

          p-5
          sm:p-6
        "
        >
          <!-- Header -->

          <div
            class="
            flex
            items-center
            justify-between

            mb-5
            pb-4

            border-b
            border-slate-700/50
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

                size-10

                rounded-xl

                bg-indigo-500/10

                ring-1
                ring-indigo-500/20
              "
              >
                <jk-icon
                  icon="settings-2"
                  class="
                  size-5

                  text-indigo-300
                "
                ></jk-icon>
              </div>

              <div>
                <h2
                  class="
                  text-base
                  font-semibold
                  text-white
                "
                >
                  ${this.t('dashboardSettings') || 'Dashboard Settings'}
                </h2>

                <p
                  class="
                  text-xs
                  text-slate-500
                "
                >
                  Configuration & Backup
                </p>
              </div>
            </div>

            <div
              class="
              flex
              items-center
              gap-2
            "
            >
              ${
                this._activeTab === 'editor'
                  ? html`
                      <div
                        class="
                        flex
                        items-center
                        gap-2

                        px-3
                        py-1.5

                        rounded-xl

                        ${
                          this._isEditorConfigValid
                            ? `
                              bg-emerald-500/10
                              text-emerald-400
                              ring-1
                              ring-emerald-500/20
                            `
                            : `
                              bg-rose-500/10
                              text-rose-400
                              ring-1
                              ring-rose-500/20
                            `
                        }
                      "
                      >
                        <jk-icon
                          .icon="${this._isEditorConfigValid ? 'circle-check' : 'triangle-alert'}"
                          class="size-4"
                        ></jk-icon>

                        <span
                          class="
                          text-xs
                          font-medium
                        "
                        >
                          ${this._isEditorConfigValid ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                    `
                  : ''
              }

              <jk-icon-button icon="x" label="Close" @click="${this._handleClose}"></jk-icon-button>
            </div>
          </div>

          <!-- Main Area -->

          <div
            class="
            flex
            flex-1

            gap-5

            min-h-0
          "
          >
            <!-- Navigation -->

            <aside
              class="
              w-52

              shrink-0

              flex
              flex-col

              gap-2
            "
            >
              <button
                @click="${() => this._setActiveTab('data')}"
                title="Ctrl + 1"
                class="
                flex
                items-center
                gap-3

                px-4
                py-3

                rounded-xl

                text-sm

                font-medium

                transition-all

                ${
                  this._activeTab === 'data'
                    ? `
                      bg-indigo-500/10
                      border
                      border-indigo-500/20
                      text-indigo-300
                    `
                    : `
                      border
                      border-transparent
                      text-slate-400
                      hover:text-white
                      hover:bg-slate-800/70
                    `
                }
              "
              >
                <jk-icon icon="database" class="size-4"></jk-icon>

                ${this.t('tabData')}

                <kbd
                  class="
                  ml-auto

                  hidden
                  sm:inline-flex

                  text-[10px]

                  text-slate-500
                "
                >
                  1
                </kbd>
              </button>

              <button
                @click="${() => this._setActiveTab('editor')}"
                title="Ctrl + 2"
                class="
                flex
                items-center
                gap-3

                px-4
                py-3

                rounded-xl

                text-sm

                font-medium

                transition-all

                ${
                  this._activeTab === 'editor'
                    ? `
                      bg-indigo-500/10
                      border
                      border-indigo-500/20
                      text-indigo-300
                    `
                    : `
                      border
                      border-transparent
                      text-slate-400
                      hover:text-white
                      hover:bg-slate-800/70
                    `
                }
              "
              >
                <jk-icon icon="code-2" class="size-4"></jk-icon>

                ${this.t('tabEditor') || 'JSON Editor'}

                <kbd
                  class="
                  ml-auto

                  hidden
                  sm:inline-flex

                  text-[10px]

                  text-slate-500
                "
                >
                  2
                </kbd>
              </button>
            </aside>

            <!-- Content -->

            <main
              class="
              flex-1

              min-w-0

              overflow-hidden
            "
            >
              ${this._renderActiveTabContent()}
            </main>
          </div>

          <!-- Footer -->

          <div
            class="
            flex
            justify-end
            gap-3

            mt-5
            pt-4

            border-t
            border-slate-700/50
          "
          >
            ${
              this._activeTab === 'editor'
                ? html`
                    <button
                      type="button"
                      id="cancelModalBtn"
                      @click="${this._handleClose}"
                      class="
                      px-5
                      py-2.5

                      rounded-xl

                      text-sm

                      font-medium

                      text-slate-300

                      bg-slate-800

                      border
                      border-slate-700

                      hover:bg-slate-700

                      transition-all
                    "
                    >
                      ${this.t('editConfigCancel') || 'Cancel'}
                    </button>

                    <button
                      type="button"
                      id="saveModalBtn"
                      @click="${this._handleSave}"
                      ?disabled="${!this._isEditorConfigValid || !this._hasEditorConfigChanged}"
                      class="
                      px-5
                      py-2.5

                      rounded-xl

                      text-sm

                      font-medium

                      text-white

                      transition-all

                      ${
                        this._isEditorConfigValid && this._hasEditorConfigChanged
                          ? `
                            bg-indigo-600
                            hover:bg-indigo-500
                            cursor-pointer
                          `
                          : `
                            bg-slate-700
                            text-slate-500
                            cursor-not-allowed
                            opacity-50
                          `
                      }
                    "
                    >
                      ${this.t('editConfigSave') || 'Save'}
                    </button>
                  `
                : html`
                    <button
                      type="button"
                      @click="${this._handleClose}"
                      class="
                      px-5
                      py-2.5

                      rounded-xl

                      text-sm

                      font-medium

                      text-white

                      bg-slate-800

                      border
                      border-slate-700

                      hover:bg-slate-700
                    "
                    >
                      ${this.t('close') || 'Close'}
                    </button>
                  `
            }
          </div>
        </div>

        <jk-dialog
          .show="${this._showDiscardDialog}"
          title="${this.t('tabEditorDiscardChangesTitle')}"
          message="${this.t('tabEditorDiscardChangesMsg')}"
          icon="triangle-alert"
          iconColor="text-rose-400"
          confirmLabel="${this.t('tabEditorDiscardChangesConfirm')}"
          cancelLabel="${this.t('tabEditorDiscardChangesCancel')}"
          @confirm="${this._forceClose}"
          @cancel="${() => (this._showDiscardDialog = false)}"
        ></jk-dialog>
      </div>
    `;
  }
}

customElements.define('jk-config-modal', JkConfigModal);
