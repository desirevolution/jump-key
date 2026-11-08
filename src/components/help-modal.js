import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';

const styles = {
  overlay: `fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-md md:items-center md:p-4`,
  modal: `flex min-h-0 max-h-[calc(100dvh-2rem)] flex-col w-full rounded-t-3xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 p-5 font-mono jk-shadow-elevated md:max-w-2xl md:rounded-2xl`,
  header: `shrink-0 mb-5 flex items-center justify-between`,
  headerLeft: `flex items-center gap-3`,
  iconBadge: `flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`,
  icon: `size-5 text-indigo-300`,
  title: `text-base font-semibold text-slate-50`,
  content: `min-h-0 space-y-5 overflow-y-auto overscroll-contain pr-1`,
  sectionTitle: `mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500`,
  row: `flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-800/60`,
  rowDesc: `text-sm text-slate-300`,
  keysContainer: `flex shrink-0 items-center gap-1`,
  contextBadge: `mr-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300`,
  kbd: `inline-flex h-7 min-w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs font-bold text-indigo-300 jk-shadow-inset`,
  actionBadge: `inline-flex shrink-0 max-w-[45%] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs font-semibold text-indigo-200`,
  actionIcon: `size-3.5`,
  footer: `shrink-0 mt-5 text-center text-[11px] text-slate-500`,
};

export class JkHelpModal extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    readOnly: { type: Boolean },
    show: { type: Boolean },
    isGridView: { type: Boolean },
    t: { type: Function },
    mode: { type: String },
  };

  constructor() {
    super();
    this.show = false;
    this.isGridView = false;
    this.t = (key) => key;
    this.mode = 'keyboard';
  }

  _handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  willUpdate(changed) {
    if (changed.has('show') && this.show) {
      this.mode = window.matchMedia('(max-width:767px)').matches ? 'touch' : 'keyboard';
    } else if (changed.has('show') && !this.show) {
      this.querySelector('dialog')?.close();
    }
  }

  updated(changed) {
    if (changed.has('show') && this.show) {
      const dialog = this.querySelector('dialog');
      if (!dialog?.open) dialog?.showModal();
      this.querySelector('jk-icon-button button')?.focus({ preventScroll: true });
    }
  }

  _renderKeyboardRows() {
    const groups = [
      { title: 'helpGroupSearch', rows: [
        { keys: ['Space'], desc: 'hkSearch' },
        { keys: [':'], desc: 'hkSearchEngines' },
      ] },
      { title: 'helpGroupNavigation', rows: [
        { keys: ['Backspace'], desc: 'hkWorkspace' },
        { keys: ['A–Z'], desc: 'hkCat' },
        { keys: ['A–Z'], desc: 'hkService', context: true },
        { keys: ['↑', '↓'], desc: 'hkNavigate' },
        { keys: ['Enter'], desc: 'hkOpenSelection' },
        { keys: ['Shift', 'Enter'], desc: 'hkOpenSelectionSameTab' },
        { keys: ['ESC'], desc: 'hkReset' },
        { keys: ['#'], desc: 'hkToggleView' },
      ] },
      { title: 'helpGroupFavorites', rows: [
        { keys: ['0–9'], desc: 'hkFavs' },
        { keys: ['Ctrl', '0–9'], desc: 'hkFavoriteRecord' },
        { keys: ['Shift', '0–9'], desc: 'hkContinue' },
        { keys: ['-'], desc: 'hkToggleLast' },
        { keys: ['_'], desc: 'hkOpenContinue' },
      ] },
      { title: 'helpGroupEditing', rows: [
        { keys: ['?'], desc: 'helpOpen' },
        { keys: ['Ctrl', ','], desc: this.readOnly ? 'localSettings' : 'editConfig' },
        { keys: ['+'], write: true, desc: 'quickAdd' },
        { keys: ['Ctrl+E', 'A–Z', 'A–Z'], write: true, desc: 'hkEditService' },
        { keys: ['Ctrl/Cmd', 'Enter'], write: true, desc: 'helpQuickSave' },
        { keys: [this.readOnly ? 'Ctrl/Cmd + 1/2' : 'Ctrl/Cmd + 1/2/3/4'], desc: this.readOnly ? 'hkLocalTabs' : 'hkSwitchTabs' },
        { keys: ['Ctrl/Cmd', 'S'], write: true, desc: 'helpEditorSave' },
        { keys: ['Page Up/Down'], write: true, desc: 'helpEditorPage' },
      ] },
    ];
    return groups.map(group => html`<section class="mb-4">
      <h4 class="${styles.sectionTitle}">${this.t(group.title)}</h4>
      ${group.rows.filter(item => !this.readOnly || !item.write).map(item => html`
        <div class="${styles.row}">
          <span class="${styles.rowDesc}">${this.t(item.desc)}</span>
          <div class="${styles.keysContainer}">
            ${item.context ? html`<span class="${styles.contextBadge}">${this.t('contextInCat')}</span>` : ''}
            ${item.keys.map(key => html`<kbd class="${styles.kbd}">${key}</kbd>`)}
          </div>
        </div>`)}</section>`);
  }

  _renderActionRow(icon, label, desc) {
    return html`
      <div class="${styles.row}">
        <span class="${styles.rowDesc}">${desc}</span>
        <span class="${styles.actionBadge}"
          ><jk-icon icon="ui:${icon}" class="${styles.actionIcon}"></jk-icon>${label}</span
        >
      </div>
    `;
  }

  render() {
    if (!this.show) return html``;

    return html`
      <dialog class="jk-help-dialog" aria-label=${this.t('helpTitleDesktop')}
        @click=${e => { if (e.target === e.currentTarget) this._handleClose(); }} @cancel=${e => { e.preventDefault(); this._handleClose(); }}>
        <div
          @click=${(e) => e.stopPropagation()}
          class="${styles.modal}"
        >
          <div class="${styles.header}">
            <div class="${styles.headerLeft}">
              <div class="${styles.iconBadge}">
                <jk-icon icon="ui:circle-help" class="${styles.icon}"></jk-icon>
              </div>
              <h3 class="${styles.title}">
                <span class="hidden md:inline">${this.t('helpTitleDesktop')}</span>
                <span class="md:hidden">${this.t('helpTitleMobile')}</span>
              </h3>
            </div>
            <jk-icon-button
              icon="ui:x"
              label="${this.t('close')}"
              @click=${this._handleClose}
            ></jk-icon-button>
          </div>

          <div class="flex gap-2 mb-3" role="group" aria-label=${this.t('helpTitleDesktop')}>
            <button type="button" class="jk-btn ${this.mode === 'keyboard' ? 'jk-btn-primary' : 'jk-btn-secondary'}" aria-pressed=${String(this.mode === 'keyboard')} @click=${()=>this.mode='keyboard'}>${this.t('helpKeyboardMode')}</button>
            <button type="button" class="jk-btn ${this.mode === 'touch' ? 'jk-btn-primary' : 'jk-btn-secondary'}" aria-pressed=${String(this.mode === 'touch')} @click=${()=>this.mode='touch'}>${this.t('helpTouchMode')}</button>
          </div>
          <div class="${styles.content}">
            <div ?hidden=${this.mode !== 'keyboard'}>
              <div class="${styles.sectionTitle}">${this.t('helpKeyboardSection')}</div>
              ${this._renderKeyboardRows()}
            </div>

            <div ?hidden=${this.mode !== 'touch'}>
              <div class="${styles.sectionTitle}">${this.t('helpMouseTouchSection')}</div>
              ${this._renderActionRow('mouse-pointer-click', this.t('helpClick'), this.t('helpClickAction'))}
              <div>
                ${this._renderActionRow('mouse-pointer-click', this.t('helpShiftClick'), this.t('helpShiftClickAction'))}
                ${this._renderActionRow('hand', this.t('helpLongPress'), this.t('helpLongPressFavorite'))}
                ${this._renderActionRow('hand', this.t('helpLongPress'), this.t('helpLongPressRemoveFavorite'))}
              </div>
              <div>
                ${this._renderActionRow('hand', this.t('helpHold'), this.t('helpTouchAddFavorite'))}
                ${this._renderActionRow('hand', this.t('helpHold'), this.t('helpTouchRemoveFavorite'))}
                ${this._renderActionRow('search', this.t('helpSearchButton'), this.t('helpTouchSearch'))}
                ${this._renderActionRow('layout-grid', this.t('helpViewButton'), this.t('helpTouchView'))}
                ${this._renderActionRow('ellipsis', this.t('helpMoreButton'), this.t(this.readOnly ? 'helpReadOnlyMore' : 'helpTouchMore'))}
              </div>
              <p class="px-3 pt-3 text-sm leading-relaxed text-slate-300">${this.t('helpRecentRemove')}</p>
            </div>
            <details class="space-y-3 px-3 text-sm leading-relaxed text-slate-300">
              <summary class="cursor-pointer rounded-lg py-2 font-semibold focus-visible:outline-2">${this.t('helpLinksSection')}</summary>
              <p>${this.t(this.readOnly ? 'helpReadOnlyActions' : 'helpServiceActions')}</p>
              <p><strong>${this.t('tabGeneral')} → ${this.t('resetLocalTitle')}:</strong> ${this.t('resetLocalHelp')}</p>
              <p>${this.t('helpDesktopActions')}</p>
              <p>${this.t('helpMobileLayout')}</p>
              ${!this.readOnly ? html`<p>${this.t('helpEditService')}</p>` : ''}
              ${!this.readOnly ? html`<p>${this.t('helpManageWorkspaces')}</p><p>${this.t('helpReorderCategories')}</p>` : ''}
              <p>${this.t('helpCollapseCategories')}</p>
              ${!this.readOnly ? html`<p>${this.t('helpPositionDelete')}</p>` : ''}
              ${!this.readOnly ? html`<p>${this.t('helpFormValidation')}</p>` : ''}<p>${this.t('localTimingHint')}</p>
              ${!this.readOnly ? html`<p class="hidden md:block">${this.t('helpAddLink')}</p>` : ''}
              ${!this.readOnly ? html`<p class="hidden md:block">${this.t('helpBookmarklet')}</p>` : ''}
              <div class="space-y-3 md:hidden">
                ${!this.readOnly ? html`<p>${this.t('helpMobileAdd')}</p>` : ''}
                <p>${this.t('helpInstall')}</p>
                ${!this.readOnly ? html`<p>${this.t('helpShare')}</p>` : ''}
              </div>
            </details>
          </div>

          <div class="${styles.footer}">
            <span class="hidden md:inline">${this.t('helpExitDesktop')}</span>
            <span class="md:hidden">${this.t('helpExitMobile')}</span>
          </div>
        </div>
      </dialog>
    `;
  }
}

customElements.define('jk-help-modal', JkHelpModal);
