import { html, LitElement } from 'lit';
import { buildQuickConfig, buildEditConfig, buildDeleteConfig, suggestKey } from '../utils/quick-add.js';
import { generateShortcuts } from '../utils/shortcuts.js';
import { persistConfig } from '../utils/configuration.js';
import './icon.js';

export class QuickAdd extends LitElement {
  static properties = { position: {}, confirmAction: {}, removeEmptyCategory: {}, serviceId: {}, config: {}, initial: {}, categoryKey: {}, t: {}, url: {}, name: {}, category: {}, newCategory: {}, key: {}, icon: {}, error: {}, saving: {} };
  createRenderRoot() { return this; }
  constructor() { super(); Object.assign(this, { position:'bottom', confirmAction:'', removeEmptyCategory:false, url:'', name:'', category:'', newCategory:'', key:'', icon:'', error:'', saving:false, keyEdited:false }); }
  firstUpdated() {
    this.url = this.initial?.url || '';
    this.name = this.initial?.name || '';
    const index = generateShortcuts(this.config.categories).findIndex(c => c.categoryKey === this.categoryKey);
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
        this.keyEdited = true;
      }
    }
    this.suggest();
    this.updateComplete.then(() => { this.querySelector('dialog').showModal(); this.querySelector('input').focus(); });
  }
  suggest() { if (!this.keyEdited) this.key = suggestKey(this.config, this.category, this.name.trim() || this.hostName()); }
  hostName() { try { return new URL(this.url).hostname; } catch { return ''; } }
  close() { if (!this.saving) { if (this.confirmAction) this.cancelConfirmation(); else this.dispatchEvent(new CustomEvent('close')); } }
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
    this.querySelector('input')?.focus();
  }
  async save(e) {
    e?.preventDefault();
    if (this.confirmAction || this.saving || this.validationError || !this.querySelector('form').reportValidity()) return;
    if (this.serviceId && this.sourceCategory?.services.length === 1 && this.category !== String(this.sourceIndex)) {
      this.askConfirmation('move');
      return;
    }
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
      const config = await persistConfig(next, { base: import.meta.env.BASE_URL });
      this.dispatchEvent(new CustomEvent('saved', { detail: config }));
    } catch (error) {
      this.error = this.t(error.message.startsWith('quick') ? error.message : 'editConfigSaveFailed');
    } finally { this.saving = false; }
  }
  renderConfirmation() {
    return html`<header><h2>${this.t(this.confirmAction === 'delete' ? 'deleteService' : 'confirmMoveTitle')}</h2></header>
      <p class="my-4">${this.t(this.confirmAction === 'delete' ? 'confirmDeleteService' : 'confirmMoveService', { name: this.sourceService?.name || '' })}</p>
      ${this.sourceCategory?.services.length === 1 ? html`<label class="jk-empty-category-option"><input type="checkbox" .checked=${this.removeEmptyCategory} ?disabled=${this.saving} @change=${e => this.removeEmptyCategory=e.target.checked}>${this.t('removeEmptyCategory', { category:this.sourceCategory.category })}</label>` : ''}
      ${this.error ? html`<p role="alert" class="jk-status-danger my-3">${this.error}</p>` : ''}
      <footer><button type="button" data-confirm-cancel ?disabled=${this.saving} @click=${this.cancelConfirmation}>${this.t('cancel')}</button>
      <button type="button" class=${this.confirmAction === 'delete' ? 'jk-status-danger' : 'jk-on-accent bg-indigo-600'} ?disabled=${this.saving} @click=${()=>this.persist(this.confirmAction)}>${this.t(this.saving ? 'configSaving' : this.confirmAction === 'delete' ? 'deleteService' : 'editConfigSave')}</button></footer>`;
  }
  render() {
    const field = (label, value, handler, attrs = {}) => html`<label>${label}<input .value=${value} @input=${handler} ?required=${attrs.required} type=${attrs.type || 'text'} autocomplete="off"></label>`;
    return html`<dialog class="jk-quick-dialog" @cancel=${e => {e.preventDefault(); this.close();}} @keydown=${e => {
      e.stopPropagation(); if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.save(e);
    }}>
      ${this.confirmAction ? this.renderConfirmation() : html`<form @submit=${this.save}>
        <header><h2>${this.t(this.serviceId ? 'editService' : 'quickAdd')}</h2><button type="button" aria-label=${this.t('close')} ?disabled=${this.saving} @click=${this.close}>×</button></header>
        <fieldset ?disabled=${this.saving}>
          ${field('URL', this.url, e => {this.url=e.target.value; this.suggest();}, {required:true,type:'url'})}
          ${field(this.t('quickName'), this.name, e => {this.name=e.target.value; this.suggest();})}
          <p class="text-xs text-slate-400">${this.t('quickNameHint')} ${this.hostName()}</p>
          <label>${this.t('quickCategory')}<select required .value=${this.category} @change=${e => {this.category=e.target.value;this.position=this.serviceId && this.category===String(this.sourceIndex) ? this.originalPosition : 'bottom';this.removeEmptyCategory=false;this.suggest();}}>
            <option value="" disabled>${this.t('selectCategory')}</option>
            ${this.config?.categories.map((c,i)=>html`<option value=${String(i)}>${c.category}</option>`)}
            <option value="new">${this.t('quickNewCategory')}</option>
          </select></label>
          ${this.category === 'new' ? field(this.t('quickNewCategory'), this.newCategory, e=>this.newCategory=e.target.value, {required:true}) : ''}
          <label>${this.t('servicePosition')}<select .value=${this.position} @change=${e=>this.position=e.target.value}>
            <option value="top">${this.t('positionTop')}</option>
            ${(/^\d+$/.test(this.category) ? this.config?.categories[Number(this.category)]?.services ?? [] : []).filter(s=>s.id!==this.serviceId).map(s=>html`<option value=${'after:'+s.id}>${this.t('positionAfter', { name:s.name })}</option>`)}
            <option value="bottom">${this.t('positionBottom')}</option>
          </select></label>
          ${field(this.t(this.serviceId ? 'editKey'  : 'quickKey'), this.key, e=>{this.key=e.target.value;this.keyEdited=true;})}
          <label>${this.t('quickIcon')}<div class="flex items-center gap-3"><input .value=${this.icon} @input=${e=>this.icon=e.target.value} placeholder="lucide:link" autocomplete="off"><jk-icon .icon=${this.icon.trim() || 'ui:link'} class="size-6 shrink-0"></jk-icon></div></label>
        </fieldset>
        ${this.error || (this.url && this.validationError) ? html`<p role="status" class="jk-status-danger">${this.error || this.t(this.validationError)}</p>` : ''}
        ${this.serviceId ? html`<button type="button" class="jk-delete-service" ?disabled=${this.saving} @click=${()=>this.askConfirmation('delete')}><jk-icon icon="ui:trash-2" class="size-4" aria-hidden="true"></jk-icon>${this.t('deleteService')}</button>` : ''}
        <footer><button type="button" ?disabled=${this.saving} @click=${this.close}>${this.t('cancel')}</button><button class="jk-on-accent bg-indigo-600" ?disabled=${this.saving || Boolean(this.validationError)} type="submit">${this.t(this.saving?'configSaving':'editConfigSave')}</button></footer>
      </form>`}
    </dialog>`;
  }
}
customElements.define('jk-quick-add', QuickAdd);
