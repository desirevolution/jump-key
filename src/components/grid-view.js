import { LitElement, html } from "lit";
import "./service-group.js";

export class JkGridView extends LitElement {
  createRenderRoot() {
    return this;
  }

  static properties = {
    categories: { type: Array },
    activeCategoryKey: { type: String },
    renderIcon: { type: Function },
    t: { type: Function },
  };

  render() {
    // Context A: Single selected active category layout
    if (this.activeCategoryKey) {
      const activeGroup = this.categories.find(
        (c) => c.categoryKey === this.activeCategoryKey,
      );
      if (!activeGroup) return html``;

      return html`
        <div class="animate-fadeIn">
          <jk-service-group
            .title=${activeGroup.category}
            .icon=${activeGroup.icon}
            .badgeText=${activeGroup.categoryKey}
            .services=${activeGroup.services}
            .renderIcon=${this.renderIcon}
          ></jk-service-group>
        </div>
      `;
    }

    // Context B: Full Expanded Grid layout across all categories
    return html`
      <div class="space-y-6 animate-fadeIn">
        ${this.categories.map(
          (cat) => html`
            <jk-service-group
              .title=${cat.category}
              .icon=${cat.icon}
              .badgeText=${cat.categoryKey}
              .services=${cat.services}
              .renderIcon=${this.renderIcon}
            ></jk-service-group>
          `,
        )}
      </div>
    `;
  }
}

customElements.define("jk-grid-view", JkGridView);
