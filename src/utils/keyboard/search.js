// utils/keyboard/search.js

import { getFilteredServices } from "../shortcuts.js";


/**
 * Keyboard-Steuerung innerhalb des Suchdialogs
 *
 * Verantwortlich für:
 * - ArrowUp / ArrowDown Navigation
 * - Enter Ausführung
 * - Suchmaschinen-Auswahl
 * - Service-Auswahl
 */
export function handleSearchKeyDown(e, app) {
  const items = buildSearchItems(app);

  if (items.length === 0) {
    return;
  }


  if (e.key === "ArrowDown") {
    e.preventDefault();

    app.selectedIndex =
      (app.selectedIndex + 1) % items.length;

    scrollSelected(app);

    return;
  }


  if (e.key === "ArrowUp") {
    e.preventDefault();

    app.selectedIndex =
      (app.selectedIndex - 1 + items.length) %
      items.length;

    scrollSelected(app);

    return;
  }


  if (e.key === "Enter") {
    e.preventDefault();

    const item =
      items[app.selectedIndex];

    if (item) {
      item.action();
    }
  }
}


/**
 * Erstellt die aktuell sichtbaren Suchaktionen
 */
function buildSearchItems(app) {

  const query =
    app.searchQuery.trim();


  const {
    engines,
    previewEngine,
    filteredServices,
  } =
    getSearchState(app);


  const items = [];


  /*
   * Suchmaschinen Vorschläge
   *
   * Beispiel:
   * :
   * :g
   * :github
   */
  engines.forEach((engine) => {

    items.push({
      type: "engine",

      action() {
        app.searchQuery =
          `:${engine.prefix} `;

        focusSearch(app);
      },
    });

  });


  /*
   * Fertige Suchmaschinen Anfrage
   */
  if (previewEngine) {

    items.push({

      type: "engine-execute",

      action() {

        const url =
          previewEngine.url.replace(
            "%s",
            encodeURIComponent(
              previewEngine.searchTerms,
            ),
          );


        window.open(
          url,
          "_blank",
        );


        app.resetInput(true);
      },
    });

  }


  /*
   * Normale Services
   */
  if (!query.startsWith(":")) {

    filteredServices.forEach((service) => {

      items.push({

        type: "service",

        action() {
          app.trackClick(service);
        },

      });

    });

  }


  return items;
}


/**
 * Berechnet den aktuellen Suchzustand
 */
function getSearchState(app) {

  const filteredServices =
    getFilteredServices(
      app.categories,
      app.searchQuery,
    );


  const result = {
    engines: [],
    previewEngine: null,
    filteredServices,
  };


  if (!app.searchQuery.startsWith(":")) {
    return result;
  }


  const command =
    app.searchQuery.substring(1);


  const space =
    command.indexOf(" ");


  /*
   * Noch keine Suchbegriffe:
   *
   * :g
   * :go
   */
  if (space === -1) {

    const prefix =
      command.toLowerCase();


    result.engines =
      app.searchEngines.filter(
        (engine) =>
          engine.prefix
            .toLowerCase()
            .startsWith(prefix),
      );


    return result;
  }


  /*
   * Fertiger Suchbefehl:
   *
   * :g hello world
   */
  const prefix =
    command
      .substring(0, space)
      .toLowerCase();


  const searchTerms =
    command.substring(space + 1);


  const engine =
    app.searchEngines.find(
      (item) =>
        item.prefix.toLowerCase() === prefix,
    );


  if (engine) {

    result.previewEngine = {
      ...engine,
      searchTerms,
    };

  }


  return result;
}


/**
 * Hält den ausgewählten Treffer sichtbar
 */
function scrollSelected(app) {

  setTimeout(() => {

    app
      .querySelector(
        ".search-item-active",
      )
      ?.scrollIntoView({
        block: "nearest",
      });

  }, 10);
}


/**
 * Fokus zurück ins Suchfeld
 */
function focusSearch(app) {

  setTimeout(() => {

    app
      .querySelector("#searchInput")
      ?.focus();

  }, 0);
}