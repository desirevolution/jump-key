import { html, LitElement } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import 'iconify-icon';
import { uiIcons } from '../icons/ui-icons.js';

const styles = {
  image: 'block object-contain',
  iconify: 'block',
  defaultIconSize: 'size-6',
};

const IMAGE_URL_PATTERN = /^(?:https?:\/\/|\/)/i;
const IMAGE_FILE_PATTERN = /\.(?:png|jpe?g|svg|webp|gif)(?:[?#].*)?$/i;
const ICONIFY_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export class JkIcon extends LitElement {
  static properties = {
    icon: { type: String },
    alt: { type: String },
    _loadedDynamicIcon: { state: true },
  };

  constructor() {
    super();
    this.icon = '';
    this.alt = '';
    this._loadedDynamicIcon = '';
  }

  createRenderRoot() {
    return this;
  }

  get hostClasses() {
    return this.getAttribute('class') || styles.defaultIconSize;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('icon')) {
      this._loadedDynamicIcon = '';
    }
  }

  parseIcon(value = this.icon) {
    const icon = value.trim();

    if (!icon) return { type: 'empty', name: '' };

    if (IMAGE_URL_PATTERN.test(icon) || IMAGE_FILE_PATTERN.test(icon)) {
      return { type: 'image', name: icon };
    }

    if (icon.startsWith('ui:')) {
      return { type: 'ui', name: icon.slice('ui:'.length) };
    }

    if (icon.startsWith('iconify:')) {
      return { type: 'dynamic', name: icon.slice('iconify:'.length) };
    }

    if (icon.startsWith('lucide:')) {
      return { type: 'dynamic', name: `lucide:${this.toKebabCase(icon.slice('lucide:'.length))}` };
    }

    // Backwards compatibility: unprefixed names are dynamic Lucide icons.
    return { type: 'dynamic', name: `lucide:${this.toKebabCase(icon)}` };
  }

  render() {
    const parsed = this.parseIcon();

    if (parsed.type === 'empty') return html``;

    if (parsed.type === 'image') {
      const src = IMAGE_URL_PATTERN.test(parsed.name) ? parsed.name : `./icons/${parsed.name}`;
      return html`<img src=${src} alt=${this.alt} class="${styles.image} ${this.hostClasses}" />`;
    }

    if (parsed.type === 'ui') {
      return this.renderUiIcon(parsed.name);
    }

    if (!ICONIFY_NAME_PATTERN.test(parsed.name)) {
      console.warn(`[jk-icon] Invalid dynamic icon name: ${parsed.name}`);
      return this.renderUiIcon('icon-fallback');
    }

    return this.renderDynamicIcon(parsed.name);
  }

  renderDynamicIcon(name) {
    const loaded = this._loadedDynamicIcon === name;

    return html`
      <span class="grid ${this.hostClasses}" aria-label=${this.alt || name}>
        <span class="col-start-1 row-start-1 ${loaded ? 'invisible' : ''}" aria-hidden="true">
          ${this.renderUiIcon('icon-fallback')}
        </span>
        <iconify-icon
          icon=${name}
          aria-hidden="true"
          class="${styles.iconify} col-start-1 row-start-1 ${loaded ? '' : 'invisible'} ${this.hostClasses}"
          @load=${() => this.handleDynamicIconLoad(name)}
        ></iconify-icon>
      </span>
    `;
  }

  handleDynamicIconLoad(name) {
    if (this.parseIcon().name === name) {
      this._loadedDynamicIcon = name;
    }
  }

  renderUiIcon(name) {
    const iconName = this.toKebabCase(name);
    const icon = uiIcons[iconName] || uiIcons['icon-fallback'];

    if (!uiIcons[iconName]) {
      console.warn(`[jk-icon] Unknown UI icon: ${name}`);
    }

    return html`${unsafeSVG(this.renderLucideIcon(icon))}`;
  }

  renderLucideIcon(icon) {
    const node = icon.node;
    const width = icon.width || icon.size || 24;
    const height = icon.height || icon.size || 24;
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
        viewBox="0 0 ${width} ${height}"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        role="img"
        aria-label="${this.escapeAttribute(this.alt || icon.name || '')}"
        class="${this.hostClasses}"
      >
        ${children}
      </svg>
    `;
  }

  toKebabCase(name) {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  escapeAttribute(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}

customElements.define('jk-icon', JkIcon);
