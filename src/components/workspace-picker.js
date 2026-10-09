import { html, LitElement } from 'lit';
import './icon-button.js';

export class WorkspacePicker extends LitElement {
  static properties = { items: {}, active: {}, t: {}, anchor: {} };
  createRenderRoot() { return this; }
  constructor() { super(); this.position = this.position.bind(this); }
  firstUpdated() {
    this.querySelector('dialog').showModal();
    this.position();
    window.addEventListener('resize', this.position);
    window.addEventListener('scroll', this.position, true);
    this.querySelector('[aria-current="true"]')?.focus();
  }
  position() {
    const dialog = this.querySelector('dialog');
    if (!dialog) return;
    if (!matchMedia('(min-width:768px)').matches || !this.anchor) {
      dialog.style.top = ''; dialog.style.left = ''; dialog.style.maxHeight = ''; return;
    }
    const rect = this.anchor.getBoundingClientRect();
    dialog.style.maxHeight = `${Math.max(100, innerHeight - 24)}px`;
    const top = rect.bottom + 8;
    dialog.style.top = `${Math.max(12, Math.min(top, innerHeight - dialog.offsetHeight - 12))}px`;
    dialog.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - dialog.offsetWidth - 12))}px`;
  }
  disconnectedCallback() {
    window.removeEventListener('resize', this.position);
    window.removeEventListener('scroll', this.position, true);
    this.querySelector('dialog')?.close();
    super.disconnectedCallback();
    if (this.anchor?.isConnected) this.anchor.focus();
  }
  close() { this.dispatchEvent(new CustomEvent('close')); }
  handleKeys(e) {
    e.stopPropagation();
    if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (!e.repeat) this.dispatchEvent(new CustomEvent('cycle'));
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const buttons = [...this.querySelectorAll('[data-workspace]')];
    const index = buttons.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  render() {
    return html`<dialog class="jk-workspace-picker" aria-label=${this.t('workspace')} @cancel=${e=>{e.preventDefault();this.close();}} @keydown=${this.handleKeys} @click=${e=>{
      if(e.target!==e.currentTarget) return;
      const r=e.currentTarget.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) this.close();
    }}>
      <div class="jk-workspace-sheet-handle" aria-hidden="true"></div>
      <header class="jk-workspace-picker-header jk-menu-mobile-header"><strong>${this.t('workspace')}</strong><jk-icon-button icon="ui:x" .label=${this.t('close')} @click=${this.close}></jk-icon-button></header>
      <div class="jk-workspace-options">${this.items.map(w=>html`<button type="button" data-workspace class="jk-workspace-option" aria-current=${String(w.id===this.active)} @click=${()=>w.id===this.active ? this.close() : this.dispatchEvent(new CustomEvent('select',{detail:w.id}))}>
        <span class="jk-workspace-option-name">${w.name}</span>
        <span class="jk-workspace-option-check" aria-hidden="true">${w.id===this.active?'✓':''}</span>
      </button>`)}</div>
    </dialog>`;
  }
}
customElements.define('jk-workspace-picker',WorkspacePicker);
