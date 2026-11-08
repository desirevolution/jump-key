import { checkResetConnection, clearLocalData, resetDestination } from '../utils/reset-local-data.js';
import { clearOfflineDatabase } from '../utils/offline-cache.js';
import { generateShortcuts } from '../utils/shortcuts.js';
import { validateConfig } from '../utils/config-validator.js';
import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';
import './dialog.js';
import './config-appearance.js';
import './config-data.js';
import './config-general.js';
import './config-info.js';
import './config-editor.js';
import './management.js';
import './quick-add.js';
import './change-guard.js';

const styles = {
  overlay: `jk-settings-page`,
  container: `jk-settings-shell min-h-0 w-full flex flex-col`,
  header: `shrink-0 flex items-center justify-between mb-5 pb-4 border-b border-slate-700/50`,
  headerLeft: `flex items-center gap-3`,
  iconBadge: `flex items-center justify-center size-10 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`,
  icon: `size-5 text-indigo-300`,
  title: `text-base font-semibold text-slate-50`,
  subtitle: `text-xs text-slate-500`,
  headerRight: `flex items-center gap-2`,
  statusBadge: `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium`,
  statusValid: `jk-status-success-surface ring-1`,
  statusInvalid: `jk-status-danger-surface ring-1`,
  mainArea: `flex flex-1 gap-4 min-h-0 min-w-0`,
  sidebar: `jk-settings-sidebar shrink-0 flex flex-col gap-2`,
  sidebarBtn: `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all`,
  sidebarBtnActive: `bg-indigo-500/10 border border-indigo-500/20 text-indigo-300`,
  sidebarBtnInactive: `border border-transparent text-slate-400 hover:text-slate-50 hover:bg-slate-800/70`,
  contentArea: `flex-1 min-w-0 min-h-0 jk-settings-content-area`,
};

export class JkConfigModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    readOnly: { type: Boolean },
    appVersion: {},
    pwaState: {},
    offlineMode: { type: Boolean },
    offlineCacheStatus: {},
    workspaceApi: { type: Boolean },
    workspaceUser: {},
    activeWorkspace: {},
    initialTab: {},
    _showResetDialog: { state: true },
    _resetting: { state: true },
    separateWorkspacePreferences: {},
    workspaceLabel: {},
    workspaceFile: {},
    preferences: { type: Object },
    configuration: { type: Object },
    saving: { type: Boolean },
    saveError: {},
    serverSnapshot: {},
    show: { type: Boolean },
    suspended: { type: Boolean },
    serviceEditor: { type: Boolean },
    serviceConfig: { attribute: false },
    serviceSaveConfig: { attribute: false },
    serviceInitial: { attribute: false },
    serviceCategoryIndex: {},
    serviceReturnToSettings: { type: Boolean },
    serviceWorkspaceLabel: {},
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
    _pendingImport: { type: Object },
    _managementEditing: { state: true },
  };

  constructor() {
    super();
    this.show = false;
    this.suspended = false;
    this.serviceEditor = false;
    this.serviceInitial = {};
    this.serviceCategoryIndex = -1;
    this.serviceReturnToSettings = false;
    this._showResetDialog = false;
    this._resetting = false;
    this.categories = [];
    this.searchEngines = [];
    this.theme = 'midnight';
    this._activeTab = 'general';
    this._managementEditing = false;
    this.initialTab = 'general';
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = false;
    this._editorValue = '';
    this._originalConfigString = '';
    this._showDiscardDialog = false;
    this._pendingImport = null;
    this._pendingNavigation = null;
    this._pendingDestination = 'fortfährst';
    this.t = (key) => key;
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleBeforeUnload = this._handleBeforeUnload.bind(this);
  }

  willUpdate(changed) {
    if(changed.has('serviceEditor') && this.serviceEditor){
      this._settingsScrollOnResume=this.querySelector('.jk-settings-page')?.scrollTop||0;
    }
    if(changed.has('suspended') && this.suspended){
      this._settingsScrollOnResume=this.querySelector('.jk-settings-page')?.scrollTop||0;
    }
    if (changed.has('show')) {
      if (this.show) {
        this._refreshJsonFromConfiguration();
        this._showDiscardDialog=false;
        this._pendingImport=null;
        this._activeTab=this.initialTab||'general';
        this._managementEditing=false;
        this._previousFocus=document.activeElement;
        window.addEventListener('keydown',this._handleKeyDown,true);
        window.addEventListener('beforeunload',this._handleBeforeUnload);
      }else{
        window.removeEventListener('keydown',this._handleKeyDown,true);
        window.removeEventListener('beforeunload',this._handleBeforeUnload);
        if(this._previousFocus?.isConnected)this._previousFocus.focus({preventScroll:true});
      }
    }else if(changed.has('configuration') && this.show && !this._hasEditorConfigChanged){
      // A management write to the active workspace invalidates the old raw-JSON baseline.
      this._refreshJsonFromConfiguration();
    }
  }
  _refreshJsonFromConfiguration() {
    this._editorValue=JSON.stringify({
      ...(this.configuration??{searchEngines:this.searchEngines}),
      categories:generateShortcuts(this.configuration?.categories??this.categories),
    },null,2);
    this._originalConfigString=this._editorValue;
    this._isEditorConfigValid=true;
    this._hasEditorConfigChanged=false;
  }

  updated(changed) {
    if(changed.has('serviceEditor') && !this.serviceEditor && this.show){
      this.updateComplete.then(()=>{const page=this.querySelector('.jk-settings-page');if(page)page.scrollTop=this._settingsScrollOnResume||0;});
    }
    if(changed.has('suspended') && !this.suspended && this.show){
      const page=this.querySelector('.jk-settings-page');
      if(page)page.scrollTop=this._settingsScrollOnResume||0;
    }
    if (changed.has('show') && this.show && !this.suspended) {
      this.querySelector('.jk-config-shell')?.focus({ preventScroll: true });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._handleKeyDown, true);
    window.removeEventListener('beforeunload', this._handleBeforeUnload);
  }

  _handleBeforeUnload(e) {
    if (!this.show || !(this._hasEditorConfigChanged || this.querySelector('jk-management')?.hasUnsavedChanges || (this.serviceEditor && this.querySelector('jk-quick-add')?.hasChanges))) return;
    e.preventDefault();
    e.returnValue = '';
  }

  _handleKeyDown(e) {
    if (this.serviceEditor) {
      if (e.target?.closest?.('jk-change-guard, .jk-manager-delete-dialog')) return;
      if (e.key === 'Escape') { e.preventDefault();e.stopPropagation();this._serviceClose(); }
      return;
    }
    if (this.suspended || this._showDiscardDialog || this._showResetDialog || this._pendingImport || this._resetting) return;
    if ([...this.querySelectorAll('jk-management jk-sortable-list')].some(list=>list._drag) || this.querySelector('jk-management')?.editing) return;

    if (e.ctrlKey || e.metaKey) {
      const tab = { '1': 'general', '2': 'manage', '3': 'appearance', '4': 'data', '5': 'editor', '6': 'info' }[e.key];
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

  _requestNavigation(destination, fn) {
    const manager = this._activeTab === 'manage' ? this.querySelector('jk-management') : null;
    if (manager?.hasUnsavedChanges) {
      manager.requestNavigate(fn,destination);
      return;
    }
    if (this._hasEditorConfigChanged) {
      this._pendingNavigation=fn;
      this._pendingDestination=destination;
      this._showDiscardDialog=true;
      return;
    }
    fn();
  }
  _setActiveTab(tab) {
    if(this.serviceEditor){
      this.dispatchEvent(new CustomEvent('service-nav-request',{detail:{tab}}));
      return;
    }
    if (this.readOnly && ['data', 'editor'].includes(tab)) return;
    if (this._activeTab === tab) return;
    this._requestNavigation(`zu „${tab==='manage'?'Verwaltung':tab==='general'?'Allgemein':tab==='appearance'?'Darstellung':tab==='data'?'Daten':tab==='info'?'Info':'JSON'}“ wechselst`,()=>{this._managementEditing=false;this._activeTab=tab;});
  }
  async _resolveDiscardDialog(save) {
    if (save) {
      if (!this._isEditorConfigValid) return;
      this._handleSave();
      return;
    }
    this._editorValue=this._originalConfigString;
    this._hasEditorConfigChanged=false;
    this._isEditorConfigValid=true;
    const fn=this._pendingNavigation;
    this._pendingNavigation=null;
    this._showDiscardDialog=false;
    fn?.();
  }
  configSaved(config) {
    this._editorValue=JSON.stringify(config,null,2);
    this._originalConfigString=this._editorValue;
    this._hasEditorConfigChanged=false;
    this._isEditorConfigValid=true;
    const fn=this._pendingNavigation;
    this._pendingNavigation=null;
    this._showDiscardDialog=false;
    fn?.();
  }
  _handleEditorChange(e) {
    const { value, isValid, hasChanged } = e.detail;
    this._editorValue = value;
    this._isEditorConfigValid = isValid;
    this._hasEditorConfigChanged = hasChanged;
    if (this.saveError && this.saveError !== this.t('configConflict')) this.dispatchEvent(new CustomEvent('dismiss-error'));
  }

  _handleConfigImported(e) {
    if (this.saving || this._resetting) return;
    this._pendingImport = e.detail;
  }

  _confirmImport() {
    if (!this._pendingImport) return;
    this._editorValue = JSON.stringify(this._pendingImport, null, 2);
    this._isEditorConfigValid = true;
    this._hasEditorConfigChanged = this._editorValue !== this._originalConfigString;
    this._pendingImport = null;
    this._setActiveTab('editor');
  }

  _handleClose() {
    if (this.serviceEditor) { this._serviceClose(); return; }
    if (this.saving || this._resetting || this._showResetDialog) return;
    this._requestNavigation('zum Dashboard zurückkehrst',()=>this._forceClose());
  }
  _forceClose() {
    this._showDiscardDialog=false;
    this._pendingNavigation=null;
    this.dispatchEvent(new CustomEvent('close',{bubbles:true,composed:true}));
  }
  async _resetLocalData() {
    if (this._resetting || this.saving) return;
    this._showResetDialog = false;
    this._resetting = true;
    let message = 'resetUnavailable';
    try {
      if (navigator.onLine === false) throw new Error('offline');
      await checkResetConnection({ base: import.meta.env.BASE_URL, workspaceApi: this.workspaceApi });
      message = 'resetFailed';
      await clearOfflineDatabase();
      clearLocalData();
      window.location.replace(resetDestination(window.location.href));
    } catch {
      this._resetting = false;
      this.dispatchEvent(new CustomEvent('notify', { detail: { type: 'error', message: this.t(message) }, bubbles: true, composed: true }));
    }
  }

  _handleSave() {
    if (this.readOnly) return;
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
        return html`<jk-config-general @reset-local-data=${e=>{e.stopPropagation();if(!this.saving)this._showResetDialog=true;}} .readOnly=${this.readOnly} .separateWorkspacePreferences=${this.separateWorkspacePreferences} .preferences=${this.preferences} .t=${this.t}></jk-config-general>`;
      case 'info':
        return html`<jk-config-info .appVersion=${this.appVersion} .pwaState=${this.pwaState}
          .offlineMode=${this.offlineMode} .offlineCacheStatus=${this.offlineCacheStatus} .t=${this.t}></jk-config-info>`;
      case 'appearance':
        return html`
          <jk-config-appearance
            .selectedTheme="${this.theme}"
            .t="${this.t}"
          ></jk-config-appearance>
        `;
      case 'manage':
        return html`<jk-management .user=${this.workspaceUser} .activeWorkspace=${this.activeWorkspace} .readOnly=${this.readOnly} .t=${this.t}
          @management-view-changed=${e=>{this._managementEditing=e.detail.editing;}}></jk-management>`;
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
          <p class="mb-3 shrink-0 break-all text-sm text-slate-400">${this.workspaceFile}</p>
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

  _navigateBack() {
    if (this.serviceEditor) { this._serviceClose(); return; }
    if (this._activeTab === 'manage' && this._managementEditing) {
      this.querySelector('jk-management')?.goBack();
      return;
    }
    this._handleClose();
  }
  _backDestination() {
    if (this.serviceEditor) return this.serviceReturnToSettings ? 'Zurück zur Verwaltung' : 'Zurück zum Dashboard';
    return this._activeTab === 'manage' && this._managementEditing
      ? 'Zurück zur Verwaltung' : 'Zurück zum Dashboard';
  }
  _serviceClose(){ this.dispatchEvent(new CustomEvent('service-close-request')); }
  _renderServiceEditor(){
    const serviceId=this.serviceInitial?.serviceId;
    const category=this.serviceConfig?.categories?.[this.serviceCategoryIndex]?.category;
    return html`<section class="jk-settings-service-editor" aria-label=${serviceId?'Service bearbeiten':'Service erstellen'}>
      <div class="jk-editor-title">
        <h2>${serviceId?'Service bearbeiten':'Service erstellen'}</h2>
        <p>${this.serviceReturnToSettings?`Workspace: ${this.serviceWorkspaceLabel||this.activeWorkspace}${category?' · '+category:''}`:'Aus dem Dashboard'}</p>
      </div>
      <jk-quick-add .inline=${true} .config=${this.serviceConfig||this.configuration}
        .saveConfig=${this.serviceSaveConfig} .initial=${this.serviceInitial||{}}
        .initialDelete=${Boolean(this.serviceInitial?.initialDelete)}
        .initialCategoryIndex=${this.serviceReturnToSettings?this.serviceCategoryIndex:-1} .t=${this.t}
        @request-close=${e=>{e.stopPropagation();this._serviceClose();}}
        @close=${e=>{e.stopPropagation();this.dispatchEvent(new CustomEvent('service-close-request',{detail:{force:true}}));}}
        @saved=${e=>{e.stopPropagation();this.dispatchEvent(new CustomEvent('service-saved',{detail:e.detail}));}}
        @save-error=${e=>{e.stopPropagation();this.dispatchEvent(new CustomEvent('service-save-error',{detail:e.detail}));}}
      ></jk-quick-add>
    </section>`;
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
      <section class="${styles.overlay} jk-config-overlay" ?hidden=${this.suspended}>
        <div role="region" aria-label="JumpKey Einstellungen" tabindex="-1"
          ?inert=${this._resetting || this._showResetDialog || Boolean(this._pendingImport) || this._showDiscardDialog}
          class="${styles.container} jk-config-shell">
          <div class="${styles.header}">
            <div class="${styles.headerLeft}">
              <div class="${styles.iconBadge}">
                <jk-icon icon="ui:settings-2" class="${styles.icon}"></jk-icon>
              </div>
              <div>
                <h2 id="jk-config-title" class="${styles.title}">JumpKey</h2>
                <p class="${styles.subtitle}">
                  ${this.t(this.readOnly ? 'localSettings' : 'configSubtitle')} ${this.workspaceLabel ? ' · ' + this.t('workspace') + ': ' + this.workspaceLabel : ''}
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
                        <span>${!this._isEditorConfigValid ? this.t('editorInvalid') : this._hasEditorConfigChanged ? this.t('editorUnsaved') : this.t('editorSaved')}</span
                        >
                      </div>
                    `
                  : ''
              }
            </div>
          </div>

          <div class="jk-settings-nav-row">
            <button type="button" class="jk-nav-back jk-btn jk-btn-secondary" @click=${this._navigateBack}>
              <jk-icon icon="ui:arrow-left" class="size-4"></jk-icon>${this._backDestination()}
            </button>
          </div>

          <div class="${styles.mainArea} jk-config-main">
            <nav class="${styles.sidebar} jk-config-tabs" aria-label=${this.t('configSubtitle')}>
              <button @click=${()=>this._setActiveTab('general')} class="${styles.sidebarBtn} ${this._activeTab === 'general' ? styles.sidebarBtnActive : styles.sidebarBtnInactive}"><jk-icon icon="ui:settings-2" class="size-4"></jk-icon>${this.t('tabGeneral')}</button>
              ${this.workspaceApi ? html`<button @click=${()=>this._setActiveTab('manage')} class="${styles.sidebarBtn} ${this._activeTab === 'manage' ? styles.sidebarBtnActive : styles.sidebarBtnInactive}"><jk-icon icon="ui:layout-grid" class="size-4"></jk-icon>Verwaltung</button>` : ''}
              <button
                @click="${() => this._setActiveTab('appearance')}"
                class="${styles.sidebarBtn} ${tabAppearanceClass}"
              >
                <jk-icon icon="ui:palette" class="size-4"></jk-icon>
                ${this.t('tabAppearance')}
              </button>
              ${!this.readOnly ? html`<button
                @click="${() => this._setActiveTab('data')}"
                class="${styles.sidebarBtn} ${tabDataClass}"
              >
                <jk-icon icon="ui:database" class="size-4"></jk-icon>
                ${this.t('tabData')}
                
              </button>
              <button
                @click="${() => this._setActiveTab('editor')}"
                class="${styles.sidebarBtn} ${tabEditorClass}"
              >
                <jk-icon icon="ui:code-2" class="size-4"></jk-icon>
                ${this.t('tabEditor')}
              </button>` : ''}
              <button @click=${()=>this._setActiveTab('info')} class="${styles.sidebarBtn} ${this._activeTab === 'info' ? styles.sidebarBtnActive : styles.sidebarBtnInactive}"><jk-icon icon="ui:info" class="size-4"></jk-icon>${this.t('tabInfo')}</button>
            </nav>

            <main class="${styles.contentArea} jk-config-content ${this._activeTab === 'editor' && !this.serviceEditor ? 'jk-config-editor-panel' : 'overflow-y-auto'}">
              ${this.saveError ? html`<div role="alert" class="jk-config-save-error">
                <p>${this.saveError}</p>
                ${this.saveError === this.t('configConflict') ? html`<button type="button" class="jk-btn jk-btn-secondary" @click=${()=>this.dispatchEvent(new CustomEvent('compare-server'))}>${this.t('editorConflictDetails')}</button>` : ''}
              </div>` : ''}
              ${this.serverSnapshot ? html`<section class="jk-config-server-comparison" aria-label=${this.t('editorConflictDetails')}>
                <p>${this.t('editorCompareInfo')}</p>
                <pre tabindex="0">${JSON.stringify(this.serverSnapshot.data, null, 2)}</pre>
                <button type="button" class="jk-btn jk-btn-secondary" @click=${()=>this.dispatchEvent(new CustomEvent('accept-server-revision'))}>${this.t('editorUseServerBasis')}</button>
              </section>` : ''}
              <div class="jk-settings-background-content ${this._activeTab === 'editor' && !this.serviceEditor ? 'jk-settings-json-content' : ''}" ?hidden=${this.serviceEditor} ?inert=${this.serviceEditor}>
                ${this._renderActiveTabContent()}
              </div>
              ${this.serviceEditor?this._renderServiceEditor():''}
              ${this._activeTab === 'editor' && !this.serviceEditor ? html`
                <div class="jk-config-footer jk-json-footer">
                  <button type="button" class="jk-btn jk-btn-secondary" @click=${this._handleClose}>
                    ${this.t('editConfigCancel') || 'Abbrechen'}
                  </button>
                  <button type="button" class="jk-btn jk-btn-primary"
                    ?disabled=${this.saving || !this._isEditorConfigValid || !this._hasEditorConfigChanged}
                    @click=${this._handleSave}>
                    ${this.saving ? this.t('configSaving') : this.t('editConfigSave')}
                  </button>
                </div>` : ''}
            </main>
          </div>

        </div>
      </section>

      ${this._pendingImport ? html`<jk-dialog .show=${true}
        .title=${this.t('importPreviewTitle')}
        .message=${`${this.t('importPreviewDesc')} ${this.workspaceLabel || this.workspaceFile || this.t('workspaceDefault')} · ${this.t('importPreviewCounts', { categories: this._pendingImport.categories?.length ?? 0, services: this._pendingImport.categories?.reduce((sum, category) => sum + (category.services?.length ?? 0), 0) ?? 0 })}${this._hasEditorConfigChanged ? ' · ' + this.t('resetUnsaved') : ''}`}
        .confirmLabel=${this.t('importPreviewConfirm')} .cancelLabel=${this.t('cancel')}
        @confirm=${this._confirmImport} @cancel=${()=>this._pendingImport=null} @close=${()=>this._pendingImport=null}></jk-dialog>` : ''}
      ${this._resetting ? html`<div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80"><p role="status" class="text-slate-100">${this.t('resetLocalProgress')}</p></div>` : ''}
      ${this._showResetDialog ? html`<jk-dialog .show=${true} .destructive=${true}
        .title=${this.t('resetLocalTitle')}
        .message=${this.t('resetLocalConfirm') + (this._hasEditorConfigChanged ? ' ' + this.t('resetUnsaved') : '')}
        icon="ui:trash-2" iconColor="jk-status-warning"
        .confirmLabel=${this.t('resetLocalConfirmButton')} .cancelLabel=${this.t('cancel')}
        @confirm=${this._resetLocalData}
        @cancel=${()=>this._showResetDialog=false} @close=${()=>this._showResetDialog=false}></jk-dialog>` : ''}
      ${this._showDiscardDialog ? html`<jk-change-guard
        .destination=${this._pendingDestination} .subject=${'Die JSON-Konfiguration'}
        .busy=${this.saving} .saveDisabled=${!this._isEditorConfigValid}
        @guard-stay=${()=>{this._showDiscardDialog=false;this._pendingNavigation=null;}}
        @guard-discard=${()=>this._resolveDiscardDialog(false)}
        @guard-save=${()=>this._resolveDiscardDialog(true)}></jk-change-guard>` : ''}
    `;
  }
}

customElements.define('jk-config-modal', JkConfigModal);
