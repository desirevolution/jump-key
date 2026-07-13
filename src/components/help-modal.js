import { LitElement, html, css } from "lit";
import "./icon.js";

export class JkHelpModal extends LitElement {
  static properties = {
    show: { type: Boolean },
    isGridView: { type: Boolean },
    t: { type: Function },
  };

  static styles = css`
    :host {
      display: block;
    }

    /* Keyframe for animate-fadeIn */
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Modal Backdrop Layer */
    .backdrop {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0; /* inset-0 */
      background-color: rgba(2, 6, 23, 0.85); /* bg-slate-950/85 */
      backdrop-filter: blur(8px); /* backdrop-blur-sm */
      display: flex;
      align-items: center;
      justify-content: center; /* flex items-center justify-center */
      z-index: 50; /* z-50 */
      animation: fadeIn 0.2s ease-out forwards; /* animate-fadeIn */
      padding: 1rem; /* p-4 */
    }

    /* Modal Window Content Box */
    .modal-box {
      background-color: #1e293b; /* bg-slate-800 */
      border: 1px solid #334155; /* border-slate-700 */
      width: 100%;
      max-width: 28rem; /* max-w-md (448px) */
      border-radius: 1rem; /* rounded-2xl */
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* shadow-2xl */
      padding: 1.5rem; /* p-6 */
      position: relative; /* relative */
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; /* font-mono */
      color: #cbd5e1; /* text-slate-300 */
      box-sizing: border-box;
    }

    /* Header Container */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between; /* flex items-center justify-between */
      margin-bottom: 1.5rem; /* mb-6 */
      border-bottom: 1px solid #334155; /* border-b border-slate-700 */
      padding-bottom: 0.75rem; /* pb-3 */
    }

    /* Title H3 */
    .title {
      font-size: 1.125rem; /* text-lg */
      font-weight: 700; /* font-bold */
      color: #ffffff; /* text-white */
      display: flex;
      align-items: center;
      gap: 0.5rem; /* gap-2 */
      margin: 0;
    }

    .title-icon {
      color: #818cf8; /* text-indigo-400 */
      width: 1.25rem; /* w-5 */
      height: 1.25rem; /* h-5 */
    }

    /* Close Button */
    .close-btn {
      color: #94a3b8; /* text-slate-400 */
      background-color: #334155; /* bg-slate-700 */
      border: none;
      padding: 0.375rem; /* p-1.5 */
      border-radius: 0.5rem; /* rounded-lg */
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        color 0.2s,
        background-color 0.2s; /* transition-colors */
    }

    .close-btn:hover {
      color: #ffffff; /* hover:text-white */
      background-color: #475569; /* hover:bg-slate-600 */
    }

    .close-icon {
      width: 1rem; /* w-4 */
      height: 1rem; /* h-4 */
    }

    /* Shortcuts List Container */
    .shortcuts-list {
      display: flex;
      flex-direction: column;
      gap: 1rem; /* space-y-4 */
    }

    /* Individual Shortcut Row */
    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem; /* gap-4 */
      padding-top: 0.375rem;
      padding-bottom: 0.375rem; /* py-1.5 */
      border-bottom: 1px solid rgba(51, 65, 85, 0.3); /* border-b border-slate-700/30 */
    }

    /* Shortcut Description Description Label */
    .shortcut-desc {
      font-size: 0.875rem; /* text-sm */
      color: #94a3b8; /* text-slate-400 */
      font-family:
        system-ui,
        -apple-system,
        sans-serif; /* fallback logic for standard description strings */
    }

    /* Interactive Badge Elements Layout Wrapper */
    .keys-wrapper {
      display: flex;
      align-items: center;
      gap: 0.25rem; /* gap-1 */
      flex-shrink: 0; /* shrink-0 */
    }

    /* Contextual Text Label Badge */
    .context-badge {
      font-size: 10px; /* text-[10px] */
      background-color: #0f172a; /* bg-slate-900 */
      padding: 0.125rem 0.25rem; /* py-0.5 px-1 */
      border-radius: 0.25rem; /* rounded */
      color: #818cf8; /* text-indigo-400 */
      margin-right: 0.25rem; /* mr-1 */
      text-transform: uppercase; /* uppercase */
      font-weight: 700; /* font-bold */
    }

    /* Kbd key element markup block */
    .kbd-key {
      padding: 0.25rem 0.5rem; /* py-1 px-2 */
      background-color: #0f172a; /* bg-slate-900 */
      border: 1px solid #334155; /* border-slate-700 */
      border-radius: 0.25rem; /* rounded */
      font-size: 0.75rem; /* text-xs */
      font-weight: 700; /* font-bold */
      color: #818cf8; /* text-indigo-400 */
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.4); /* shadow shadow-black/40 */
    }

    /* Lower Exit Subtext info box */
    .footer-text {
      font-size: 11px; /* text-[11px] */
      color: #64748b; /* text-slate-500 */
      text-align: center; /* text-center */
      margin-top: 1.5rem; /* mt-6 */
    }
  `;

  constructor() {
    super();
    this.show = false;
    this.isGridView = false;
  }

  _handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  render() {
    if (!this.show) return "";

    const shortcuts = [
      { keys: ["Space"], desc: this.t("hkSearch") },
      { keys: ["#"], desc: this.t("hkToggleView") },
    ];

    if (!this.isGridView) {
      shortcuts.push({ keys: ["1", "-", "0"], desc: this.t("hkFavs") });
    }

    shortcuts.push(
      { keys: ["A-Z"], desc: this.t("hkCat") },
      { keys: ["A-Z"], desc: this.t("hkService"), context: true },
      { keys: [":"], desc: this.t("hkSearchEngines") },
      { keys: ["↑", "↓"], desc: this.t("hkNavigate") },
      { keys: ["ESC"], desc: this.t("hkReset") },
    );

    return html`
      <div @click="${() => (this.show = false)}" class="backdrop">
        <div @click="${(e) => e.stopPropagation()}" class="modal-box">
          <div class="header">
            <h3 class="title">
              <jk-icon icon="keyboard" class="title-icon"></jk-icon>
              ${this.t("helpTitle")}
            </h3>
            <button @click="${() => (this.show = false)}" class="close-btn">
              <jk-icon icon="x" class="close-icon"></jk-icon>
            </button>
          </div>

          <div class="shortcuts-list">
            ${shortcuts.map(
              (item) => html`
                <div class="shortcut-row">
                  <span class="shortcut-desc">${item.desc}</span>
                  <div class="keys-wrapper">
                    ${
                      item.context
                        ? html`<span class="context-badge"
                            >${this.t("contextInCat")}</span
                          >`
                        : ""
                    }
                    ${item.keys.map(
                      (k) => html`<kbd class="kbd-key">${k}</kbd>`,
                    )}
                  </div>
                </div>
              `,
            )}
          </div>

          <div class="footer-text">${this.t("helpExit")}</div>
        </div>
      </div>
    `;
  }
}

customElements.define("jk-help-modal", JkHelpModal);
