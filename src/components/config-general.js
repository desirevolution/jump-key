import { html, LitElement } from 'lit';
import { createBookmarklet } from '../utils/bookmarklet.js';
import { DEFAULT_TIMINGS, normalizeTimings } from '../utils/preferences.js';
export class ConfigGeneral extends LitElement {
  static properties = { readOnly: {}, separateWorkspacePreferences: {}, preferences: {}, t: {} };
  createRenderRoot() { return this; }
  change(key, value) {
    this.dispatchEvent(new CustomEvent('preferences-change', { detail: normalizeTimings({ ...this.preferences, [key]: value }), bubbles: true, composed: true }));
  }
  render() {
    return html`<div class="space-y-6 text-slate-200">
      <section class="rounded-2xl border border-slate-700/60 p-5 space-y-3">
        <label class="flex items-center gap-3"><input type="checkbox" .checked=${Boolean(this.separateWorkspacePreferences)} @change=${e=>this.dispatchEvent(new CustomEvent('workspace-preferences-mode',{detail:e.target.checked,bubbles:true,composed:true}))}>${this.t('separateWorkspacePreferences')}</label>
        <p class="text-sm text-slate-400">${this.t(this.separateWorkspacePreferences ? 'workspacePreferencesOn' : 'workspacePreferencesOff')}</p>
      </section>
      <p class="text-sm text-slate-400">${this.t('localTimingHint')}</p>
      ${[['categoryTimeout',30,1], ['launchDelay',5,0.1]].map(([key,max,step]) => html`
        <section class="rounded-2xl border border-slate-700/60 p-5 space-y-3">
          <label class="flex items-center gap-3"><input type="checkbox" .checked=${this.preferences[key] > 0} @change=${e => this.change(key,e.target.checked ? DEFAULT_TIMINGS[key] : 0)}>${this.t(key)}</label>
          <label class="flex items-center gap-3">${this.t('timingSeconds')}
            <input class="w-24 rounded-lg border border-slate-600 bg-slate-900 p-2" type="number" min="0" max=${max} step=${step} .value=${String(this.preferences[key])} ?disabled=${this.preferences[key] === 0}
              @change=${e => { if (e.target.value !== '' && e.target.validity.valid) this.change(key, e.target.valueAsNumber); else e.target.value = String(this.preferences[key]); }}>
            <span class="text-xs text-slate-400">0–${max}</span>
          </label>
        </section>`)}
        ${!this.readOnly ? html`<section class="hidden md:block rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
          <h3 class="text-sm font-bold">${this.t('bookmarkletTitle')}</h3>
          <p class="mt-2 text-sm text-slate-400">${this.t('bookmarkletHelp')}</p>
          <a
            href=${createBookmarklet(import.meta.env.BASE_URL, window.location.href)}
            draggable="true"
            @click=${e => e.preventDefault()}
            class="mt-4 inline-flex cursor-grab rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-300"
          >${this.t('bookmarkletLabel')}</a>
        </section>` : ''}
      <section class="rounded-2xl border border-slate-700/60 p-5 space-y-3">
        <h3 class="text-sm font-bold">${this.t('resetLocalTitle')}</h3>
        <p class="text-sm text-slate-400">${this.t('resetLocalHelp')}</p>
        <button type="button" class="jk-btn jk-btn-danger" @click=${()=>this.dispatchEvent(new CustomEvent('reset-local-data',{bubbles:true,composed:true}))}>${this.t('resetLocalTitle')}</button>
      </section>
</div>`;
  }
}
customElements.define('jk-config-general', ConfigGeneral);
