import { html } from 'lit';
import { categorySelectionKey } from '../utils/shortcuts.js';

// Pure presentation layer. DashboardApp owns state and handles actions.
const mainContentStyle = 'w-full pt-4 pb-6 md:pt-8';

export function renderDashboardContent(app, { favs, continueServices, categoriesWithFavorites, showMain }) {
  return html`
      <main ?inert=${app.workspaceLoading} class="${mainContentStyle}" @service-actions=${e => {
        app.cancelPendingAction();
        app.cancelInputResetTimer();
        app.actionAnchor = e.detail.anchor;
        app.categoryActionIndex = null;
        if (e.detail.id?.startsWith('cat:')) {
          const key = e.detail.id.slice(4);
          const index = app.categories.findIndex(category => categorySelectionKey(category) === key);
          if (index < 0 || app.readOnly) return;
          app.categoryActionIndex = index;
          app.actionService = { name: app.categories[index].category, id: e.detail.id };
        } else {
          app.actionService = app.categories.flatMap(c => c.services).find(s => s.id === e.detail.id);
        }
      }}>
        ${app.activeCategoryKey || app.showContinueView ? html`<button type="button" class="mb-3 flex min-h-11 items-center gap-2 text-sm text-indigo-300" @click=${()=>app.resetNavigationInput(true)}><jk-icon icon="ui:arrow-left" class="size-4"></jk-icon>${app.t('backOverview')}</button>${app.categoryCountdown ? html`<div class="mb-3 h-0.5 w-40 overflow-hidden rounded bg-slate-700" aria-hidden="true"><div data-category-countdown class="h-full origin-left bg-indigo-400"></div></div>` : ''}` : ''}
        ${
          showMain && !app.isGridView
            ? html`
                <jk-favorites-view
                  .favorites=${favs}
                  .t=${app.t}
                  @service-click=${(e) => {
                    app.trackClick(e.detail.service, {
                      openInSameTab: e.detail.shiftKey,
                      keyboardFeedback: false,
                    });
                  }}
                  @clear-favorites=${app.clearFavorites}
                  @delete-favorite-slot=${(e) => {
                    app.handleDeleteFavoriteSlot(e.detail.slot);
                  }}
                ></jk-favorites-view>

                <jk-service-group
                  title="${app.t('categories')}"
                  .highlightKeys=${true}
                  icon="ui:folder"
                  .services=${[
                    ...(continueServices.length
                      ? [
                          {
                            name: app.t('continue'),
                            url: `${continueServices.length} ${app.t('serviceCount')}`,
                            icon: 'ui:history',
                            key: '⇧-',
                            type: 'continue',
                            isCategory: true,
                          },
                        ]
                      : []),
                    ...app.categories.map((cat) => ({
                      navigationKey: categorySelectionKey(cat),
                      name: cat.category,
                      url: `${cat.services?.length ?? 0} ${app.t('serviceCount')}`,
                      icon: cat.icon,
                      key: cat.categoryKey,
                      type: 'category',
                      isCategory: true,
                    })),
                  ]}
                  @service-click=${(e) => {
                    const item = e.detail.service;
                    if (item.type === 'continue') {
                      app.openContinueView();
                      return;
                    }

                    const key = item.navigationKey;
                    app.activeCategoryKey = key;
                    app.showContinueView = false;
                    app.currentInput = item.key?.toUpperCase() || '';

                    app.cancelInputResetTimer();

                    window.history.pushState({ view: 'category', key }, '');
                  }}
                  @card-long-press=${app.handleCardLongPress}
                ></jk-service-group>
              `
            : app.showContinueView
              ? html`
                  <jk-favorites-view
                    .favorites=${[]}
                    .continueServices=${continueServices}
                    .t=${app.t}
                    @continue-click=${(e) => {
                      app.trackClick(e.detail.service, {
                        updateContinue: false,
                        openInSameTab: e.detail.shiftKey,
                        keyboardFeedback: false,
                      });
                    }}
                    @clear-continue=${app.clearContinue}
                    @delete-continue-entry=${(e) => {
                      app.removeContinueService(e.detail.service);
                    }}
                  ></jk-favorites-view>
                `
              : html`
                <jk-grid-view
                  .categories=${categoriesWithFavorites}
                  .collapsed=${app.collapsedCategories}
                  .canReorder=${false}
                  @toggle-category=${e=>app.toggleCategory(e.detail)}
                  .activeCategoryKey=${app.activeCategoryKey}
                  .t=${app.t}
                  @service-click=${(e) => {
                    app.trackClick(e.detail.service, {
                      openInSameTab: e.detail.shiftKey,
                      keyboardFeedback: false,
                    });
                  }}
                  @card-long-press=${(e) => {
                    app.handleServiceLongPress(e.detail.service);
                  }}
                ></jk-grid-view>
              `
        }
      </main>
  `;
}
