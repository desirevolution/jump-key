import { LitElement, html } from 'lit';
import './icon.js';

let nextPickerId = 0;

/** A single icon field; preserve every existing icon value and the card renderer. */
export class JkIconPicker extends LitElement {
  static properties = { value: {} };
  createRenderRoot() { return this; }
  constructor() { super(); this.value = ''; this._pickerId = ++nextPickerId; }
  _change(value) { this.dispatchEvent(new CustomEvent('change-icon', { detail: value })); }
  render() { return html`<div class="jk-icon-picker">
    <label for=${`jk-icon-input-${this._pickerId}`}>Icon</label>
    <div class="jk-icon-input-row">
      <div class="jk-icon-preview-small" role="img" aria-label="Icon-Vorschau">
        <jk-icon .icon=${this.value || 'ui:link'} class="size-6"></jk-icon>
      </div>
      <input id=${`jk-icon-input-${this._pickerId}`} name="icon" type="text" autocomplete="off"
        aria-describedby=${`jk-icon-help-${this._pickerId}`} placeholder="house, lucide:server, iconify:mdi:home oder https://…"
        .value=${this.value||''} @input=${e=>this._change(e.target.value)} />
      <button type="button" class="jk-manager-edit jk-icon-clear" title="Icon zurücksetzen" aria-label="Icon zurücksetzen"
        ?disabled=${!this.value} @click=${()=>this._change('')}><jk-icon icon="ui:x" class="size-4"></jk-icon></button>
    </div>
    <p id=${`jk-icon-help-${this._pickerId}`} class="jk-manager-hint">Icon-Name (Lucide oder Iconify) oder Bild-URL. Vollständige Kataloge:
      <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer">Lucide</a> ·
      <a href="https://icon-sets.iconify.design/" target="_blank" rel="noopener noreferrer">Iconify</a>
    </p>
  </div>`; }
}
customElements.define('jk-icon-picker', JkIconPicker);
