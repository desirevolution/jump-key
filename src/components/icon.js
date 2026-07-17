import { LitElement, html } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { createIcons, icons } from "lucide";

createIcons({ icons });

export class JkIcon extends LitElement {
  static properties = {
    icon: { type: String },
    alt: { type: String },
  };

  constructor() {
    super();

    this.icon = "";
    this.alt = "";
  }

  createRenderRoot() {
    return this;
  }

  render() {
    if (!this.icon) {
      return html``;
    }

    const isUrl = /^https?:\/\/|^\//i.test(this.icon);

    const isImageFile = /\.(png|jpe?g|svg|webp|gif)$/i.test(this.icon);

    if (isUrl || isImageFile) {
      const src = isUrl ? this.icon : `./icons/${this.icon}`;

      return html`
        <img
          src=${src}
          alt=${this.alt}
          class="
            block
            object-contain
            ${this.className}
          "
        />
      `;
    }

    const iconNode = icons[this.toPascalCase(this.icon)];

    if (!iconNode) {
      return html``;
    }

    return html` ${unsafeSVG(this.renderIcon(iconNode))} `;
  }

  renderIcon(node) {
    const children = node
      .map(([tag, attrs]) => {
        const attributes = Object.entries(attrs)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        return `<${tag} ${attributes}></${tag}>`;
      })
      .join("");

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="${this.className}"
      >
        ${children}
      </svg>
    `;
  }

  get className() {
    return this.getAttribute("class") || "size-6";
  }

  toPascalCase(name) {
    return name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }
}

customElements.define("jk-icon", JkIcon);
