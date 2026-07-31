import { html, LitElement } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { lucideDynamicIconImports } from '@lucide/icons/dynamic';
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
    _lucideIcon: { state: true },
  };

  constructor() {
    super();
    this.icon = '';
    this.alt = '';
    this._lucideIcon = null;
    this._loadId = 0;
  }

  createRenderRoot() {
    return this;
  }

  get hostClasses() {
    return this.getAttribute('class') || styles.defaultIconSize;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('icon')) {
      this.loadLucideIcon();
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

    if (icon.startsWith('lucide:')) {
      return { type: 'lucide', name: icon.slice('lucide:'.length) };
    }

    if (icon.startsWith('iconify:')) {
      return { type: 'iconify', name: icon.slice('iconify:'.length) };
    }

    // Backwards compatibility: unprefixed icon names are Lucide icons.
    return { type: 'lucide', name: icon };
  }

  async loadLucideIcon() {
    const loadId = ++this._loadId;
    const parsed = this.parseIcon();

    this._lucideIcon = null;

    if (parsed.type !== 'lucide' || !parsed.name) return;

    const iconName = this.toKebabCase(parsed.name);
    const loadIcon = lucideDynamicIconImports[iconName];

    if (!loadIcon) {
      console.warn(`[jk-icon] Unknown Lucide icon: ${parsed.name}`);
      return;
    }

    try {
      const importedIcon = await loadIcon();
      const icon = this.normalizeLucideIcon(importedIcon);

      if (!icon) {
        throw new TypeError(`Invalid Lucide icon data for: ${parsed.name}`);
      }

      if (loadId === this._loadId) {
        this._lucideIcon = icon;
      }
    } catch (error) {
      if (loadId === this._loadId) {
        console.warn(`[jk-icon] Could not load Lucide icon: ${parsed.name}`, error);
      }
    }
  }

  render() {
    const parsed = this.parseIcon();

    if (parsed.type === 'empty') return html``;

    if (parsed.type === 'image') {
      const src = IMAGE_URL_PATTERN.test(parsed.name) ? parsed.name : `./icons/${parsed.name}`;
      return html`<img src=${src} alt=${this.alt} class="${styles.image} ${this.hostClasses}" />`;
    }

    if (parsed.type === 'ui') {
      const icon = uiIcons[this.toKebabCase(parsed.name)];

      if (!icon) {
        console.warn(`[jk-icon] Unknown UI icon: ${parsed.name}`);
        return html``;
      }

      return html`${unsafeSVG(this.renderLucideIcon(icon))}`;
    }

    if (parsed.type === 'iconify') {
      if (!ICONIFY_NAME_PATTERN.test(parsed.name)) {
        console.warn(`[jk-icon] Invalid Iconify icon name: ${parsed.name}`);
        return html``;
      }

      return html`<iconify-icon
        icon=${parsed.name}
        aria-label=${this.alt || parsed.name}
        class="${styles.iconify} ${this.hostClasses}"
      ></iconify-icon>`;
    }

    if (!this._lucideIcon) return html``;

    return html`${unsafeSVG(this.renderLucideIcon(this._lucideIcon))}`;
  }

  normalizeLucideIcon(importedIcon) {
    const candidates = [
      importedIcon,
      importedIcon?.default,
      ...Object.values(importedIcon || {}),
    ];

    return candidates.find((candidate) => Array.isArray(candidate?.node)) || null;
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
