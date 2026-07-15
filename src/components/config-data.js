import { LitElement, html } from "lit";
import { validateConfig } from "../utils/config-validator.js";

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

      const blob = new Blob([configData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dashboard-config.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export config", e);
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
            new CustomEvent("config-imported", {
              detail: parsed,
              bubbles: true,
              composed: true,
            }),
          );
          alert("Konfiguration erfolgreich geladen!");
        } else {
          alert("Die hochgeladene Datei hat keine valide Dashboard-Struktur.");
        }
      } catch (err) {
        alert("Fehler beim Lesen der JSON-Datei. Ungültige Syntax.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  render() {
    return html`
      <div class="flex flex-col gap-5 text-slate-200">
        <div
          class="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl flex items-center justify-between gap-4"
        >
          <div>
            <h3 class="font-semibold text-white">Konfiguration sichern</h3>
            <p class="text-xs text-slate-400 mt-1">
              Lade deine aktuellen Widgets und Suchmaschinen als .json-Datei
              herunter.
            </p>
          </div>
          <button
            @click="${this._exportConfig}"
            class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <jk-icon icon="download" class="w-4 h-4"></jk-icon>
            ${this.t("export") || "Exportieren"}
          </button>
        </div>

        <div class="bg-slate-900/30 border border-slate-700 p-5 rounded-2xl">
          <h3 class="font-semibold text-white mb-1">
            Konfiguration wiederherstellen
          </h3>
          <p class="text-xs text-slate-400 mb-4">
            Lade eine vorhandene JSON-Konfigurationsdatei hoch.
          </p>

          <div
            class="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors relative"
          >
            <input
              type="file"
              accept=".json"
              @change="${this._handleImport}"
              class="absolute inset-0 opacity-0 cursor-pointer"
            />
            <jk-icon
              icon="upload"
              class="text-indigo-400 w-8 h-8 mb-2"
            ></jk-icon>
            <span class="text-sm font-medium text-slate-200"
              >Datei auswählen</span
            >
            <span class="text-xs text-slate-500 mt-1"
              >Nur valide .json-Dateien</span
            >
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-config-data", JkConfigData);
