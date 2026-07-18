export function createKeyboardContext(app) {
  return {
    app,

    get categories() {
      return app.categories;
    },

    get searchEngines() {
      return app.searchEngines;
    },

    get favorites() {
      return app.favorites;
    },

    get searchQuery() {
      return app.searchQuery;
    },

    set searchQuery(value) {
      app.searchQuery = value;
    },

    get selectedIndex() {
      return app.selectedIndex;
    },

    set selectedIndex(value) {
      app.selectedIndex = value;
    },

    get activeCategoryKey() {
      return app.activeCategoryKey;
    },

    set activeCategoryKey(value) {
      app.activeCategoryKey = value;
    },

    get showSearch() {
      return app.showSearch;
    },

    set showSearch(value) {
      app.showSearch = value;
    },

    get favoriteRecording() {
      return app.favoriteRecording;
    },

    set favoriteRecording(value) {
      app.favoriteRecording = value;
    },

    // Actions
    resetInput: (...args) => app.resetInput(...args),

    openSearch: () => app.openSearch(),

    toggleViewMode: () => app.toggleViewMode(),

    trackClick: (service) => app.trackClick(service),

    startResetTimer: (...args) => app.startResetTimer(...args),

    showToast: (...args) => app.showToast(...args),

    requestUpdate() {
      app.requestUpdate();
    },

    t(key) {
      return app.t(key);
    },
  };
}
