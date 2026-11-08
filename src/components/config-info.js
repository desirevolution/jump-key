import { html, LitElement } from 'lit';

/** Version, update controls and offline cache status, separated from user preferences. */
export class ConfigInfo extends LitElement {
  static properties = { appVersion: {}, pwaState: {}, offlineMode: {}, offlineCacheStatus: {}, t: {} };
  createRenderRoot() { return this; }
  render() {
    const update = this.pwaState || {};
    const cache = this.offlineCacheStatus || {};
    const status = update.available ? 'pwaUpdateAvailable' : update.checking ? 'pwaUpdateChecking' :
      update.status === 'current' ? 'pwaUpToDate' : update.status === 'offline' ? 'pwaUpdateOffline' :
      update.status === 'unsupported' ? 'pwaUpdateUnsupported' : update.status === 'error' ? 'pwaUpdateError' : null;
    return html`<div class="space-y-6 text-slate-200">
      <section class="rounded-2xl border border-slate-700/60 p-5 space-y-3 jk-update-settings">
        <h3 class="text-sm font-bold">${this.t('pwaUpdateTitle')}</h3>
        <p class="text-sm text-slate-400">${this.t('pwaVersion')}: <strong>${this.appVersion || '–'}</strong></p>
        ${status ? html`<p class="text-sm" role="status">${this.t(status)}</p>` : ''}
        <div class="flex flex-wrap gap-2">
          <button type="button" class="jk-btn jk-btn-secondary" ?disabled=${update.checking} @click=${()=>this.dispatchEvent(new CustomEvent('pwa-check',{bubbles:true,composed:true}))}>
            ${update.checking ? this.t('pwaUpdateChecking') : this.t('pwaCheckNow')}
          </button>
          ${update.available ? html`<button type="button" class="jk-btn jk-btn-primary" @click=${()=>this.dispatchEvent(new CustomEvent('pwa-apply',{bubbles:true,composed:true}))}>${this.t('pwaUpdateNow')}</button>` : ''}
        </div>
        <p class="text-xs text-slate-400">${this.t('pwaOfflineCache')}: ${cache.available ?? 0}/${cache.total ?? '–'} ${this.t('pwaWorkspaces')}</p>
        ${this.offlineMode ? html`<p class="text-xs" role="status">${this.t('pwaOfflineBanner')}</p>` : ''}
        <p class="text-xs text-slate-400">${this.t('pwaOfflinePrivacy')}</p>
      </section>
</div>`;
  }
}
customElements.define('jk-config-info', ConfigInfo);
