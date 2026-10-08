import { generateShortcuts } from '../utils/shortcuts.js';
import { validateConfig } from '../utils/config-validator.js';
import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';
import './dialog.js';
import './config-appearance.js';
import './config-data.js';
import './config-general.js';
import './config-editor.js';

const styles = {
  overlay: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn`,
  container: `w-full max-w-7xl h-[88vh] max-h-[900px] flex flex-col rounded-3xl border border-slate-700/70 bg-slate-900/95 jk-shadow-elevated p-5 sm:p-6`,
  header: `flex items-center justify-between mb-5 pb-4 border-b border-slate-700/50`,
  headerLeft: `flex items-center gap-3`,
  iconBadge: `flex items-center justify-center size-10 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`,
  icon: `size-5 text-indigo-300`,
  title: `text-base font-semibold text-slate-50`,
  subtitle: `text-xs text-slate-500`,
  headerRight: `flex items-center gap-2`,
  statusBadge: `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium`,
  statusValid: `jk-status-success-surface ring-1`,
  statusInvalid: `jk-status-danger-surface ring-1`,
  mainArea: `flex flex-1 gap-5 min-h-0`,
  sidebar: `w-52 shrink-0 flex flex-col gap-2`,
  sidebarBtn: `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all`,
  sidebarBtnActive: `bg-indigo-500/10 border border-indigo-500/20 text-indigo-300`,
  sidebarBtnInactive: `border border-transparent text-slate-400 hover:text-slate-50 hover:bg-slate-800/70`,
  kbd: `ml-auto hidden sm:inline-flex text-[10px] text-slate-500`,
  contentArea: `flex-1 min-w-0 overflow-y-auto`,
  footer: `flex justify-end gap-3 mt-5 pt-4 border-t border-slate-700/50`,
  btnSecondary: `jk-btn jk-btn-secondary`,
  btnSecondaryWhite: `jk-btn jk-btn-secondary`,
  btnPrimary: `jk-btn jk-btn-primary`,
};

export class JkConfigModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    workspaceLabel: {},
    workspaceFile: {},
    preferences: { type: Object },
    configuration: { type: Object },
    saving: { type: Boolean },
    show: { type: Boolean },
    categories: { type: Array },
    searchEngines: { type: Array },
    theme: { type: String },
    t: { type: Function },
    _activeTab: { type: String },
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
    this.theme = 'midnight';
    this._activeTab = 'general';
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
          { ...(this.configuration ?? { searchEngines: this.searchEngines }), categories: generateShortcuts(this.configuration?.categories ?? this.categories) },
          null,
          2
        );
        this._originalConfigString = this._editorValue;
        this._isEditorConfigValid = true;
        this._hasEditorConfigChanged = false;
        this._showDiscardDialog = false;
        this._activeTab = 'general';
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

  _handleKeyDown(e) {
    if (this._showDiscardDialog) return;

    if (e.ctrlKey || e.metaKey) {
      const tab = { '1': 'general', '2': 'appearance', '3': 'data', '4': 'editor' }[e.key];
      if (tab) { e.preventDefault(); e.stopPropagation(); this._setActiveTab(tab); return; }
    }

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
    if (this.saving) return;
    const importedConfig = e.detail;
    this._editorValue = JSON.stringify(importedConfig, null, 2);
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = true;
    this._setActiveTab('editor');
  }

  _handleClose() {
    if (this.saving) return;
    if (this._hasEditorConfigChanged) {
      this._showDiscardDialog = true;
    } else {
      this._forceClose();
    }
  }

  _forceClose() {
    this._showDiscardDialog = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  _handleSave() {
    if (this.saving || !this._hasEditorConfigChanged) return;
    try {
      const newConfig = JSON.parse(this._editorValue);
      if (!validateConfig(newConfig)) throw new Error('Invalid configuration');
      this.dispatchEvent(new CustomEvent('save', {
        detail: { newConfig }, bubbles: true, composed: true,
      }));
    } catch {
      this.dispatchEvent(new CustomEvent('notify', {
        detail: { type: 'error', message: this.t('editConfigSaveFailed') },
        bubbles: true, composed: true,
      }));
    }
  }

  _renderActiveTabContent() {
    switch (this._activeTab) {
      case 'general':
        return html`<jk-config-general .preferences=${this.preferences} .t=${this.t}></jk-config-general>`;
      case 'appearance':
        return html`
          <jk-config-appearance
            .selectedTheme="${this.theme}"
            .t="${this.t}"
          ></jk-config-appearance>
        `;
      case 'data':
        return html`
          <jk-config-data
            .configuration=${this.configuration}
            .readOnly=${this.saving}
            .categories="${this.categories}"
            .searchEngines="${this.searchEngines}"
            .t="${this.t}"
            @config-imported="${this._handleConfigImported}"
          ></jk-config-data>
        `;
      case 'editor':
      default:
        return html`
          <p class="mb-3 text-sm text-slate-400">${this.workspaceFile}</p>
          <jk-config-editor
            .t=${this.t}
            .readOnly=${this.saving}
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

    const statusClass = this._isEditorConfigValid ? styles.statusValid : styles.statusInvalid;
    const tabAppearanceClass =
      this._activeTab === 'appearance' ? styles.sidebarBtnActive : styles.sidebarBtnInactive;
    const tabDataClass =
      this._activeTab === 'data' ? styles.sidebarBtnActive : styles.sidebarBtnInactive;
    const tabEditorClass =
      this._activeTab === 'editor' ? styles.sidebarBtnActive : styles.sidebarBtnInactive;


    return html`
      <div @click="${this._handleClose}" class="${styles.overlay}">
        <div @click="${(e) => e.stopPropagation()}" class="${styles.container}">
          <div class="${styles.header}">
            <div class="${styles.headerLeft}">
              <div class="${styles.iconBadge}">
                <jk-icon icon="ui:settings-2" class="${styles.icon}"></jk-icon>
              </div>
              <div>
                <h2 class="${styles.title}">JumpKey</h2>
                <p class="${styles.subtitle}">
                  ${this.t('configSubtitle')} ${this.workspaceLabel ? ' · ' + this.t('workspace') + ': ' + this.workspaceLabel : ''}
                </p>
              </div>
            </div>

            <div class="${styles.headerRight}">
              ${
                this._activeTab === 'editor'
                  ? html`
                      <div class="${styles.statusBadge} ${statusClass}">
                        <jk-icon
                          .icon="${this._isEditorConfigValid ? 'ui:circle-check' : 'ui:triangle-alert'}"
                          class="size-4"
                        ></jk-icon>
                        <span
                          >${this._isEditorConfigValid ? this.t('tabEditorValid') : this.t('tabEditorInvalid')}</span
                        >
                      </div>
                    `
                  : ''
              }
              <jk-icon-button
                icon="ui:x"
                label="${this.t('close') || 'Close'}"
                @click="${this._handleClose}"
              ></jk-icon-button>
            </div>
          </div>

          <div class="${styles.mainArea}">
            <aside class="${styles.sidebar}">
              <button @click=${()=>this._setActiveTab('general')} class="${styles.sidebarBtn} ${this._activeTab === 'general' ? styles.sidebarBtnActive : styles.sidebarBtnInactive}"><jk-icon icon="ui:settings-2" class="size-4"></jk-icon>${this.t('tabGeneral')}<kbd class="${styles.kbd}">1</kbd></button>
              <button
                @click="${() => this._setActiveTab('appearance')}"
                class="${styles.sidebarBtn} ${tabAppearanceClass}"
              >
                <jk-icon icon="ui:palette" class="size-4"></jk-icon>
                ${this.t('tabAppearance')}
                <kbd class="${styles.kbd}">2</kbd>
              </button>
              <button
                @click="${() => this._setActiveTab('data')}"
                class="${styles.sidebarBtn} ${tabDataClass}"
              >
                <jk-icon icon="ui:database" class="size-4"></jk-icon>
                ${this.t('tabData')}
                <kbd class="${styles.kbd}">3</kbd>
              </button>
              <button
                @click="${() => this._setActiveTab('editor')}"
                class="${styles.sidebarBtn} ${tabEditorClass}"
              >
                <jk-icon icon="ui:code-2" class="size-4"></jk-icon>
                ${this.t('tabEditor')}
                <kbd class="${styles.kbd}">4</kbd>
              </button>
            </aside>

            <main class="${styles.contentArea}">${this._renderActiveTabContent()}</main>
          </div>

          <div class="${styles.footer}">
            ${
              this._activeTab === 'editor'
                ? html`
                    <button
                      type="button"
                      @click="${this._handleClose}"
                      class="${styles.btnSecondary}"
                    >
                      ${this.t('editConfigCancel') || 'Cancel'}
                    </button>
                    <button
                      type="button"
                      @click="${this._handleSave}"
                      ?disabled="${this.saving || !this._isEditorConfigValid || !this._hasEditorConfigChanged}"
                      class="${styles.btnPrimary}"
                    >
                      ${this.saving ? this.t('configSaving') : this.t('editConfigSave')}
                    </button>
                  `
                : html`
                    <button
                      type="button"
                      @click="${this._handleClose}"
                      class="${styles.btnSecondaryWhite}"
                    >
                      ${this.t('close') || 'Close'}
                    </button>
                  `
            }
          </div>
        </div>
      </div>

      ${
        this._showDiscardDialog
          ? html`
              <jk-dialog
                .show=${this._showDiscardDialog}
                type="warning"
                .destructive=${true}
                .title=${this.t('discardChangesTitle')}
                .message=${this.t('discardChangesMessage')}
                icon="ui:triangle-alert"
                iconColor="jk-status-warning"
                .confirmLabel=${this.t('discardConfirm')}
                .cancelLabel=${this.t('cancel')}
                @confirm=${this._forceClose}
                @close=${() => {
                  this._showDiscardDialog = false;
                }}
                @cancel=${() => {
                  this._showDiscardDialog = false;
                }}
              ></jk-dialog>
            `
          : ''
      }
    `;
  }
}

customElements.define('jk-config-modal', JkConfigModal);
