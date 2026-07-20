import { html, LitElement } from 'lit';
import './icon.js';

// 1. Static styling dictionary isolating layouts from the rendering engine
const styles = {
  overlay: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md`,
  modal: `w-full max-w-md rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl shadow-black/40 p-5 font-mono`,
  header: `flex items-center justify-between mb-5`,
  headerLeft: `flex items-center gap-3`,
  iconBadge: `flex items-center justify-center size-9 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`,
  icon: `size-5 text-indigo-300`,
  title: `text-base font-semibold text-white`,
  shortcutsContainer: `space-y-1 max-h-[60vh] overflow-y-auto pr-1`, // Scrollbar falls es voll wird
  row: `flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-800/60`,
  rowDesc: `text-sm text-slate-400`,
  keysContainer: `flex items-center gap-1 shrink-0`,
  contextBadge: `mr-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300`,
  kbd: `inline-flex items-center justify-center min-w-8 h-7 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs font-bold text-indigo-300 shadow-inner shadow-black/40`,
  footer: `mt-5 text-center text-[11px] text-slate-500`,
};

export class JkHelpModal extends LitElement {
  createRenderRoot() {
    return this; // Preserves global Tailwind styling classes
  }

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
    this.show = false; // Close locally
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
  }

  render() {
    if (!this.show) return html``;

    const shortcuts = [
      {
        keys: ['Space'],
        desc: this.t('hkSearch'),
      },
      {
        keys: [':'],
        desc: this.t('hkSearchEngines'),
      },
      {
        keys: ['?'],
        desc: this.t('helpTitle'),
      },
      {
        keys: ['Ctrl', ','],
        desc: this.t('editConfig'),
      },
      {
        keys: ['Ctrl', '1/2'],
        desc: this.t('hkSwitchTabs'), // Wechselt die Tabs im Config-Modal (z.B. Services / Engines / Raw)
      },
    ];

    // Ansichtsmodus-Wechsel geht laut App-Logik nur, wenn keine Kategorie aktiv ist
    shortcuts.push({
      keys: ['#'],
      desc: this.t('hkToggleView'),
    });

    // Favoriten-Schnellwahl (nur im Standard-Listenmodus aktiv)
    if (!this.isGridView) {
      shortcuts.push({
        keys: ['0-9'],
        desc: this.t('hkFavs'),
      });
    }

    // Sequenzielle Navigation innerhalb der Strukturen
    shortcuts.push(
      {
        keys: ['A-Z'],
        desc: this.t('hkCat'),
      },
      {
        keys: ['A-Z'],
        desc: this.t('hkService'),
        context: true, // Zeigt das "In Kategorie"-Badge
      },
      {
        keys: ['↑', '↓'],
        desc: this.t('hkNavigate'),
      },
      {
        keys: ['ESC'],
        desc: this.t('hkReset'),
      }
    );

    return html`
      <div @click=${this._handleClose} class="${styles.overlay}">
        <div @click=${(e) => e.stopPropagation()} class="${styles.modal}">
          <div class="${styles.header}">
            <div class="${styles.headerLeft}">
              <div class="${styles.iconBadge}">
                <jk-icon icon="keyboard" class="${styles.icon}"></jk-icon>
              </div>
              <h3 class="${styles.title}">${this.t('helpTitle')}</h3>
            </div>
            <jk-icon-button
              icon="x"
              label="Close"
              @click=${this._handleClose}
            ></jk-icon-button>
          </div>

          <div class="${styles.shortcutsContainer}">
            ${shortcuts.map(
              (item) => html`
                <div class="${styles.row}">
                  <span class="${styles.rowDesc}"> ${item.desc} </span>

                  <div class="${styles.keysContainer}">
                    ${
                      item.context
                        ? html`
                            <span class="${styles.contextBadge}">
                              ${this.t('contextInCat')}
                            </span>
                          `
                        : ''
                    }
                    ${item.keys.map((key) => html` <kbd class="${styles.kbd}"> ${key} </kbd> `)}
                  </div>
                </div>
              `
            )}
          </div>

          <div class="${styles.footer}">${this.t('helpExit')}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('jk-help-modal', JkHelpModal);
