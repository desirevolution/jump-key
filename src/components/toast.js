import { LitElement, html } from 'lit';

export class JkToast extends LitElement {
  createRenderRoot() {
    return this; // Nutzt dein globales Tailwind CSS
  }

  static properties = {
    message: { type: String },
    type: { type: String }, // 'success', 'error', 'warning'
    duration: { type: Number },
    show: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    this.message = '';
    this.type = 'success';
    this.duration = 2500;
    this.show = false;
    this._timer = null;
  }

  updated(changedProperties) {
    if (changedProperties.has('show') && this.show) {
      clearTimeout(this._timer);

      this._timer = setTimeout(() => {
        this.show = false;
        this.dispatchEvent(new CustomEvent('toast-closed', { bubbles: true, composed: true }));
      }, this.duration);
    }
  }

  render() {
    console.error('artjhi');
    // Dynamische Styles je nach Typ für Hintergrund und Text
    const typeStyles =
      {
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      }[this.type] || 'bg-slate-800 text-slate-200 border-slate-700';

    const iconMap =
      {
        success: 'check',
        error: 'alert-triangle',
        warning: 'info',
      }[this.type] || 'info';

    // Das Element bleibt immer im DOM, wird aber über opacity-0 / opacity-100 gesteuert.
    // pointer-events-none sorgt dafür, dass er im unsichtbaren Zustand keine Klicks blockiert.
    return html`
      <div
        class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm shadow-xl shadow-slate-950/40 backdrop-blur-md transition-all duration-300 transform
        ${this.show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}
        ${typeStyles}"
      >
        <jk-icon icon="${iconMap}" class="size-4 shrink-0"></jk-icon>
        <span class="whitespace-nowrap">${this.message}</span>
      </div>
    `;
  }
}

customElements.define('jk-toast', JkToast);
