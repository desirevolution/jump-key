import { LitElement, html } from 'lit';
import { validateConfig } from '../utils/config-validator.js';

export class JkConfigData extends LitElement {
  createRenderRoot() {
    return this;
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
          alert(this.t('tabDataImportSuccess'));
        } else {
          alert(this.t('tabDataImportInvalidStructure'));
        }
      } catch (err) {
        alert(this.t('tabDataImportJsonError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  render() {
    return html`
      <div class="flex flex-col gap-5 h-full text-slate-200">
        <!-- Export Card -->
        <section
          class="group relative bg-slate-900/40 border border-slate-700/60 
        rounded-2xl p-5 transition-all duration-200
        hover:border-indigo-500/40 hover:bg-slate-900/60"
        >
          <div class="flex items-center gap-4">
            <!-- Icon -->
            <div
              class="flex items-center justify-center shrink-0
            w-12 h-12 rounded-xl
            bg-indigo-500/10
            text-indigo-400
            border border-indigo-500/20
            group-hover:bg-indigo-500/20
            transition-colors"
            >
              <jk-icon icon="download" class="w-6 h-6"></jk-icon>
            </div>

            <!-- Text -->
            <div class="grow min-w-0">
              <h3 class="text-sm font-bold text-white tracking-wide">
                ${this.t('tabDataBackupTitle')}
              </h3>

              <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                ${this.t('tabDataBackupDesc')}
              </p>
            </div>

            <!-- Action -->
            <button
              @click="${this._exportConfig}"
              class="
              shrink-0
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-xl

              bg-indigo-600
              hover:bg-indigo-500

              text-sm font-semibold
              text-white

              border border-indigo-500/30

              shadow-lg shadow-indigo-500/10

              transition-all
              active:scale-95

              cursor-pointer
            "
            >
              <jk-icon icon="download" class="w-4 h-4"></jk-icon>

              ${this.t('tabDataExport')}
            </button>
          </div>
        </section>

        <!-- Import Card -->
        <section
          class="
          bg-slate-900/40
          border border-slate-700/60
          rounded-2xl
          p-5
        "
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="
              flex items-center justify-center
              w-10 h-10
              rounded-xl
              bg-slate-800
              text-indigo-400
              border border-slate-700
            "
            >
              <jk-icon icon="upload" class="w-5 h-5"></jk-icon>
            </div>

            <div>
              <h3
                class="
                text-sm
                font-bold
                text-white
              "
              >
                ${this.t('tabDataRestoreTitle')}
              </h3>

              <p
                class="
                text-xs
                text-slate-400
                mt-0.5
              "
              >
                ${this.t('tabDataRestoreDesc')}
              </p>
            </div>
          </div>

          <!-- Drop Zone -->

          <div
            class="
            relative

            border
            border-dashed
            border-slate-700

            hover:border-indigo-500/60

            rounded-xl

            min-h-[180px]

            flex
            flex-col
            items-center
            justify-center

            bg-slate-950/30

            transition-all
            duration-200

            group

            cursor-pointer
          "
          >
            <input
              type="file"
              accept=".json"
              @change="${this._handleImport}"
              class="
              absolute
              inset-0
              opacity-0
              cursor-pointer
            "
            />

            <div
              class="
              flex
              items-center
              justify-center

              w-14
              h-14

              rounded-2xl

              bg-indigo-500/10

              text-indigo-400

              mb-3

              group-hover:scale-110

              transition-transform
            "
            >
              <jk-icon icon="file-json" class="w-7 h-7"></jk-icon>
            </div>

            <span
              class="
              text-sm
              font-semibold
              text-slate-200
            "
            >
              ${this.t('tabDataSelectFile')}
            </span>

            <span
              class="
              text-xs
              text-slate-500
              mt-1
            "
            >
              ${this.t('tabDataOnlyJsonFiles')}
            </span>
          </div>
        </section>
      </div>
    `;
  }
}

customElements.define('jk-config-data', JkConfigData);
