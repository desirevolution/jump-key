import { html, LitElement } from 'lit';
import { THEMES, getTheme } from '../themes/themes.js';
import './icon.js';
import './icon-button.js';

const styles = {
  overlay: `fixed inset-0 z-50 flex items-end bg-slate-950/70 backdrop-blur-sm md:hidden`,
  sheet: `w-full max-h-[82vh] overflow-y-auto rounded-t-3xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 p-5 jk-shadow-elevated`,
  header: `mb-4 flex items-center justify-between`,
  title: `text-base font-semibold text-slate-50`,
  list: `space-y-2`,
  action: `flex w-full items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 text-left transition active:scale-[0.99]`,
  actionIcon: `flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20`,
  actionText: `min-w-0 grow`,
  actionTitle: `block text-sm font-semibold text-slate-100`,
  actionDesc: `block truncate text-xs text-slate-400`,
  chevron: `size-4 text-slate-500`,
  groupTitle: `mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500`,
  themeGrid: `grid grid-cols-2 gap-2`,
  themeButton: `relative rounded-2xl border p-3 text-left transition active:scale-[0.98]`,
  preview: `mb-2 flex h-12 items-center gap-2 rounded-xl border p-2`,
  previewDot: `size-5 rounded-lg`,
  previewLine: `h-2 grow rounded-full`,
  themeName: `text-xs font-semibold text-slate-100`,
  selected: `absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-indigo-500 text-white`,
};

export class JkMobileMenu extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    show: { type: Boolean },
    mode: { type: String },
    theme: { type: String },
    t: { type: Function },
  };

  constructor() {
    super();
    this.show = false;
    this.mode = 'menu';
    this.theme = 'midnight';
    this.t = (key) => key;
  }

  _emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  _renderTheme(theme) {
    const active = theme.id === this.theme;
    return html`
      <button
        class="${styles.themeButton} ${active ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-slate-700/60 bg-slate-800/40'}"
        @click=${() => this._emit('theme-change', { theme: theme.id })}
      >
        ${active ? html`<span class="${styles.selected}"><jk-icon icon="check" class="size-3"></jk-icon></span>` : ''}
        <div class="${styles.preview}" style="background:${theme.preview.background};border-color:${theme.preview.text}33">
          <span class="${styles.previewDot}" style="background:${theme.preview.accent}"></span>
          <span class="${styles.previewLine}" style="background:${theme.preview.surface}"></span>
        </div>
        <span class="${styles.themeName}">${this.t(theme.nameKey)}</span>
      </button>
    `;
  }

  render() {
    if (!this.show) return html``;
    const current = getTheme(this.theme);

    return html`
      <div class="${styles.overlay}" @click=${() => this._emit('close')}>
        <section class="${styles.sheet}" @click=${(e) => e.stopPropagation()}>
          <div class="${styles.header}">
            <div class="flex items-center gap-2">
              ${this.mode === 'themes' ? html`
                <jk-icon-button icon="arrow-left" label="${this.t('back')}" @click=${() => this._emit('back')}></jk-icon-button>
              ` : ''}
              <h3 class="${styles.title}">${this.t(this.mode === 'themes' ? 'mobileThemeTitle' : 'mobileMenuTitle')}</h3>
            </div>
            <jk-icon-button icon="x" label="${this.t('close')}" @click=${() => this._emit('close')}></jk-icon-button>
          </div>

          ${this.mode === 'menu' ? html`
            <div class="${styles.list}">
              <button class="${styles.action}" @click=${() => this._emit('open-help')}>
                <span class="${styles.actionIcon}"><jk-icon icon="circle-help" class="size-5"></jk-icon></span>
                <span class="${styles.actionText}"><span class="${styles.actionTitle}">${this.t('mobileHelpAction')}</span><span class="${styles.actionDesc}">${this.t('mobileHelpActionDesc')}</span></span>
                <jk-icon icon="chevron-right" class="${styles.chevron}"></jk-icon>
              </button>
              <button class="${styles.action}" @click=${() => this._emit('open-themes')}>
                <span class="${styles.actionIcon}"><jk-icon icon="palette" class="size-5"></jk-icon></span>
                <span class="${styles.actionText}"><span class="${styles.actionTitle}">${this.t('mobileThemeAction')}</span><span class="${styles.actionDesc}">${this.t(current.nameKey)}</span></span>
                <jk-icon icon="chevron-right" class="${styles.chevron}"></jk-icon>
              </button>
            </div>
          ` : html`
            <div class="${styles.groupTitle}">${this.t('themeGroupDark')}</div>
            <div class="${styles.themeGrid}">${THEMES.filter((x) => x.scheme === 'dark').map((x) => this._renderTheme(x))}</div>
            <div class="${styles.groupTitle}">${this.t('themeGroupLight')}</div>
            <div class="${styles.themeGrid}">${THEMES.filter((x) => x.scheme === 'light').map((x) => this._renderTheme(x))}</div>
          `}
        </section>
      </div>
    `;
  }
}

customElements.define('jk-mobile-menu', JkMobileMenu);
