import { getFilteredServices, getTopFavorites } from './shortcuts.js';

/**
 * Verarbeitet die globalen Tastatureingaben für die Dashboard-App
 */
export function handleGlobalKeyDown(e, app) {
  if ((e.ctrlKey && e.key !== ',') || e.altKey || e.metaKey) {
    return;
  }

  if (e.key === 'Escape') {
    if (app.showConfigModal) {
      app.showConfigModal = false;
      return;
    }
    app.resetInput(true);
    return;
  }

  if (app.showConfigModal) return;

  if (app.showSearch) {
    handleSearchKeyDown(e, app);
    return;
  }

  if (app.showHelp) {
    e.preventDefault();
    app.showHelp = false;
    return;
  }

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === '?') {
    e.preventDefault();
    app.showHelp = true;
    return;
  }
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    app.showConfigModal = true;
    return;
  }
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    app.openSearch();
    return;
  }
  if (e.key === '#' && !app.activeCategoryKey) {
    e.preventDefault();
    app.toggleViewMode();
    return;
  }

  if (e.key.length === 1) {
    handleNavigationKeyDown(e.key.toLowerCase(), app);
  }
}

/**
 * Steuert die Tastaturnavigation innerhalb des geöffneten Suchfensters
 */
function handleSearchKeyDown(e, app) {
  const filtered = getFilteredServices(app.categories, app.searchQuery);
  const queryTrimmed = app.searchQuery.trim();
  const showAllEngines = queryTrimmed === ':';

  let matchedEngine = null;
  let searchTermsPreview = '';
  let candidateEngines = [];
  let isFilteringEngines = false;
  let showPreviewBlock = false;

  if (app.searchQuery.startsWith(':')) {
    const commandString = app.searchQuery.substring(1);
    const firstSpaceIndex = commandString.indexOf(' ');

    if (firstSpaceIndex !== -1) {
      const prefix = commandString.substring(0, firstSpaceIndex).toLowerCase();
      searchTermsPreview = commandString.substring(firstSpaceIndex + 1);
      matchedEngine = app.searchEngines.find((eng) => eng.prefix.toLowerCase() === prefix);
      if (matchedEngine) showPreviewBlock = true;
    } else {
      isFilteringEngines = true;
      const currentPrefixToken = commandString.toLowerCase();
      candidateEngines = app.searchEngines.filter((eng) =>
        eng.prefix.toLowerCase().startsWith(currentPrefixToken),
      );
    }
  }

  const enginesToRender = showAllEngines
    ? app.searchEngines
    : isFilteringEngines
      ? candidateEngines
      : [];

  const items = [];
  enginesToRender.forEach((engine) => {
    items.push({
      action: () => {
        app.searchQuery = `:${engine.prefix} `;
        app.searchInput?.focus();
      },
    });
  });

  if (showPreviewBlock) {
    items.push({
      action: () => {
        const finalUrl = matchedEngine.url.replace(
          '%s',
          encodeURIComponent(searchTermsPreview.trim()),
        );
        window.open(finalUrl, '_blank');
        app.resetInput(true);
      },
    });
  }

  if (!showAllEngines) {
    filtered.forEach((service) => {
      items.push({
        action: () => app.trackClick(service),
      });
    });
  }

  const totalItems = items.length;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (totalItems > 0) {
      app.selectedIndex = (app.selectedIndex + 1) % totalItems;
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (totalItems > 0) {
      app.selectedIndex = (app.selectedIndex - 1 + totalItems) % totalItems;
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const item = items[app.selectedIndex];
    if (item) item.action();
  }
}

/**
 * Steuert das Anspringen von Kategorien und Favoriten per Kürzel
 */
function handleNavigationKeyDown(key, app) {
  if (!app.activeCategoryKey) {
    if (/^[0-9]$/.test(key) && !app.isGridView) {
      const favService = getTopFavorites(app.categories, app.favorites).find((s) => s.key === key);
      if (favService) {
        app.currentInput = key.toUpperCase();
        app.trackClick(favService, true);
        return;
      }
    }

    if (app.categories.some((c) => c.categoryKey === key)) {
      app.activeCategoryKey = key;
      app.currentInput = key.toUpperCase();
      app.isInvalidInput = false;
      app.startResetTimer();
      window.history.pushState({ view: 'category', key }, '');
    } else {
      app.currentInput = key.toUpperCase();
      app.isInvalidInput = true;
      app.startResetTimer(1500);
    }
    return;
  }

  app.currentInput += ` → ${key.toUpperCase()}`;
  const cat = app.categories.find((c) => c.categoryKey === app.activeCategoryKey);
  const service = cat?.services?.find((s) => s.key === key);

  if (service) {
    app.isInvalidInput = false;
    app.trackClick(service);
  } else {
    app.isInvalidInput = true;
    app.startResetTimer(1500);
  }
}
