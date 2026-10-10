import { html, LitElement } from 'lit';
import './icon.js';
import './icon-button.js';

// 1. Static styling dictionary isolating layouts from the rendering engine
const styles = {
  container: `sticky top-0 z-50 flex flex-nowrap items-center justify-between gap-2 sm:gap-4 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900/95 to-slate-800/90 px-2 py-3 sm:px-6 sm:py-5 jk-shadow-card backdrop-blur-md`,
  logoShell: `group flex items-center justify-center size-9 sm:size-14 shrink-0 rounded-xl bg-slate-700/60 ring-1 ring-slate-600/70 transition-all duration-300 hover:bg-indigo-500/15 hover:ring-indigo-500/40 hover:-translate-y-0.5`,
  logoImg: `size-7 sm:size-11 object-contain transition-transform duration-300 group-hover:scale-105`,
  titleContainer: `flex items-center gap-2 min-w-0`,
  brandTextWrapper: `flex items-center gap-1 font-mono font-bold text-lg sm:text-3xl`,
  brandJump: `text-slate-50`,
  brandKey: `text-indigo-400`,
  helpButton: `hidden md:flex items-center justify-center size-7 rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-700/60 hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40`,
  rightSection: `flex items-center gap-3 sm:gap-5 shrink-0`,
  leftSection: `flex items-center gap-1.5 sm:gap-3 min-w-0`,
  actionGroup: `flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-800/50 p-1`,
  clockWrapper: `hidden sm:block text-right select-none`,
  clockTime: `flex items-center justify-end text-3xl font-semibold tracking-tight text-indigo-300`,
  clockSeparator: `mx-0.5 opacity-70`,
  clockDate: `mt-1 text-xs font-medium text-slate-400 whitespace-nowrap`,
};

export class JkDashboardHeader extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind styling classes
  }

  static get properties() {
    return {
      readOnly: { type: Boolean },
      hasWorkspaces: { type: Boolean },
      workspaceName: { type: String },
      workspaceNames: { type: Array },
      _scrolled: { state: true },
      workspaceOpen: { type: Boolean },
      isGridView: { type: Boolean },
      lang: { type: String },
      t: { type: Function },
      // Track only the raw Date object as internal state
      _now: { type: Object, state: true },
    };
  }

  constructor() {
    super();
    this.isGridView = true;
    this.lang = 'en';
    this.workspaceNames = [];
    this._scrolled = false;
    this._onScroll = () => { this._scrolled = window.scrollY > 1; };
    this._now = new Date();
    this._timeInterval = null;
  }

  // Set up the interval here so it restarts if the component is re-appended to the DOM
  connectedCallback() {
    super.connectedCallback();
    this._now = new Date();
    this._onScroll();
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this._timeInterval = setInterval(() => {
      this._now = new Date();
    }, 60 * 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('scroll', this._onScroll);
    if (this._timeInterval) {
      clearInterval(this._timeInterval);
    }
  }

  // Clean, reactive getters to derive formatted strings on the fly
  get _hours() {
    return String(this._now.getHours()).padStart(2, '0');
  }

  get _minutes() {
    return String(this._now.getMinutes()).padStart(2, '0');
  }

  get _dateString() {
    const locale = this.lang === 'de' ? 'de-DE' : 'en-US';
    const isMobile = window.matchMedia('(max-width: 639px)').matches;

    if (isMobile) {
      return this._now.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    return this._now.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  _dispatchEvent(eventName) {
    this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true }));
  }

  workspaceButton(mobile = false) {
    return html`<button type="button" class=${mobile ? 'jk-workspace-trigger jk-workspace-trigger-mobile' : 'jk-workspace-trigger jk-workspace-trigger-desktop'} aria-haspopup="dialog" aria-expanded=${String(Boolean(this.workspaceOpen))} aria-label=${this.t('workspace') + ': ' + this.workspaceName} title=${this.workspaceName} @click=${e=>this.dispatchEvent(new CustomEvent('open-workspaces',{detail:{anchor:e.currentTarget},bubbles:true,composed:true}))}>
      <span class="jk-workspace-trigger-name"><span class="jk-workspace-name-stack"><span>${this.workspaceName}</span>${this.workspaceNames.map(name => html`<span class="jk-workspace-name-measure" aria-hidden="true">${name}</span>`)}</span><jk-icon icon="ui:chevron-down" aria-hidden="true" class="jk-workspace-chevron size-4"></jk-icon></span>
    </button>`;
  }

  render() {
    return html`
      <div class="${styles.container} jk-dashboard-header-shell ${this._scrolled && this.hasWorkspaces ? "jk-header-scrolled" : ""}">
        <div class="${styles.leftSection}">
          <a
            href="https://github.com/desirevolution/jump-key"
            target="_blank"
            rel="noopener noreferrer"
            class="${styles.logoShell} ${this.hasWorkspaces ? 'jk-workspace-logo' : ''}"
          >
            <img src="/jump-key.png" alt="JumpKey" class="${styles.logoImg}" />
          </a>

          <div class="${styles.titleContainer} ${this.hasWorkspaces ? 'jk-workspace-title' : ''}">
            <div class="flex items-center gap-2">
            <div class="${styles.brandTextWrapper}">
              <span class="${styles.brandJump}">Jump</span>
              <span class="${styles.brandKey}">Key</span>
            </div>

            <button
              @click=${() => this._dispatchEvent('open-help')}
              title="${this.t ? this.t('helpHint') : ''}"
              class="${styles.helpButton}"
            >
              <jk-icon icon="ui:help-circle" class="size-5"></jk-icon>
            </button>
            </div>
            ${this.hasWorkspaces ? this.workspaceButton() : ''}
          </div>
        </div>

        <div class="${styles.rightSection}">
          <div class="${styles.actionGroup}">
            ${!this.readOnly ? html`<jk-icon-button icon="ui:plus" .desktopOnly=${true} .label=${this.t('quickAdd')} title="+" @click=${()=>this._dispatchEvent('quick-add')}></jk-icon-button>` : ''}
            <jk-icon-button
              icon="${this.isGridView ? 'ui:rows-2' : 'ui:layout-grid'}"
              title="${this.t ? this.t('hkToggleView') : ''} [#]"
              @click=${() => this._dispatchEvent('toggle-view')}
            ></jk-icon-button>

            <jk-icon-button
              icon="ui:search"
              title="${this.t ? this.t('hkSearch') : ''} [Space]"
              @click=${() => this._dispatchEvent('open-search')}
            ></jk-icon-button>

            <jk-icon-button
              icon="ui:settings"
              title="${this.t ? this.t(this.readOnly ? 'localSettings' : 'editConfig') : ''}"
              .desktopOnly=${true}
              @click=${() => this._dispatchEvent('open-config')}
            ></jk-icon-button>

            <span class="md:hidden">
              <jk-icon-button
                icon="ui:ellipsis"
                label="${this.t ? this.t('mobileMenuTitle') : 'More'}"
                @click=${() => this._dispatchEvent('open-mobile-menu')}
              ></jk-icon-button>
            </span>
          </div>

          <div class="${styles.clockWrapper}">
            <div class="${styles.clockTime}">
              <span>${this._hours}</span>
              <span class="${styles.clockSeparator}">:</span>
              <span>${this._minutes}</span>
            </div>

            <div class="${styles.clockDate}">${this._dateString}</div>
          </div>
        </div>
        ${this.hasWorkspaces ? this.workspaceButton(true) : ''}
      </div>
    `;
  }
}

customElements.define('jk-dashboard-header', JkDashboardHeader);
