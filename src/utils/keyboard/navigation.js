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
    const favService = findFavoriteByKey(key, app);

    if (favService) {
      app.currentInput = key.toUpperCase();
      app.trackClick(favService, true);
      return;
    }
  }


  // Kategorie prüfen
  const category = app.categories.find(
    (cat) => cat.categoryKey === key,
  );


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
  app.currentInput += ` → ${key.toUpperCase()}`;


  const category = app.categories.find(
    (cat) => cat.categoryKey === app.activeCategoryKey,
  );


  const service = category?.services?.find(
    (service) => service.key === key,
  );


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
      view: "category",
      key: category.categoryKey,
    },
    "",
  );
}


/**
 * Favorit anhand Shortcut-Key suchen
 */
function findFavoriteByKey(key, app) {
  return Object.entries(app.favorites)
    .find(([slot]) => slot === key)
    ? getFavoriteService(key, app)
    : null;
}


/**
 * Favorit-Service aus Kategorien auflösen
 *
 * favorites speichert aktuell nur Namen,
 * daher muss die Kategorie-Struktur durchsucht werden.
 */
function getFavoriteService(slot, app) {
  const favoriteName = app.favorites[slot];

  if (!favoriteName) return null;


  for (const category of app.categories) {
    const service = category.services?.find(
      (s) => s.name === favoriteName,
    );

    if (service) {
      return service;
    }
  }


  return null;
}


/**
 * Fehlerfeedback
 */
function showInvalidInput(key, app) {
  app.currentInput = app.currentInput
    ? `${app.currentInput} → ${key.toUpperCase()}`
    : key.toUpperCase();


  app.isInvalidInput = true;

  app.startResetTimer(1500);
}