import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';

export class ServiceActions extends LitElement {
  static properties = { readOnly: {}, anchor: {}, service: {}, favorite: {}, t: {} };
  createRenderRoot() { return this; }
  firstUpdated() {
    this.querySelector('dialog').showModal();
    this._position = () => this.position();
    this.position();
    window.addEventListener('resize', this._position);
    window.addEventListener('scroll', this._position, true);
  }
  disconnectedCallback() {
    window.removeEventListener('resize', this._position);
    window.removeEventListener('scroll', this._position, true);
    super.disconnectedCallback();
  }
  position() {
    const dialog = this.querySelector('dialog');
    if (!dialog) return;
    if (window.innerWidth < 768) {
      dialog.style.removeProperty('left');
      dialog.style.removeProperty('top');
      return;
    }
    const rect = this.anchor?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8, margin = 12;
    const left = Math.max(margin, Math.min(rect.right - dialog.offsetWidth, window.innerWidth - dialog.offsetWidth - margin));
    const below = rect.bottom + gap;
    const top = below + dialog.offsetHeight <= window.innerHeight - margin
      ? below : Math.max(margin, rect.top - dialog.offsetHeight - gap);
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  }
  emit(action) { this.dispatchEvent(new CustomEvent('action', { detail: action })); }
  render() {
    return html`<dialog class="jk-quick-dialog jk-service-actions" aria-label=${this.t('serviceActions') + ': ' + this.service.name}
      @keydown=${e => e.stopPropagation()}
      @cancel=${e => {e.preventDefault(); this.emit('close');}}
      @click=${e => {if (e.target === e.currentTarget) {const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.emit('close');}}}>
      <header class="jk-menu-mobile-header"><h2 id="service-actions-title">${this.service.name}</h2><jk-icon-button icon="ui:x" .label=${this.t('close')} @click=${()=>this.emit('close')}></jk-icon-button></header>
      ${[['edit','pencil','editService'],['favorite','star',this.favorite?'removeFavorite':'addFavorite'],['copy','link','copyUrl']].filter(([action])=>!this.readOnly || action!=='edit').map(([action,icon,label])=>html`
        <button type="button" class="jk-service-action" @click=${()=>this.emit(action)}><jk-icon .icon=${'ui:'+icon} class="size-5"></jk-icon>${this.t(label)}</button>`)}
    </dialog>`;
  }
}
customElements.define('jk-service-actions', ServiceActions);
