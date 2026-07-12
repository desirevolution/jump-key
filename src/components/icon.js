import { LitElement, html } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { createIcons, icons } from "lucide";

createIcons({ icons });

class JkIcon extends LitElement {
  static properties = {
    icon: { type: String },
  };

  createRenderRoot() {
    return this;
  }

  render() {
    console.error("arthur %o", this.icon);
    if (/\.(png|jpe?g|svg|webp)$/i.test(this.icon)) {
      return html`
        <img
          src=./icons/${this.icon}
          alt=""
          class="${this.svgClass} object-contain"
        />
      `;
    }

    const node = this.icon && icons[this.toPascalCase(this.icon)];

    if (!node) {
      return null;
    }

    return html`${unsafeSVG(this.renderIcon(node))}`;
  }

  renderIcon(node) {
    const children = node
      .map(([tag, attrs]) => {
        const attributes = Object.entries(attrs)
          .map(([k, v]) => `${k}="${v}"`)
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
        class="${this.svgClass}"
      >
        ${children}
      </svg>
    `;
  }

  get svgClass() {
    if (!this.className.trim()) {
      return "w-6 h-6";
    }
    return `${this.className}`;
  }

  toPascalCase(name) {
    return name
      .split("-")
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join("");
  }
}

customElements.define("jk-icon", JkIcon);
