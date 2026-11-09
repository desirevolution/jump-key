import { html, LitElement } from 'lit';
import { buildQuickConfig, buildEditConfig, buildDeleteConfig, suggestKey, servicePositionTargets, quickFormSnapshot, quickErrorField } from '../utils/quick-add.js';
import { generateShortcuts, categorySelectionKey } from '../utils/shortcuts.js';
import { persistConfig } from '../utils/configuration.js';
import './icon.js';
import './icon-button.js';
import './icon-picker.js';

export class QuickAdd extends LitElement {
  static properties = { inline: {type:Boolean}, saveConfig: {attribute:false}, initialCategoryIndex: {}, initialDelete: {type:Boolean}, keyMode: {}, position: {}, confirmAction: {}, removeEmptyCategory: {}, serviceId: {}, config: {}, initial: {}, categoryKey: {}, t: {}, url: {}, name: {}, category: {}, newCategory: {}, key: {}, icon: {}, error: {}, saving: {} };
  createRenderRoot() { return this; }
  constructor() { super(); Object.assign(this, { inline:false,initialCategoryIndex:-1,initialDelete:false,saveConfig:null,keyMode:'auto',position:'bottom', confirmAction:'', removeEmptyCategory:false, url:'', name:'', category:'', newCategory:'', key:'', icon:'', error:'', saving:false, keyEdited:false }); }
  firstUpdated() {
    this.returnFocus = document.activeElement;
    this.url = this.initial?.url || '';
    this.name = this.initial?.name || '';
    const index = this.initialCategoryIndex>=0 ? this.initialCategoryIndex : generateShortcuts(this.config.categories).findIndex(c => categorySelectionKey(c) === this.categoryKey);
    this.category = index >= 0 && !this.initial?.url ? String(index) : '';
    if (this.initial?.serviceId) {
      this.serviceId = this.initial.serviceId;
      const categories = generateShortcuts(this.config.categories);
      const source = categories.findIndex(c => c.services.some(s => s.id === this.serviceId));
      const service = categories[source]?.services.find(s => s.id === this.serviceId);
      if (service) {
        this.category = String(source);
        const index = categories[source].services.findIndex(s => s.id === this.serviceId);
        this.originalPosition = index === 0 ? 'top' : 'after:' + categories[source].services[index - 1].id;
        this.position = this.originalPosition;
        this.url = service.url;
        this.name = service.name;
        this.icon = service.icon || '';
        this.key = service.key || '';
        this.keyMode = service.shortcutDisabled?'none':service.key?'manual':'auto';
        this.keyEdited = true;
      }
    }
    this.suggest();
    this.initialSnapshot = quickFormSnapshot(this);
    this.updateComplete.then(() => { if (!this.inline)this.querySelector('dialog')?.showModal(); this.querySelector('input')?.focus(); if(this.initialDelete)this.askConfirmation('delete'); });
  }
  disconnectedCallback() {
    if (!this.inline)this.querySelector('dialog')?.close();
    super.disconnectedCallback();
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
  }
  updated() {
    // Apply selection after Lit has inserted/replaced the option elements.
    // This also restores selection when returning from a confirmation screen.
    for (const name of ['category', 'position']) {
      const select = this.querySelector(`select[name="${name}"]`);
      if (select) select.value = this[name];
    }
  }
  changeCategory(category) {
    this.category = category;
    // Returning to the original category restores the existing position.
    // New/different categories default to appending at the end.
    this.position = this.serviceId && category === String(this.sourceIndex)
      ? (this.originalPosition ?? 'bottom') : 'bottom';
    this.removeEmptyCategory = false;
    this.suggest();
  }
  suggest() { if (!this.keyEdited && this.keyMode==='auto') this.key = suggestKey(this.config, this.category, this.name.trim() || this.hostName()); }
  hostName() { try { return new URL(this.url).hostname; } catch { return ''; } }
  get hasChanges() { return this.initialSnapshot !== undefined && quickFormSnapshot(this) !== this.initialSnapshot; }
  close() {
    if (this.saving) return;
    if (this.confirmAction) this.cancelConfirmation();
    else if (this.inline) this.dispatchEvent(new CustomEvent('request-close', {bubbles:true,composed:true}));
    else if (this.hasChanges) this.askConfirmation('discard');
    else this.dispatchEvent(new CustomEvent('close'));
  }
  fieldError(name) {
    const code = this.validationError;
    if (name === 'url' && !this.url && !this.hasChanges) return '';
    return quickErrorField(code, this.category) === name ? code : '';
  }
  renderFieldError(name) {
    const code = this.fieldError(name);
    return code ? html`<span id=${'quick-error-' + name} class="jk-status-danger text-sm" aria-live="polite">${this.t(code)}</span>` : '';
  }
  get validationError() {
    if (!this.config) return 'quickCategoryRequired';
    try { (this.serviceId ? buildEditConfig : buildQuickConfig)(this.config, this); return ''; }
    catch (error) { return error.message.startsWith('quick') ? error.message : 'quickValidationFailed'; }
  }
  get sourceIndex() {
    return this.config?.categories.findIndex(c => c.services.some(s => s.id === this.serviceId)) ?? -1;
  }
  get sourceCategory() { return this.config?.categories[this.sourceIndex]; }
  get sourceService() { return this.sourceCategory?.services.find(s => s.id === this.serviceId); }
  async askConfirmation(action) {
    this.confirmFocus = document.activeElement?.getAttribute('data-focus') || document.activeElement?.getAttribute('name');
    this.error = '';
    this.removeEmptyCategory = false;
    this.confirmAction = action;
    await this.updateComplete;
    this.querySelector('[data-confirm-cancel]')?.focus();
  }
  async cancelConfirmation() {
    this.confirmAction = '';
    this.error = '';
    this.removeEmptyCategory = false;
    await this.updateComplete;
    const target = [...this.querySelectorAll('[name], [data-focus]')].find(el => (el.getAttribute('data-focus') || el.getAttribute('name')) === this.confirmFocus);
    (target || this.querySelector('input'))?.focus();
  }
  async save(e) {
    e?.preventDefault();
    if (this.confirmAction || this.saving || this.validationError || !this.querySelector('form').reportValidity()) return;
    await this.persist('save');
  }
  async persist(action) {
    if (this.saving) return;
    this.error = '';
    try {
      const next = action === 'delete'
        ? buildDeleteConfig(this.config, this.serviceId, this.removeEmptyCategory)
        : (this.serviceId ? buildEditConfig : buildQuickConfig)(this.config, this);
      this.saving = true;
      const config = await (this.saveConfig ? this.saveConfig(next) : persistConfig(next, { base: import.meta.env.BASE_URL }));
      this.dispatchEvent(new CustomEvent('saved', { detail: config }));
    } catch (error) {
      this.error = this.t(error.message.startsWith('quick') ? error.message : 'editConfigSaveFailed');
      this.dispatchEvent(new CustomEvent('save-error', { detail: this.error, bubbles:true, composed:true }));
    } finally { this.saving = false; }
  }
  renderConfirmation() {
    if (this.confirmAction === 'discard') return html`
      <header><h2>${this.t('discardChangesTitle')}</h2></header>
      <p class="my-4">${this.t('discardChangesMessage')}</p>
      <footer><button type="button" class="jk-btn jk-btn-secondary" data-confirm-cancel @click=${this.cancelConfirmation}>${this.t('tabEditorDiscardChangesCancel')}</button>
      <button type="button" class="jk-btn jk-btn-danger-filled" @click=${()=>this.dispatchEvent(new CustomEvent('close'))}>${this.t('discardConfirm')}</button></footer>`;
    return html`<section class="jk-service-delete-confirm" role="group" aria-labelledby="jk-service-confirm-title">
      <header><h2 id="jk-service-confirm-title">${this.t(this.confirmAction === 'delete' ? 'deleteService' : 'confirmMoveTitle')}</h2></header>
      <p class="my-4">${this.t(this.confirmAction === 'delete' ? 'confirmDeleteService' : 'confirmMoveService', { name: this.sourceService?.name || '' })}</p>
      ${this.confirmAction === 'delete' && this.hasChanges ? html`<p role="status" class="jk-status-warning my-3">${this.t('deleteServiceUnsaved')}</p>` : ''}
      ${this.sourceCategory?.services.length === 1 ? html`<label class="jk-empty-category-option"><input type="checkbox" .checked=${this.removeEmptyCategory} ?disabled=${this.saving} @change=${e => this.removeEmptyCategory=e.target.checked}>${this.t('removeEmptyCategory', { category:this.sourceCategory.category })}</label>` : ''}
      ${this.error ? html`<p role="alert" class="jk-status-danger my-3">${this.error}</p>` : ''}
      <footer><button type="button" class="jk-btn jk-btn-secondary" data-confirm-cancel ?disabled=${this.saving} @click=${this.cancelConfirmation}>${this.t('cancel')}</button>
      <button type="button" class=${this.confirmAction === 'delete' ? 'jk-btn jk-btn-danger-filled' : 'jk-btn jk-btn-primary'} ?disabled=${this.saving} @click=${()=>this.persist(this.confirmAction)}>${this.t(this.saving ? 'configSaving' : this.confirmAction === 'delete' ? 'deleteService' : 'editConfigSave')}</button></footer></section>`;
  }
  render() {
    const field = (label, value, handler, attrs = {}) => html`<label>${label}<input name=${attrs.name || 'name'} .value=${value} @input=${handler} ?required=${attrs.required} type=${attrs.type || 'text'} autocomplete="off" aria-invalid=${this.fieldError(attrs.name) ? 'true' : 'false'} aria-describedby=${this.fieldError(attrs.name) ? 'quick-error-' + attrs.name : ''}>${attrs.name ? this.renderFieldError(attrs.name) : ''}</label>`;
    const content = html`
      ${this.confirmAction ? this.renderConfirmation() : html`<form @submit=${this.save}>
        ${this.inline?'':html`<header><h2>${this.t(this.serviceId ? 'editService' : 'quickAdd')}</h2><jk-icon-button icon="ui:x" .label=${this.t('close')} .disabled=${this.saving} @click=${this.close}></jk-icon-button></header>`}
        <fieldset ?disabled=${this.saving}>
          ${field(this.t('quickName'), this.name, e => {this.name=e.target.value; this.suggest();})}
          ${field('URL', this.url, e => {this.url=e.target.value; this.suggest();}, {required:true,type:'url',name:'url'})}
          ${!this.name.trim() ? html`<p class="text-xs text-slate-400">${this.t('quickNameHint')} ${this.hostName()}</p>` : ''}
          <label>${this.t('quickCategory')}<select name="category" required aria-invalid=${this.fieldError('category') ? 'true' : 'false'} aria-describedby="quick-error-category" @change=${e => this.changeCategory(e.target.value)}>
            <option value="" disabled>${this.t('selectCategory')}</option>
            ${this.config?.categories.map((c,i)=>html`<option value=${String(i)}>${c.category}</option>`)}
            <option value="new">${this.t('quickNewCategory')}</option>
          </select>${this.renderFieldError('category')}</label>
          ${this.category === 'new' ? field(this.t('quickNewCategory'), this.newCategory, e=>this.newCategory=e.target.value, {required:true,name:'newCategory'}) : ''}
          <label>${this.t('servicePosition')}<select name="position" .value=${this.position} ?disabled=${!this.category} aria-invalid=${this.fieldError('position') ? 'true' : 'false'} aria-describedby=${this.fieldError('position') ? 'quick-error-position' : ''} @change=${e=>this.position=e.target.value}>
            <option value="top">${this.t('positionTop')}</option>
            ${servicePositionTargets(this.config, this.category, this.serviceId).map(s=>html`<option value=${'after:'+s.id}>${this.t('positionAfter', { name:s.name })}</option>`)}
            <option value="bottom">${this.t('positionBottom')}</option>
          </select>${this.renderFieldError('position')}</label>
          <label>Shortcut-Vergabe<select name="key-mode" .value=${this.keyMode} @change=${e=>{this.keyMode=e.target.value;this.keyEdited=this.keyMode!=='auto';this.suggest();}}>
            <option value="auto">Automatisch</option><option value="manual">Manuell</option><option value="none">Kein Shortcut</option>
          </select></label>
          ${this.keyMode==='manual'?html`${field(this.t('quickKey'), this.key, e=>{this.key=e.target.value;this.keyEdited=true;}, {name:'key'})}<p class="jk-manager-hint">Eine freie Taste A–Z wählen. Belegte Kürzel werden vor dem Speichern geprüft.</p>`:this.keyMode==='auto'?html`<p class="jk-manager-hint">${this.key ? 'Vorschlag: '+this.key.toUpperCase() : 'Kein freier Shortcut vorhanden.'}</p>`:''}
          ${this.keyMode==='manual'?html`<div class="jk-shortcut-grid" aria-label="Verfügbare Tasten">
            ${[...'abcdefghijklmnopqrstuvwxyz'].map(letter=>{const target=this.category==='new'?null:this.config?.categories[Number(this.category)];const used=target?new Set(generateShortcuts([target])[0].services.filter(s=>s.id!==this.serviceId).map(s=>s.key)):new Set();const taken=used.has(letter);return html`<button type="button" ?disabled=${taken} aria-pressed=${String(this.key.toLowerCase()===letter)} title=${taken?'Bereits belegt':'Frei'} @click=${()=>{this.key=letter;this.keyEdited=true;}}>${letter.toUpperCase()}</button>`;})}
          </div>`:''}
          <jk-icon-picker .value=${this.icon} @change-icon=${e=>this.icon=e.detail}></jk-icon-picker>
        </fieldset>
        ${this.error || (this.validationError && !quickErrorField(this.validationError, this.category)) ? html`<p role="status" class="jk-status-danger">${this.error || this.t(this.validationError)}</p>` : ''}
        <footer class="jk-form-footer jk-service-form-footer">
          ${this.serviceId ? html`<button type="button" class="jk-btn jk-btn-danger jk-service-delete-trigger" data-focus="delete" ?disabled=${this.saving} @click=${()=>this.askConfirmation('delete')}><jk-icon icon="ui:trash-2" class="size-4" aria-hidden="true"></jk-icon>${this.t('deleteService')}</button>` : ''}
          <div class="jk-form-footer-actions"><button type="button" data-focus="cancel" class="jk-btn jk-btn-secondary" ?disabled=${this.saving} @click=${this.close}>${this.t('cancel')}</button><button data-focus="save" class="jk-btn jk-btn-primary" ?disabled=${this.saving || Boolean(this.validationError) || Boolean(this.serviceId && !this.hasChanges)} type="submit">${this.t(this.saving?'configSaving':'editConfigSave')}</button></div>
        </footer>
      </form>`}`;
    const keys = e => {e.stopPropagation();if(e.key==='Escape'&&this.inline){e.preventDefault();this.close();}if((e.ctrlKey||e.metaKey)&&e.key==='Enter')this.save(e);};
    if(this.inline) return html`<section class="jk-quick-inline" @keydown=${keys}>${content}</section>`;
    return html`<dialog class="jk-quick-dialog" aria-label=${this.t(this.serviceId?'editService':'quickAdd')} @cancel=${e=>{e.preventDefault();this.close();}} @keydown=${keys}>${content}</dialog>`;
  }
}
customElements.define('jk-quick-add', QuickAdd);
