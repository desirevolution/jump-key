/**
 * Globale Keyboard Shortcuts
 *
 * Verantwortlich für:
 * - globale Tastaturzustände
 * - Delegation an:
 *   - ui.js
 *   - favorites.js
 *   - search.js
 *   - navigation.js
 */

import {
  handleFavoriteShortcut,
  handleFavoriteRecordingInput,
} from "./favorites.js";

import {
  handleSearchKeyDown,
} from "./search.js";

import {
  handleNavigationKeyDown,
} from "./navigation.js";

import {
  openSearch,
  openHelp,
  openConfig,
  toggleViewMode,
  resetInput,
} from "./ui.js";


export function handleGlobalKeyDown(e, app) {

  /*
   * Ctrl + Zahl
   *
   * Favoriten Shortcut
   */
  if (
    e.ctrlKey &&
    /^[0-9]$/.test(e.key)
  ) {
    e.preventDefault();

    handleFavoriteShortcut(
      e.key,
      app,
    );

    return;
  }


  /*
   * Andere Modifier ignorieren
   *
   * Ausnahme:
   * Ctrl + ,
   */
  if (
    (e.ctrlKey && e.key !== ",") ||
    e.altKey ||
    e.metaKey
  ) {
    return;
  }


  /*
   * Escape
   */
  if (e.key === "Escape") {

    if (app.showConfigModal) {

      app.showConfigModal = false;

      return;
    }


    if (app.favoriteRecording) {

      app.favoriteRecording = null;

      resetInput(app);

      return;
    }


    resetInput(app);

    return;
  }


  /*
   * Config Modal blockiert globale Shortcuts
   */
  if (app.showConfigModal) {
    return;
  }


  /*
   * Search besitzt eigene Tastatursteuerung
   */
  if (app.showSearch) {

    handleSearchKeyDown(
      e,
      app,
    );

    return;
  }


  /*
   * Help schließen
   */
  if (app.showHelp) {

    e.preventDefault();

    app.showHelp = false;

    return;
  }


  /*
   * Keine Shortcuts in Eingabefeldern
   */
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA"
  ) {
    return;
  }


  /*
   * Favorit-Aufnahme
   *
   * Ctrl+1
   * Kategorie
   * Service
   */
  if (app.favoriteRecording) {

    if (
      e.key.length === 1 &&
      /^[a-z]$/i.test(e.key)
    ) {

      handleFavoriteRecordingInput(
        e.key.toLowerCase(),
        app,
      );

    } else {

      app.favoriteRecording = null;

      resetInput(app);

    }

    return;
  }


  /*
   * Hilfe
   */
  if (e.key === "?") {

    e.preventDefault();

    openHelp(app);

    return;
  }


  /*
   * Config öffnen
   */
  if (
    e.ctrlKey &&
    e.key === ","
  ) {

    e.preventDefault();

    openConfig(app);

    return;
  }


  /*
   * Suche öffnen
   */
  if (
    e.key === " " ||
    e.key === "Spacebar"
  ) {

    e.preventDefault();

    openSearch(app);

    return;
  }


  /*
   * Grid/List Umschalten
   */
  if (
    e.key === "#" &&
    !app.activeCategoryKey
  ) {

    e.preventDefault();

    toggleViewMode(app);

    return;
  }


  /*
   * Kategorie / Service Navigation
   */
  if (
    e.key.length === 1
  ) {

    handleNavigationKeyDown(
      e.key.toLowerCase(),
      app,
    );

  }
}