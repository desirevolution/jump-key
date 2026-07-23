import { html, LitElement } from 'lit';
import { THEMES } from '../themes/themes.js';
import './icon.js';

const styles = {
  wrapper: 'space-y-7',
  heading: 'space-y-1',
  title: 'text-lg font-semibold text-slate-50',
  description: 'text-sm text-slate-400',
  group: 'space-y-3',
  groupTitle: 'text-xs font-bold uppercase tracking-[0.16em] text-slate-400',
  grid: 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
  card: 'group rounded-2xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
  cardActive: 'border-indigo-400/70 bg-indigo-500/10 shadow-lg shadow-indigo-950/20',
  cardInactive: 'border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800',
  preview: 'relative h-28 overflow-hidden rounded-xl border p-3',
  previewSurface: 'h-full rounded-lg border p-3 shadow-lg',
  previewAccent: 'h-3 w-16 rounded-full',
  previewLine: 'mt-3 h-2 w-4/5 rounded-full',
  previewLineShort: 'mt-2 h-2 w-1/2 rounded-full',
  previewFavorite: 'absolute right-3 top-3 size-3 rounded-full',
  details: 'mt-3 flex items-start justify-between gap-3 px-1',
  name: 'font-medium text-slate-50',
  desc: 'mt-0.5 text-xs leading-relaxed text-slate-400',
  check: 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 jk-on-accent',
};

export class JkConfigAppearance extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    selectedTheme: { type: String },
    t: { type: Function },
  };

  constructor() {
    super();
    this.selectedTheme = 'midnight';
    this.t = (key) => key;
  }

  _selectTheme(theme) {
    if (theme.id === this.selectedTheme) return;
    this.dispatchEvent(
      new CustomEvent('theme-change', {
        detail: { theme: theme.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  _renderTheme(theme) {
    const active = theme.id === this.selectedTheme;
    const previewBorder = `color-mix(in srgb, ${theme.preview.text} 18%, transparent)`;
    const previewLine = `color-mix(in srgb, ${theme.preview.text} 30%, transparent)`;
    const previewLineShort = `color-mix(in srgb, ${theme.preview.text} 16%, transparent)`;

    return html`
      <button
        type="button"
        role="radio"
        class="${styles.card} ${active ? styles.cardActive : styles.cardInactive}"
        aria-checked="${active}"
        @click="${() => this._selectTheme(theme)}"
      >
        <div
          class="${styles.preview}"
          style="background:${theme.preview.background};border-color:${previewBorder}"
        >
          <div
            class="${styles.previewFavorite}"
            style="background:${theme.preview.favorite}"
          ></div>
          <div
            class="${styles.previewSurface}"
            style="background:${theme.preview.surface};border-color:${previewBorder}"
          >
            <div
              class="${styles.previewAccent}"
              style="background:${theme.preview.accent}"
            ></div>
            <div class="${styles.previewLine}" style="background:${previewLine}"></div>
            <div
              class="${styles.previewLineShort}"
              style="background:${previewLineShort}"
            ></div>
          </div>
        </div>

        <div class="${styles.details}">
          <div>
            <div class="${styles.name}">${this.t(theme.nameKey)}</div>
            <div class="${styles.desc}">${this.t(theme.descriptionKey)}</div>
          </div>
          ${active
            ? html`<span class="${styles.check}"><jk-icon icon="check" class="size-4"></jk-icon></span>`
            : ''}
        </div>
      </button>
    `;
  }

  _renderGroup(scheme, labelKey) {
    const themes = THEMES.filter((theme) => theme.scheme === scheme);

    return html`
      <section class="${styles.group}" aria-labelledby="theme-group-${scheme}">
        <h4 id="theme-group-${scheme}" class="${styles.groupTitle}">${this.t(labelKey)}</h4>
        <div class="${styles.grid}" role="radiogroup" aria-label="${this.t(labelKey)}">
          ${themes.map((theme) => this._renderTheme(theme))}
        </div>
      </section>
    `;
  }

  render() {
    return html`
      <section class="${styles.wrapper}">
        <div class="${styles.heading}">
          <h3 class="${styles.title}">${this.t('appearanceTitle')}</h3>
          <p class="${styles.description}">${this.t('appearanceDescription')}</p>
        </div>

        ${this._renderGroup('dark', 'themeGroupDark')}
        ${this._renderGroup('light', 'themeGroupLight')}
      </section>
    `;
  }
}

customElements.define('jk-config-appearance', JkConfigAppearance);
