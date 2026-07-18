import { LitElement, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import './icon.js';

// 1. Extract static design definitions completely out of the class
const styles = {
  card: `group relative flex items-center gap-4 w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-4 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98]`,
  accent: `absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300`,
  glow: `pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500`,
  iconContainer: `relative z-10 flex items-center justify-center size-14 shrink-0 overflow-hidden rounded-xl bg-slate-700/60 ring-1 ring-slate-600/70 text-indigo-400 transition-all duration-300 ease-out group-hover:bg-indigo-500/15 group-hover:ring-indigo-500/40 group-hover:text-white group-hover:-translate-y-0.5`,
  icon: `size-8 transition-transform duration-300 group-hover:scale-105`,
  content: `relative z-10 flex min-w-0 grow flex-col justify-center pr-10`,
  name: `truncate text-lg font-semibold leading-tight tracking-tight text-white transition-colors duration-300 group-hover:text-indigo-200`,
  subtitle: `mt-1 truncate text-sm leading-snug text-slate-400 transition-colors duration-300 group-hover:text-slate-300`,
  badgeBase: `absolute top-4 right-4 z-20 hidden sm:flex items-center justify-center min-w-7 h-7 px-2 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all duration-300`,
};

export class JkServiceCard extends LitElement {
  createRenderRoot() {
    return this; // Using global Tailwind styles
  }

  static properties = {
    name: { type: String },
    subtitle: { type: String },
    icon: { type: String },
    badgeText: { type: String },
    isFavorite: { type: Boolean },
  };

  constructor() {
    super();
    this.name = '';
    this.subtitle = '';
    this.icon = '';
    this.badgeText = '';
    this.isFavorite = false;
  }

  _handleClick() {
    this.dispatchEvent(new CustomEvent('card-click', { bubbles: true, composed: true }));
  }

  render() {
    const isUrl = this.subtitle && (this.subtitle.includes('.') || this.subtitle.includes('/'));
    const displaySubtitle = isUrl
      ? this.subtitle.replace(/^https?:\/\/(www\.)?/, '')
      : this.subtitle || '';

    // 2. Compute dynamic badge classes efficiently using an object layout
    // FIX: We inject the base classes via dynamic object keys so classMap owns the entire attribute!
    const badgeClasses = {
      [styles.badgeBase]: true,
      'border border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-lg shadow-indigo-500/20 group-hover:bg-indigo-500/30':
        this.isFavorite,
      'border border-slate-600 bg-slate-900/80 text-slate-300 group-hover:border-indigo-500/40 group-hover:text-indigo-300':
        !this.isFavorite,
    };

    return html`
      <div @click=${this._handleClick} class="${styles.card}">
        <div class="${styles.accent}"></div>
        <div class="${styles.glow}"></div>

        <!-- Icon -->
        <div class="${styles.iconContainer}">
          <jk-icon .icon=${this.icon} class="${styles.icon}"></jk-icon>
        </div>

        <!-- Content -->
        <div class="${styles.content}">
          <span class="${styles.name}">${this.name}</span>
          <span class="${styles.subtitle}">${displaySubtitle}</span>
        </div>

        <!-- Dynamic Badge -->
        ${
          this.badgeText
            ? html`
                <!-- FIX: classMap completely controls the class attribute now -->
                <kbd class="${classMap(badgeClasses)}"> ${this.badgeText.toUpperCase()} </kbd>
              `
            : ''
        }
      </div>
    `;
  }
}

customElements.define('jk-service-card', JkServiceCard);
