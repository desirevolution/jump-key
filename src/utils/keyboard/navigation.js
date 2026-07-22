import { getFavoriteService } from '../shortcuts.js';

/**
 * Navigation innerhalb des Dashboards
 *
 * Verantwortlich für:
 * - Kategorie auswählen
 * - Service innerhalb einer Kategorie auswählen
 * - Favoriten per Zahl ausführen
 */

export function handleNavigationKeyDown(key, app) {
  // Hauptansicht:
  // Kategorie oder Favorit auswählen
  if (!app.activeCategoryKey) {
    handleRootNavigation(key, app);
    return;
  }

  // Kategorieansicht:
  // Service auswählen
  handleCategoryNavigation(key, app);
}

/**
 * Navigation auf Root-Ebene
 *
 * Eingaben:
 * - 0-9 -> Favoriten
 * - A-Z -> Kategorien
 */
function handleRootNavigation(key, app) {
  // Favoriten prüfen
  if (/^[0-9]$/.test(key)) {
    const favService = getFavoriteService(app.categories, app.favorites, key);

    if (favService) {
      app.currentInput = key.toUpperCase();
      app.trackClick(favService, true);
      return;
    }
  }

  // Kategorie prüfen
  const category = app.categories.find((cat) => cat.categoryKey === key);

  if (category) {
    openCategory(category, app);
    return;
  }

  // Ungültige Eingabe
  showInvalidInput(key, app);
}

/**
 * Navigation innerhalb einer Kategorie
 */
function handleCategoryNavigation(key, app) {
  // Baut den String sauber als "KAT → SERVICE" auf (ohne doppelte Pfeile)
  app.currentInput = `${app.activeCategoryKey.toUpperCase()} → ${key.toUpperCase()}`;

  const category = app.categories.find(
    (cat) => cat.categoryKey === app.activeCategoryKey
  );

  const service = category?.services?.find((service) => service.key === key);

  if (service) {
    app.isInvalidInput = false;
    app.trackClick(service);
    return;
  }

  showInvalidInput(key, app);
}

/**
 * Kategorie öffnen
 */
function openCategory(category, app) {
  app.activeCategoryKey = category.categoryKey;

  app.currentInput = category.categoryKey.toUpperCase();

  app.isInvalidInput = false;

  app.startResetTimer();

  window.history.pushState(
    {
      view: 'category',
      key: category.categoryKey,
    },
    ''
  );
}

/**
 * Fehlerfeedback
 */
function showInvalidInput(key, app) {
  // Falls bereits eine Kategorie aktiv ist, behalten wir die Struktur "KAT → FALSCH" bei
  if (app.activeCategoryKey) {
    app.currentInput = `${app.activeCategoryKey.toUpperCase()} → ${key.toUpperCase()}`;
  } else {
    app.currentInput = key.toUpperCase();
  }

  app.isInvalidInput = true;
  app.startResetTimer(1500);
}
