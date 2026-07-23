import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';

const styles = {
  overlay: `fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-md md:items-center md:p-4`,
  modal: `w-full rounded-t-3xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 p-5 font-mono jk-shadow-elevated md:max-w-2xl md:rounded-2xl`,
  header: `mb-5 flex items-center justify-between`,
  headerLeft: `flex items-center gap-3`,
  iconBadge: `flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`,
  icon: `size-5 text-indigo-300`,
  title: `text-base font-semibold text-slate-50`,
  content: `max-h-[68vh] space-y-5 overflow-y-auto pr-1`,
  sectionTitle: `mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500`,
  row: `flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-800/60`,
  rowDesc: `text-sm text-slate-300`,
  keysContainer: `flex shrink-0 items-center gap-1`,
  contextBadge: `mr-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300`,
  kbd: `inline-flex h-7 min-w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs font-bold text-indigo-300 jk-shadow-inset`,
  actionBadge: `inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs font-semibold text-indigo-200`,
  actionIcon: `size-3.5`,
  footer: `mt-5 text-center text-[11px] text-slate-500`,
};

export class JkHelpModal extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    show: { type: Boolean },
    isGridView: { type: Boolean },
    t: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.isGridView = false;
    this.t = (key) => key;
  }

  _handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  _renderKeyboardRows() {
    const shortcuts = [
      { keys: ['Space'], desc: this.t('hkSearch') },
      { keys: [':'], desc: this.t('hkSearchEngines') },
      { keys: ['?'], desc: this.t('helpOpen') },
      { keys: ['Ctrl', ','], desc: this.t('editConfig') },
      { keys: ['Ctrl', '1/2/3'], desc: this.t('hkSwitchTabs') },
      { keys: ['#'], desc: this.t('hkToggleView') },
    ];

    if (!this.isGridView) shortcuts.push({ keys: ['0-9'], desc: this.t('hkFavs') });

    shortcuts.push(
      { keys: ['A-Z'], desc: this.t('hkCat') },
      { keys: ['A-Z'], desc: this.t('hkService'), context: true },
      { keys: ['↑', '↓'], desc: this.t('hkNavigate') },
      { keys: ['Enter'], desc: this.t('hkOpenSelection') },
      { keys: ['ESC'], desc: this.t('hkReset') }
    );

    return shortcuts.map((item) => html`
      <div class="${styles.row}">
        <span class="${styles.rowDesc}">${item.desc}</span>
        <div class="${styles.keysContainer}">
          ${item.context ? html`<span class="${styles.contextBadge}">${this.t('contextInCat')}</span>` : ''}
          ${item.keys.map((key) => html`<kbd class="${styles.kbd}">${key}</kbd>`)}
        </div>
      </div>
    `);
  }

  _renderActionRow(icon, label, desc) {
    return html`
      <div class="${styles.row}">
        <span class="${styles.rowDesc}">${desc}</span>
        <span class="${styles.actionBadge}"><jk-icon icon="${icon}" class="${styles.actionIcon}"></jk-icon>${label}</span>
      </div>
    `;
  }

  render() {
    if (!this.show) return html``;

    return html`
      <div @click=${this._handleClose} class="${styles.overlay}">
        <div @click=${(e) => e.stopPropagation()} class="${styles.modal}" role="dialog" aria-modal="true">
          <div class="${styles.header}">
            <div class="${styles.headerLeft}">
              <div class="${styles.iconBadge}"><jk-icon icon="circle-help" class="${styles.icon}"></jk-icon></div>
              <h3 class="${styles.title}">
                <span class="hidden md:inline">${this.t('helpTitleDesktop')}</span>
                <span class="md:hidden">${this.t('helpTitleMobile')}</span>
              </h3>
            </div>
            <jk-icon-button icon="x" label="${this.t('close')}" @click=${this._handleClose}></jk-icon-button>
          </div>

          <div class="${styles.content}">
            <div class="hidden md:block">
              <div class="${styles.sectionTitle}">${this.t('helpKeyboardSection')}</div>
              ${this._renderKeyboardRows()}
            </div>

            <div>
              <div class="${styles.sectionTitle}">
                <span class="hidden md:inline">${this.t('helpMouseTouchSection')}</span>
                <span class="md:hidden">${this.t('helpTouchSection')}</span>
              </div>
              ${this._renderActionRow('mouse-pointer-click', this.t('helpClick'), this.t('helpClickAction'))}
              <div class="hidden md:block">
                ${this._renderActionRow('hand', this.t('helpLongPress'), this.t('helpLongPressFavorite'))}
                ${this._renderActionRow('hand', this.t('helpLongPress'), this.t('helpLongPressRemoveFavorite'))}
              </div>
              <div class="md:hidden">
                ${this._renderActionRow('hand', this.t('helpHold'), this.t('helpTouchAddFavorite'))}
                ${this._renderActionRow('hand', this.t('helpHold'), this.t('helpTouchRemoveFavorite'))}
                ${this._renderActionRow('search', this.t('helpSearchButton'), this.t('helpTouchSearch'))}
                ${this._renderActionRow('layout-grid', this.t('helpViewButton'), this.t('helpTouchView'))}
                ${this._renderActionRow('ellipsis', this.t('helpMoreButton'), this.t('helpTouchMore'))}
              </div>
            </div>
          </div>

          <div class="${styles.footer}">
            <span class="hidden md:inline">${this.t('helpExitDesktop')}</span>
            <span class="md:hidden">${this.t('helpExitMobile')}</span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('jk-help-modal', JkHelpModal);
