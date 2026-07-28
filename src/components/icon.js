import { html, LitElement } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

const styles = {
  image: `block object-contain`,
  defaultIconSize: `size-6`,
};

// Module-level cache for icon dictionary
let lucideIcons = null;

export class JkIcon extends LitElement {
  static properties = {
    icon: { type: String },
    alt: { type: String },
    _iconNode: { state: true }, // Triggers re-render when loaded
  };

  constructor() {
    super();
    this.icon = '';
    this.alt = '';
    this._iconNode = null;
  }

  createRenderRoot() {
    return this;
  }

  get hostClasses() {
    return this.getAttribute('class') || styles.defaultIconSize;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('icon')) {
      this.loadIconNode();
    }
  }

  async loadIconNode() {
    if (!this.icon) return;

    const isUrl = /^https?:\/\/|^\//i.test(this.icon);
    const isImageFile = /\.(png|jpe?g|svg|webp|gif)$/i.test(this.icon);

    if (isUrl || isImageFile) return;

    // Dynamically import the icons dictionary on demand
    if (!lucideIcons) {
      const module = await import('lucide');
      lucideIcons = module.icons;
    }

    const pascalName = this.toPascalCase(this.icon);
    this._iconNode = lucideIcons[pascalName] || null;
  }

  render() {
    if (!this.icon) return html``;

    const isUrl = /^https?:\/\/|^\//i.test(this.icon);
    const isImageFile = /\.(png|jpe?g|svg|webp|gif)$/i.test(this.icon);

    if (isUrl || isImageFile) {
      const src = isUrl ? this.icon : `./icons/${this.icon}`;
      return html` <img src=${src} alt=${this.alt} class="${styles.image} ${this.hostClasses}" /> `;
    }

    if (!this._iconNode) return html``;

    return html`${unsafeSVG(this.renderIcon(this._iconNode))}`;
  }

  renderIcon(node) {
    const children = node
      .map(([tag, attrs]) => {
        const attributes = Object.entries(attrs)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ');
        return `<${tag} ${attributes}></${tag}>`;
      })
      .join('');

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="${this.hostClasses}"
      >
        ${children}
      </svg>
    `;
  }

  toPascalCase(name) {
    return name
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }
}

customElements.define('jk-icon', JkIcon);
