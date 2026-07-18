import { LitElement, html } from 'lit';
import './service-group.js';

// 1. Static styling dictionary isolating layouts from the rendering engine
const styles = {
  emptyState: `flex flex-col items-center justify-center py-16 text-slate-500`,
  emptyIcon: `size-10 mb-3 opacity-40`,
  emptyText: `text-sm`,
  singleCategoryWrapper: `animate-fadeIn transition-all duration-300`,
  fullDashboardWrapper: `space-y-5 sm:space-y-6 animate-fadeIn`,
};

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
    if (!this.categories || this.categories.length === 0) {
      return html`
        <div class="${styles.emptyState}">
          <jk-icon icon="folder-open" class="${styles.emptyIcon}"></jk-icon>
          <span class="${styles.emptyText}">
            ${this.t ? this.t('noServices') : 'No services'}
          </span>
        </div>
      `;
    }

    /*
      Single Category Mode
    */
    if (this.activeCategoryKey) {
      const activeGroup = this.categories.find(
        (category) => category.categoryKey === this.activeCategoryKey,
      );

      if (!activeGroup) {
        return html``;
      }

      return html`
        <div class="${styles.singleCategoryWrapper}">
          <jk-service-group
            .title=${activeGroup.category}
            .icon=${activeGroup.icon}
            .badgeText=${activeGroup.categoryKey}
            .services=${activeGroup.services}
          ></jk-service-group>
        </div>
      `;
    }

    /*
      Full Dashboard Mode
    */
    return html`
      <div class="${styles.fullDashboardWrapper}">
        ${this.categories.map(
          (cat) => html`
            <jk-service-group
              .title=${cat.category}
              .icon=${cat.icon}
              .badgeText=${cat.categoryKey}
              .services=${cat.services}
            ></jk-service-group>
          `,
        )}
      </div>
    `;
  }
}

customElements.define('jk-grid-view', JkGridView);
