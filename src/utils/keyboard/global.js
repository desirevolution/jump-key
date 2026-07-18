/**
 * Globale Keyboard Shortcuts
 *
 * Verantwortlich für:
 * - globale Tastaturzustände
 * - Delegation an:
 *   - favorites.js
 *   - search.js
 *   - navigation.js
 */

import {
  handleFavoriteRecordingInput,
  handleFavoriteShortcut,
} from './favorites.js';

import { handleSearchKeyDown } from './search.js';

import { handleNavigationKeyDown } from './navigation.js';

export function handleGlobalKeyDown(e, app) {
  /*
   * Ctrl + Zahl
   *
   * Favoriten Shortcut
   */
  if (e.ctrlKey && /^[0-9]$/.test(e.key)) {
    e.preventDefault();

    handleFavoriteShortcut(e.key, app);

    return;
  }

  /*
   * Andere Modifier ignorieren
   */
  if ((e.ctrlKey && e.key !== ',') || e.altKey || e.metaKey) {
    return;
  }

  /*
   * Escape
   */
  if (e.key === 'Escape') {
    if (app.showConfigModal) {
      app.showConfigModal = false;
      return;
    }

    if (app.favoriteRecording) {
      app.favoriteRecording = null;
    }

    app.resetInput(true);

    return;
  }

  /*
   * Config Modal blockiert globale Shortcuts
   */
  if (app.showConfigModal) {
    return;
  }

  /*
   * Search Navigation
   */
  if (app.showSearch) {
    handleSearchKeyDown(e, app);
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
   * Keine Shortcuts in Inputs
   */
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  /*
   * Favorit Aufnahme
   */
  if (app.favoriteRecording) {
    if (e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
      handleFavoriteRecordingInput(e.key.toLowerCase(), app);
    } else {
      app.favoriteRecording = null;
      app.resetInput(true);
    }

    return;
  }

  /*
   * Hilfe
   */
  if (e.key === '?') {
    e.preventDefault();

    app.showHelp = true;

    return;
  }

  /*
   * Config öffnen
   */
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();

    app.showConfigModal = true;

    return;
  }

  /*
   * Suche öffnen
   */
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();

    app.openSearch();

    return;
  }

  /*
   * Grid/List Umschalten
   */
  if (e.key === '#' && !app.activeCategoryKey) {
    e.preventDefault();

    app.toggleViewMode();

    return;
  }

  /*
   * Navigation
   */
  if (e.key.length === 1) {
    handleNavigationKeyDown(e.key.toLowerCase(), app);
  }
}
