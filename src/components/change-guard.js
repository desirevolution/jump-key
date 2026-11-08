import { LitElement, html } from 'lit';

/** One shared, explicit three-way confirmation for navigation with unsaved work. */
export class JkChangeGuard extends LitElement {
  createRenderRoot() { return this; }
  static properties = { destination: {}, subject: {}, busy: { type: Boolean }, saveDisabled: { type: Boolean } };
  constructor() { super(); this.destination = 'fortfahren'; this.subject = 'Änderungen'; this.busy = false; this.saveDisabled = false; }
  firstUpdated() {
    this._previousFocus=document.activeElement;
    this.querySelector('[data-stay]')?.focus();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if(this._previousFocus?.isConnected)this._previousFocus.focus({preventScroll:true});
  }
  _emit(type) { if (!this.busy) this.dispatchEvent(new CustomEvent(`guard-${type}`, { bubbles: true, composed: true })); }
  _key(e) {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); this._emit('stay'); }
    if (e.key !== 'Tab') return;
    const buttons = [...this.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    if (e.shiftKey && index <= 0) { e.preventDefault(); buttons.at(-1)?.focus(); }
    else if (!e.shiftKey && index === buttons.length - 1) { e.preventDefault(); buttons[0]?.focus(); }
  }
  render() { return html`<div class="jk-change-guard-backdrop" @keydown=${this._key}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="jk-guard-title" aria-describedby="jk-guard-message" class="jk-change-guard">
      <h2 id="jk-guard-title">Ungespeicherte Änderungen</h2>
      <p id="jk-guard-message">${this.subject} sind noch nicht gespeichert. Möchtest du sie speichern, bevor du ${this.destination}?</p>
      <div class="jk-change-guard-actions">
        <button type="button" data-stay class="jk-btn jk-btn-secondary" ?disabled=${this.busy} @click=${()=>this._emit('stay')}>Weiter bearbeiten</button>
        <button type="button" class="jk-btn jk-btn-secondary" ?disabled=${this.busy} @click=${()=>this._emit('discard')}>Verwerfen & fortfahren</button>
        <button type="button" class="jk-btn jk-btn-primary" ?disabled=${this.busy||this.saveDisabled} @click=${()=>this._emit('save')}>${this.busy?'Speichern …':'Speichern & fortfahren'}</button>
      </div>
    </section>
  </div>`; }
}
customElements.define('jk-change-guard', JkChangeGuard);
