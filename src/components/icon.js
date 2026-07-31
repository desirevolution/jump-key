import { html, LitElement } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { loadIcon } from 'iconify-icon';
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
    _dynamicIconName: { state: true },
    _dynamicIconData: { state: true },
    _dynamicIconStatus: { state: true },
  };

  constructor() {
    super();
    this.icon = '';
    this.alt = '';
    this._dynamicIconName = '';
    this._dynamicIconData = null;
    this._dynamicIconStatus = 'idle';
    this._dynamicIconRequestId = 0;
  }

  createRenderRoot() {
    return this;
  }

  get hostClasses() {
    return this.getAttribute('class') || styles.defaultIconSize;
  }

  updated(changedProperties) {
    if (changedProperties.has('icon')) {
      this.loadDynamicIcon();
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

  async loadDynamicIcon() {
    const parsed = this.parseIcon();
    const requestId = ++this._dynamicIconRequestId;

    this._dynamicIconName = '';
    this._dynamicIconData = null;
    this._dynamicIconStatus = 'idle';

    if (parsed.type !== 'dynamic') return;

    if (!ICONIFY_NAME_PATTERN.test(parsed.name)) {
      console.warn(`[jk-icon] Invalid dynamic icon name: ${parsed.name}`);
      this._dynamicIconStatus = 'error';
      return;
    }

    this._dynamicIconName = parsed.name;
    this._dynamicIconStatus = 'loading';

    try {
      const data = await loadIcon(parsed.name);

      if (requestId !== this._dynamicIconRequestId || this.parseIcon().name !== parsed.name) {
        return;
      }

      this._dynamicIconData = data;
      this._dynamicIconStatus = 'loaded';
    } catch (error) {
      if (requestId !== this._dynamicIconRequestId) return;

      this._dynamicIconStatus = 'error';
      console.warn(`[jk-icon] Could not load Iconify icon: ${parsed.name}`, error);
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
      return this.renderUiIcon(parsed.name);
    }

    if (!ICONIFY_NAME_PATTERN.test(parsed.name)) {
      return this.renderUiIcon('icon-fallback');
    }

    return this.renderDynamicIcon(parsed.name);
  }

  renderDynamicIcon(name) {
    const loaded =
      this._dynamicIconStatus === 'loaded' &&
      this._dynamicIconName === name &&
      this._dynamicIconData;

    if (!loaded) {
      return this.renderUiIcon('icon-fallback');
    }

    return html`
      <iconify-icon
        .icon=${this._dynamicIconData}
        width="100%"
        height="100%"
        aria-hidden="true"
        class="${styles.iconify} ${this.hostClasses}"
      ></iconify-icon>
    `;
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
