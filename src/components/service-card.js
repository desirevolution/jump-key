import { html, LitElement } from 'lit';
import './icon.js';

const LONG_PRESS_DURATION = 600;
const MOVE_CANCEL_DISTANCE = 12;

const styles = {
  card: `group relative flex w-full cursor-pointer select-none items-center gap-4 overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-200 ease-out touch-manipulation`,
  cardDefault: `jk-service-card hover:-translate-y-1 active:scale-[0.98]`,
  cardPressing: `jk-service-card scale-[0.985] border-indigo-500/40 jk-shadow-inset`,
  cardReady: `jk-service-card scale-[0.99] border-indigo-400/70 ring-2 ring-indigo-400/20`,
  glow: `pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/4 to-indigo-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100`,
  iconContainer: `jk-service-card-icon relative z-10 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-all duration-200 ease-out`,
  iconDefault: `group-hover:-translate-y-0.5`,
  iconPressing: `scale-95`,
  iconReady: `scale-105`,
  icon: `size-8 transition-transform duration-200 group-hover:scale-105`,
  content: `relative z-10 flex min-w-0 grow flex-col justify-center pr-10 sm:pr-24`,
  name: `truncate text-lg font-semibold leading-tight tracking-tight transition-colors duration-200`,
  subtitle: `mt-1 truncate text-sm leading-snug text-slate-400 transition-colors duration-200 group-hover:text-slate-300`,
  badges: `absolute right-4 top-4 z-20 flex items-center gap-1.5`,
  badge: `hidden h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 sm:inline-flex`,
  favoriteBadge: `jk-favorite-badge hidden h-7 min-w-7 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold sm:inline-flex`,
  favoriteMobile: `jk-favorite-badge inline-flex size-7 items-center justify-center rounded-lg border sm:hidden`,
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
    favoriteSlot: { type: String },

    isPressing: { type: Boolean, state: true },
    isReady: { type: Boolean, state: true },
  };

  constructor() {
    super();

    this.name = '';
    this.subtitle = '';
    this.icon = '';
    this.badgeText = '';
    this.isFavorite = false;
    this.favoriteSlot = '';

    this.isPressing = false;
    this.isReady = false;

    this._pressTimer = null;
    this._pointerId = null;
    this._pointerStart = null;
    this._longPressTriggered = false;
    this._suppressClick = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelLongPress();
  }

  _handlePointerDown(event) {
    if (event.button !== 0 || this._pointerId !== null) {
      return;
    }

    this._pointerId = event.pointerId;
    this._pointerStart = {
      x: event.clientX,
      y: event.clientY,
    };

    this._longPressTriggered = false;
    this._suppressClick = false;
    this.isPressing = true;
    this.isReady = false;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    clearTimeout(this._pressTimer);

    this._pressTimer = setTimeout(() => {
      this._longPressTriggered = true;
      this.isPressing = false;
      this.isReady = true;

      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }, LONG_PRESS_DURATION);
  }

  _handlePointerMove(event) {
    if (
      event.pointerId !== this._pointerId ||
      !this._pointerStart ||
      this.isReady
    ) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - this._pointerStart.x,
      event.clientY - this._pointerStart.y
    );

    if (distance > MOVE_CANCEL_DISTANCE) {
      this._cancelLongPress(event);
    }
  }

  _handlePointerUp(event) {
    if (event.pointerId !== this._pointerId) {
      return;
    }

    clearTimeout(this._pressTimer);

    const wasLongPress = this._longPressTriggered;

    this._releasePointer(event);
    this._resetPressState();

    if (wasLongPress) {
      event.preventDefault();
      event.stopPropagation();

      this._suppressClick = true;

      this.dispatchEvent(
        new CustomEvent('card-long-press', {
          detail: {
            service: this._getServiceData(),
          },
          bubbles: true,
          composed: true,
        })
      );

      return;
    }

    this.dispatchEvent(
      new CustomEvent('card-click', {
        detail: {
          service: this._getServiceData(),
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  _handlePointerCancel(event) {
    this._releasePointer(event);
    this._cancelLongPress();
  }

  _handleLostPointerCapture() {
    if (this._pointerId !== null) {
      this._cancelLongPress();
    }
  }

  _handleNativeClick(event) {
    if (!this._suppressClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this._suppressClick = false;
  }

  _releasePointer(event) {
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture may already have been released.
    }
  }

  _cancelLongPress(event) {
    clearTimeout(this._pressTimer);

    if (event) {
      this._releasePointer(event);
    }

    this._resetPressState();
  }

  _resetPressState() {
    this.isPressing = false;
    this.isReady = false;

    this._pointerId = null;
    this._pointerStart = null;
    this._longPressTriggered = false;
  }

  _getServiceData() {
    return {
      name: this.name,
      url: this.subtitle,
      icon: this.icon,
      key: this.badgeText,
    };
  }

  _getCardClasses() {
    if (this.isReady) return styles.cardReady;
    if (this.isPressing) return styles.cardPressing;
    return `${styles.cardDefault} ${
      this.isFavorite ? 'jk-favorite-card' : ''
    }`;
  }

  _getIconClasses() {
    if (this.isReady) return styles.iconReady;
    if (this.isPressing) return styles.iconPressing;
    return styles.iconDefault;
  }

  _getBadgeClasses() {
    if (this.isReady) {
      return 'border-indigo-400/60 bg-indigo-500/30 text-slate-50 shadow-md shadow-indigo-500/20';
    }

    if (this.isFavorite) {
      return 'border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-lg shadow-indigo-500/20';
    }

    return 'border-slate-600 bg-slate-900/80 text-slate-300';
  }

  _renderAccent() {
    const fillClasses = this.isPressing
      ? 'animate-[jk-long-press-fill_600ms_linear_forwards]'
      : this.isReady
        ? 'h-full animate-[jk-long-press-pulse_900ms_ease-in-out_infinite]'
        : 'h-0';

    return html`
      <div
        class="pointer-events-none absolute bottom-4 left-0 top-4 z-20 w-1 overflow-hidden rounded-r-full bg-slate-700/50 transition-opacity duration-200 ${this.isPressing || this.isReady ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
      >
        <div
          class="absolute inset-x-0 bottom-0 origin-bottom rounded-r-full bg-indigo-400 jk-long-press-fill ${fillClasses}"
        ></div>
      </div>
    `;
  }

  render() {
    const isUrl =
      this.subtitle &&
      (this.subtitle.includes('.') || this.subtitle.includes('/'));

    const displaySubtitle = isUrl
      ? this.subtitle.replace(/^https?:\/\/(www\.)?/, '')
      : this.subtitle || '';

    return html`
      <div
        role="button"
        tabindex="0"
        aria-label=${this.name}
        @pointerdown=${this._handlePointerDown}
        @pointermove=${this._handlePointerMove}
        @pointerup=${this._handlePointerUp}
        @pointercancel=${this._handlePointerCancel}
        @lostpointercapture=${this._handleLostPointerCapture}
        @click=${this._handleNativeClick}
        class="${styles.card} ${this._getCardClasses()}"
      >
        ${this._renderAccent()}

        <div
          class="${styles.glow} ${this.isPressing || this.isReady ? 'opacity-100' : ''}"
        ></div>

        <div class="${styles.iconContainer} ${this._getIconClasses()}">
          <jk-icon .icon=${this.icon} class=${styles.icon}></jk-icon>
        </div>

        <div class=${styles.content}>
          <span
            class="${styles.name} ${this.isReady ? 'text-indigo-200' : 'text-slate-50 group-hover:text-indigo-200'}"
          >
            ${this.name}
          </span>

          <span class=${styles.subtitle}> ${displaySubtitle} </span>
        </div>

        ${
          this.favoriteSlot || this.badgeText
            ? html`
                <div class=${styles.badges}>
                  ${
                    this.favoriteSlot
                      ? html`
                          <span
                            class=${styles.favoriteMobile}
                            aria-label="Favorit"
                            title="Favorit"
                          >
                            <jk-icon icon="star" class="size-4"></jk-icon>
                          </span>
                          <kbd
                            class=${styles.favoriteBadge}
                            title="Favoriten-Shortcut ${this.favoriteSlot}"
                          >
                            <jk-icon icon="star" class="size-3.5"></jk-icon>
                            ${this.favoriteSlot}
                          </kbd>
                        `
                      : ''
                  }
                  ${
                    this.badgeText
                      ? html`
                          <kbd class="${styles.badge} ${this._getBadgeClasses()}">
                            ${this.badgeText.toUpperCase()}
                          </kbd>
                        `
                      : ''
                  }
                </div>
              `
            : ''
        }

        <style>
          @keyframes jk-long-press-fill {
            from {
              height: 0%;
              opacity: 0.65;
            }
            to {
              height: 100%;
              opacity: 1;
            }
          }

          @keyframes jk-long-press-pulse {
            0%,
            100% {
              opacity: 0.75;
              box-shadow: 0 0 8px var(--jk-accent-glow-soft);
            }
            50% {
              opacity: 1;
              box-shadow:
                0 0 14px var(--jk-accent-glow),
                0 0 24px var(--jk-accent-glow-soft);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-[jk-long-press-fill_600ms_linear_forwards],
            .animate-[jk-long-press-pulse_900ms_ease-in-out_infinite] {
              animation: none;
            }
          }
        </style>
      </div>
    `;
  }
}

customElements.define('jk-service-card', JkServiceCard);
