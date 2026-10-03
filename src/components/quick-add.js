import { html, LitElement } from 'lit';
import { buildQuickConfig, suggestKey } from '../utils/quick-add.js';
import { generateShortcuts } from '../utils/shortcuts.js';
import { persistConfig } from '../utils/configuration.js';
import './icon.js';

export class QuickAdd extends LitElement {
  static properties = { config: {}, initial: {}, categoryKey: {}, t: {}, url: {}, name: {}, category: {}, newCategory: {}, key: {}, icon: {}, error: {}, saving: {} };
  createRenderRoot() { return this; }
  constructor() { super(); Object.assign(this, { url:'', name:'', category:'', newCategory:'', key:'', icon:'', error:'', saving:false, keyEdited:false }); }
  firstUpdated() {
    this.url = this.initial?.url || '';
    this.name = this.initial?.name || '';
    const index = generateShortcuts(this.config.categories).findIndex(c => c.categoryKey === this.categoryKey);
    this.category = index >= 0 && !this.initial?.url ? String(index) : '';
    this.suggest();
    this.updateComplete.then(() => { this.querySelector('dialog').showModal(); this.querySelector('input').focus(); });
  }
  suggest() { if (!this.keyEdited) this.key = suggestKey(this.config, this.category, this.name.trim() || this.hostName()); }
  hostName() { try { return new URL(this.url).hostname; } catch { return ''; } }
  close() { if (!this.saving) this.dispatchEvent(new CustomEvent('close')); }
  get validationError() {
    if (!this.config) return 'quickCategoryRequired';
    try { buildQuickConfig(this.config, this); return ''; }
    catch (error) { return error.message.startsWith('quick') ? error.message : 'quickInvalidUrl'; }
  }
  async save(e) {
    e?.preventDefault();
    if (this.saving || this.validationError || !this.querySelector('form').reportValidity()) return;
    this.error = '';
    try {
      const next = buildQuickConfig(this.config, this);
      this.saving = true;
      const config = await persistConfig(next, { base: import.meta.env.BASE_URL });
      this.dispatchEvent(new CustomEvent('saved', { detail: config }));
    } catch (error) {
      this.error = this.t(error.message.startsWith('quick') ? error.message : 'editConfigSaveFailed');
    } finally { this.saving = false; }
  }
  render() {
    const field = (label, value, handler, attrs = {}) => html`<label>${label}<input .value=${value} @input=${handler} ?required=${attrs.required} type=${attrs.type || 'text'} autocomplete="off"></label>`;
    return html`<dialog class="jk-quick-dialog" @cancel=${e => {e.preventDefault(); this.close();}} @keydown=${e => {
      e.stopPropagation(); if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.save(e);
    }}>
      <form @submit=${this.save}>
        <header><h2>${this.t('quickAdd')}</h2><button type="button" aria-label=${this.t('close')} ?disabled=${this.saving} @click=${this.close}>×</button></header>
        <fieldset ?disabled=${this.saving}>
          ${field('URL', this.url, e => {this.url=e.target.value; this.suggest();}, {required:true,type:'url'})}
          ${field(this.t('quickName'), this.name, e => {this.name=e.target.value; this.suggest();})}
          <p class="text-xs text-slate-400">${this.t('quickNameHint')} ${this.hostName()}</p>
          <label>${this.t('quickCategory')}<select required .value=${this.category} @change=${e => {this.category=e.target.value;this.suggest();}}>
            <option value="" disabled>${this.t('selectCategory')}</option>
            ${this.config?.categories.map((c,i)=>html`<option value=${String(i)}>${c.category}</option>`)}
            <option value="new">${this.t('quickNewCategory')}</option>
          </select></label>
          ${this.category === 'new' ? field(this.t('quickNewCategory'), this.newCategory, e=>this.newCategory=e.target.value, {required:true}) : ''}
          ${field(this.t('quickKey'), this.key, e=>{this.key=e.target.value;this.keyEdited=true;})}
          <label>${this.t('quickIcon')}<div class="flex items-center gap-3"><input .value=${this.icon} @input=${e=>this.icon=e.target.value} placeholder="lucide:link" autocomplete="off"><jk-icon .icon=${this.icon.trim() || 'ui:link'} class="size-6 shrink-0"></jk-icon></div></label>
        </fieldset>
        ${this.error || (this.url && this.validationError) ? html`<p role="status" class="jk-status-danger">${this.error || this.t(this.validationError)}</p>` : ''}
        <footer><button type="button" ?disabled=${this.saving} @click=${this.close}>${this.t('cancel')}</button><button class="jk-on-accent bg-indigo-600" ?disabled=${this.saving || Boolean(this.validationError)} type="submit">${this.t(this.saving?'configSaving':'editConfigSave')}</button></footer>
      </form>
    </dialog>`;
  }
}
customElements.define('jk-quick-add', QuickAdd);
