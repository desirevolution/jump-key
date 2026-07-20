import { html, LitElement } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import './icon.js';

const styles = {
  card: `group relative flex items-center gap-4 w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-4 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98] select-none`,
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
    return this;
  }

  static properties = {
    name: { type: String },
    subtitle: { type: String },
    icon: { type: String },
    badgeText: { type: String },
    isFavorite: { type: Boolean },
    isPressing: { type: Boolean },
    isReady: { type: Boolean }, // NEU: Zustand für "Bereit zum Loslassen"
  };

  constructor() {
    super();
    this.name = '';
    this.subtitle = '';
    this.icon = '';
    this.badgeText = '';
    this.isFavorite = false;
    this.isPressing = false;
    this.isReady = false;
    this._pressTimer = null;
    this._isLongPressActive = false;
  }

  _handlePointerDown(e) {
    if (e.button !== 0) return;

    this._isLongPressActive = false;
    this.isReady = false;
    this.isPressing = true;
    clearTimeout(this._pressTimer);

    // Nach 600ms signalisieren wir dem User: "Jetzt loslassen!"
    this._pressTimer = setTimeout(() => {
      this._isLongPressActive = true;
      this.isReady = true; // Visueller Trigger wird aktiv
      this.isPressing = false;
      this.requestUpdate();
    }, 600);
  }

  _handlePointerUp(e) {
    clearTimeout(this._pressTimer);
    this.isPressing = false;

    const serviceData = {
      name: this.name,
      url: this.subtitle,
      icon: this.icon,
      key: this.badgeText,
    };

    // WICHTIG: Die Action wird erst JETZT beim Loslassen ausgeführt
    if (this._isLongPressActive) {
      e.preventDefault();
      e.stopPropagation();

      this.isReady = false;
      this._isLongPressActive = false;

      this.dispatchEvent(
        new CustomEvent('card-long-press', {
          detail: { service: serviceData },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    // Normaler kurzer Klick
    this.dispatchEvent(
      new CustomEvent('card-click', {
        detail: { service: serviceData },
        bubbles: true,
        composed: true,
      })
    );
  }

  _handlePointerLeave() {
    clearTimeout(this._pressTimer);
    this.isPressing = false;
    this.isReady = false;
  }

  _handleNativeClick(e) {
    // Wenn es ein Long-Press war, fangen wir das darauffolgende native Click-Event ab
    if (this.isReady || this._isLongPressActive) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  render() {
    const isUrl =
      this.subtitle &&
      (this.subtitle.includes('.') || this.subtitle.includes('/'));
    const displaySubtitle = isUrl
      ? this.subtitle.replace(/^https?:\/\/(www\.)?/, '')
      : this.subtitle || '';

    const dynamicBadgeClasses = {
      [styles.badgeBase]: true,
      'border border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-lg shadow-indigo-500/20':
        this.isFavorite && !this.isReady,
      'border border-slate-600 bg-slate-900/80 text-slate-300':
        !this.isFavorite && !this.isReady,
      // Optimiert: Ein ruhiges, klares Indigo statt Warn-Gelb/Orange
      '!border-indigo-400 !bg-indigo-500/30 !text-white shadow-indigo-500/30':
        this.isReady,
    };

    return html`
      <div
        @pointerdown=${this._handlePointerDown}
        @pointerup=${this._handlePointerUp}
        @pointerleave=${this._handlePointerLeave}
        @click=${this._handleNativeClick}
        class="${styles.card} ${
          this.isPressing ? 'scale-95 !border-indigo-500/50 duration-500' : ''
        } ${
          this.isReady
            ? 'scale-[0.98] !border-indigo-400 bg-slate-800/90 shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/50'
            : '' // Kein unruhiges animate-pulse, sondern ein eleganter Ring & Glow
        }"
      >
        <div
          class="${styles.accent} ${this.isReady ? '!bg-amber-500 !opacity-100' : ''}"
        ></div>
        <div
          class="${styles.glow} ${
            this.isReady
              ? '!opacity-100 from-amber-500/10 via-amber-500/5 to-amber-500/0'
              : ''
          }"
        ></div>

        <div
          class="${styles.iconContainer} ${this.isReady ? 'text-amber-400 !ring-amber-500/50 bg-amber-500/10' : ''}"
        >
          <jk-icon .icon=${this.icon} class="${styles.icon}"></jk-icon>
        </div>

        <div class="${styles.content}">
          <span class="${styles.name} ${this.isReady ? '!text-amber-200' : ''}"
            >${this.name}</span
          >
          <span class="${styles.subtitle}">${displaySubtitle}</span>
        </div>

        ${
          this.badgeText
            ? html`
                <!-- classMap steht hier jetzt VÖLLIG ALLEIN im class-Attribut -->
                <kbd class="${classMap(dynamicBadgeClasses)}">
                  ${this.badgeText.toUpperCase()}
                </kbd>
              `
            : ''
        }
      </div>
    `;
  }
}

customElements.define('jk-service-card', JkServiceCard);
