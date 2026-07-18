import { LitElement, html } from 'lit';
import { validateConfig } from '../utils/config-validator.js';

// 1. Static styling dictionary isolating layouts from the application engine
const styles = {
  wrapper: `flex flex-col gap-5 h-full text-slate-200`,

  // Export Section
  exportCard: `group relative bg-slate-900/40 border border-slate-700/60 rounded-2xl p-5 transition-all duration-200 hover:border-indigo-500/40 hover:bg-slate-900/60`,
  exportBody: `flex items-center gap-4`,
  exportIconBox: `flex items-center justify-center shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors`,
  exportTextContainer: `grow min-w-0`,
  exportTitle: `text-sm font-bold text-white tracking-wide`,
  exportDesc: `text-xs text-slate-400 mt-1 leading-relaxed`,
  exportBtn: `shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10 transition-all active:scale-95 cursor-pointer`,

  // Import Section
  importCard: `bg-slate-900/40 border border-slate-700/60 rounded-2xl p-5`,
  importHeader: `flex items-center gap-3 mb-4`,
  importIconBox: `flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700`,
  importTitle: `text-sm font-bold text-white`,
  importDesc: `text-xs text-slate-400 mt-0.5`,

  // Drop Zone
  dropZone: `relative border border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl min-h-[180px] flex flex-col items-center justify-center bg-slate-950/30 transition-all duration-200 group cursor-pointer`,
  fileInput: `absolute inset-0 opacity-0 cursor-pointer`,
  dropZoneIconBox: `flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 group-hover:scale-110 transition-transform`,
  dropZoneLabel: `text-sm font-semibold text-slate-200`,
  dropZoneSubLabel: `text-xs text-slate-500 mt-1`,
};

export class JkConfigData extends LitElement {
  createRenderRoot() {
    return this; // Preserves Tailwind utility execution
  }

  static properties = {
    categories: { type: Array },
    searchEngines: { type: Array },
    t: { type: Function },
  };

  _exportConfig() {
    try {
      const configData = JSON.stringify(
        {
          categories: this.categories,
          searchEngines: this.searchEngines,
        },
        null,
        2,
      );

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const blob = new Blob([configData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `services.backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export config', e);
    }
  }

  _handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target.result;
        const parsed = JSON.parse(fileContent);

        if (validateConfig(parsed)) {
          this.dispatchEvent(
            new CustomEvent('config-imported', {
              detail: parsed,
              bubbles: true,
              composed: true,
            }),
          );

          this._sendNotification('success', this.t('tabDataImportSuccess'));
        } else {
          this._sendNotification('error', this.t('tabDataImportInvalidStructure'));
        }
      } catch (err) {
        // JSON-Parsing-Fehler
        this._sendNotification('error', this.t('tabDataImportJsonError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // Hilfsmethode für das Event-Dispatching
  _sendNotification(type, message) {
    this.dispatchEvent(
      new CustomEvent('notify', {
        detail: { type, message },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="${styles.wrapper}">
        <!-- Export Card -->
        <section class="${styles.exportCard}">
          <div class="${styles.exportBody}">
            <!-- Icon -->
            <div class="${styles.exportIconBox}">
              <jk-icon icon="download" class="w-6 h-6"></jk-icon>
            </div>

            <!-- Text -->
            <div class="${styles.exportTextContainer}">
              <h3 class="${styles.exportTitle}">${this.t('tabDataBackupTitle')}</h3>
              <p class="${styles.exportDesc}">${this.t('tabDataBackupDesc')}</p>
            </div>

            <!-- Action -->
            <button @click="${this._exportConfig}" class="${styles.exportBtn}">
              <jk-icon icon="download" class="w-4 h-4"></jk-icon>
              ${this.t('tabDataExport')}
            </button>
          </div>
        </section>

        <!-- Import Card -->
        <section class="${styles.importCard}">
          <div class="${styles.importHeader}">
            <div class="${styles.importIconBox}">
              <jk-icon icon="upload" class="w-5 h-5"></jk-icon>
            </div>

            <div>
              <h3 class="${styles.importTitle}">${this.t('tabDataRestoreTitle')}</h3>
              <p class="${styles.importDesc}">${this.t('tabDataRestoreDesc')}</p>
            </div>
          </div>

          <!-- Drop Zone -->
          <div class="${styles.dropZone}">
            <input
              type="file"
              accept=".json"
              @change="${this._handleImport}"
              class="${styles.fileInput}"
            />

            <div class="${styles.dropZoneIconBox}">
              <jk-icon icon="file-json" class="w-7 h-7"></jk-icon>
            </div>

            <span class="${styles.dropZoneLabel}"> ${this.t('tabDataSelectFile')} </span>

            <span class="${styles.dropZoneSubLabel}"> ${this.t('tabDataOnlyJsonFiles')} </span>
          </div>
        </section>
      </div>
    `;
  }
}

customElements.define('jk-config-data', JkConfigData);
