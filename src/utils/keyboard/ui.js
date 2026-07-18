/**
 * UI Keyboard Actions
 *
 * Verantwortlich für:
 * - Modale Zustände
 * - Views wechseln
 * - Reset
 * - visuelles Feedback
 */


/**
 * Suche öffnen
 */
export function openSearch(app) {
  app.showHelp = false;

  app.showSearch = true;

  app.selectedIndex = 0;


  window.history.pushState(
    {
      view: "search",
    },
    "",
  );


  setTimeout(() => {
    app.querySelector("#searchInput")?.focus();
  }, 100);
}


/**
 * Hilfe öffnen
 */
export function openHelp(app) {
  app.showSearch = false;

  app.showHelp = true;
}


/**
 * Hilfe schließen
 */
export function closeHelp(app) {
  app.showHelp = false;
}


/**
 * Konfiguration öffnen
 */
export function openConfig(app) {
  app.showConfigModal = true;
}


/**
 * Konfiguration schließen
 */
export function closeConfig(app) {
  app.showConfigModal = false;
}


/**
 * Zwischen Grid/List wechseln
 */
export function toggleViewMode(app) {

  app.isGridView =
    !app.isGridView;


  localStorage.setItem(
    "dashboard_grid_view",
    JSON.stringify(app.isGridView),
  );


  resetInput(app);
}


/**
 * Alle temporären UI-Zustände zurücksetzen
 */
export function resetInput(
  app,
  updateHistory = true,
) {

  app.activeCategoryKey = "";

  app.currentInput = "";

  app.isInvalidInput = false;

  app.isValidInput = false;

  app.showSearch = false;

  app.showHelp = false;

  app.searchQuery = "";

  app.selectedIndex = 0;


  if (updateHistory) {

    if (
      window.history.state?.view === "category" ||
      window.history.state?.view === "search"
    ) {

      window.history.back();

    }

  }
}


/**
 * Reset Timer
 */
export function startResetTimer(
  app,
  duration = 3000,
) {

  clearTimeout(
    app.resetTimeout,
  );


  app.resetTimeout = setTimeout(
    () => resetInput(app),
    duration,
  );
}


/**
 * KeyBadge Status setzen
 */
export function setInputState(
  app,
  value,
  {
    valid = false,
    invalid = false,
  } = {},
) {

  app.currentInput = value;

  app.isValidInput = valid;

  app.isInvalidInput = invalid;

  app.requestUpdate();
}