import { LitElement, html, css } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { createIcons, icons } from "lucide";

createIcons({ icons });

class JkIcon extends LitElement {
  static properties = {
    icon: { type: String },
  };

  // Shadow DOM Styles mapping the necessary layout & default fallbacks
  static styles = css`
    :host {
      /* Replicates default 'w-6 h-6' if width/height are not set externally */
      display: inline-block;
      width: var(--jk-icon-size, 1.5rem);
      height: var(--jk-icon-size, 1.5rem);
    }

    /* Style rule for both SVG and Image rendering pathways */
    .icon-core {
      display: block;
      width: 100%;
      height: 100%;
    }

    .object-contain {
      object-fit: contain;
    }
  `;

  render() {
    const isUrl = /^https?:\/\//i.test(this.icon);
    const isImageFile = /\.(png|jpe?g|svg|webp)$/i.test(this.icon);

    if (isUrl || isImageFile) {
      const imgSrc = isUrl ? this.icon : `./icons/${this.icon}`;

      return html`
        <img src="${imgSrc}" alt="" class="icon-core object-contain" />
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
        class="icon-core"
      >
        ${children}
      </svg>
    `;
  }

  toPascalCase(name) {
    return name
      .split("-")
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join("");
  }
}

customElements.define("jk-icon", JkIcon);
