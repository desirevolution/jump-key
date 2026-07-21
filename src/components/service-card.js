import { html, LitElement } from 'lit';
import './icon.js';

const LONG_PRESS_DURATION = 600;
const MOVE_CANCEL_DISTANCE = 12;

const styles = {
  card: `group relative flex w-full cursor-pointer select-none items-center gap-4 overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-200 ease-out touch-manipulation`,
  cardDefault: `border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 hover:-translate-y-1 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98]`,
  cardPressing: `scale-[0.985] border-indigo-500/40 bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner shadow-black/20`,
  cardReady: `scale-[0.99] border-indigo-400/70 bg-gradient-to-br from-slate-800 to-indigo-950/25 ring-2 ring-indigo-400/20 shadow-xl shadow-indigo-500/10`,
  glow: `pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100`,
  iconContainer: `relative z-10 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 transition-all duration-200 ease-out`,
  iconDefault: `bg-slate-700/60 text-indigo-400 ring-slate-600/70 group-hover:-translate-y-0.5 group-hover:bg-indigo-500/15 group-hover:text-white group-hover:ring-indigo-500/40`,
  iconPressing: `scale-95 bg-indigo-500/10 text-indigo-300 ring-indigo-500/30`,
  iconReady: `scale-105 bg-indigo-500/20 text-indigo-200 ring-indigo-400/50`,
  icon: `size-8 transition-transform duration-200 group-hover:scale-105`,
  content: `relative z-10 flex min-w-0 grow flex-col justify-center pr-10`,
  name: `truncate text-lg font-semibold leading-tight tracking-tight transition-colors duration-200`,
  subtitle: `mt-1 truncate text-sm leading-snug text-slate-400 transition-colors duration-200 group-hover:text-slate-300`,
  badge: `absolute right-4 top-4 z-20 hidden h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 sm:flex`,
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
    return styles.cardDefault;
  }

  _getIconClasses() {
    if (this.isReady) return styles.iconReady;
    if (this.isPressing) return styles.iconPressing;
    return styles.iconDefault;
  }

  _getBadgeClasses() {
    if (this.isReady) {
      return 'border-indigo-400/60 bg-indigo-500/30 text-white shadow-md shadow-indigo-500/20';
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
          class="absolute inset-x-0 bottom-0 origin-bottom rounded-r-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.65)] ${fillClasses}"
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
            class="${styles.name} ${this.isReady ? 'text-indigo-200' : 'text-white group-hover:text-indigo-200'}"
          >
            ${this.name}
          </span>

          <span class=${styles.subtitle}> ${displaySubtitle} </span>
        </div>

        ${
          this.badgeText
            ? html`
                <kbd class="${styles.badge} ${this._getBadgeClasses()}">
                  ${this.badgeText.toUpperCase()}
                </kbd>
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
              box-shadow: 0 0 8px rgb(129 140 248 / 0.45);
            }
            50% {
              opacity: 1;
              box-shadow:
                0 0 14px rgb(129 140 248 / 0.8),
                0 0 24px rgb(99 102 241 / 0.35);
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
