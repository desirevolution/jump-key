import { html, LitElement } from 'lit';
export class WorkspacePicker extends LitElement {
 static properties={items:{},active:{},t:{},anchor:{}};
 createRenderRoot(){return this;}
 firstUpdated(){
  const dialog=this.querySelector('dialog'); dialog.showModal();
  if(matchMedia('(min-width:768px)').matches && this.anchor){const r=this.anchor.getBoundingClientRect();dialog.style.top=`${r.bottom+6}px`;dialog.style.left=`${Math.max(8,Math.min(r.left,innerWidth-dialog.offsetWidth-8))}px`;}
  this.querySelector('[aria-current="true"]')?.focus();
 }
 disconnectedCallback(){this.querySelector('dialog')?.close();super.disconnectedCallback();if(this.anchor?.isConnected)this.anchor.focus();}
 close(){this.dispatchEvent(new CustomEvent('close'));}
 render(){return html`<dialog class="jk-workspace-picker" aria-label=${this.t('workspace')} @cancel=${e=>{e.preventDefault();this.close();}} @click=${e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.close();}}} @keydown=${e=>{
 e.stopPropagation();if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...this.querySelectorAll('[data-workspace]')];const i=buttons.indexOf(document.activeElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
 }}><header class="flex items-center justify-between p-2"><strong>${this.t('workspace')}</strong><jk-icon-button icon="ui:x" .label=${this.t('close')} @click=${this.close}></jk-icon-button></header>${this.items.map(w=>html`<button data-workspace class="block w-full rounded-lg p-3 text-left hover:bg-slate-700 focus-visible:outline-2" aria-current=${String(w.id===this.active)} @click=${()=>this.dispatchEvent(new CustomEvent('select',{detail:w.id}))}>${w.id===this.active?'✓ ':''}${w.name}</button>`)}</dialog>`;}
}
customElements.define('jk-workspace-picker',WorkspacePicker);
