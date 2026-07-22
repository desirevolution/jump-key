import { writeJsonStorage } from '../storage.js';

const FAVORITES_STORAGE_KEY = 'dashboard_favs';

/**
 * Favoriten Keyboard Handling
 *
 * Verantwortlich für:
 * - Favoriten Shortcut Verwaltung
 * - Favoriten aufnehmen
 * - Favoriten löschen
 * - Favoriten speichern
 */

/**
 * Ctrl + Zahl Verarbeitung
 */
export function handleFavoriteShortcut(slot, app) {
  const existing = app.favorites[slot];

  // Favorit existiert -> löschen anbieten
  if (existing) {
    requestFavoriteDelete(slot, app);
    return;
  }

  // Aufnahme starten
  startFavoriteRecording(slot, app);
}

/**
 * Favorit löschen
 */
function requestFavoriteDelete(slot, app) {
  app.showToast(
    `"${app.favorites[slot]}" ${app.t('favRemoved', { slot })}`,
    'info'
  );

  const { [slot]: _removed, ...remainingFavorites } = app.favorites;
  app.favorites = remainingFavorites;
  saveFavorites(app);
}

/**
 * Aufnahme eines neuen Favoriten starten
 */
function startFavoriteRecording(slot, app) {
  app.favoriteRecording = {
    slot,
    step: 0,
    categoryKey: '',
  };

  const favLabel = app.t('favLabel') || 'FAV';
  const selectCategoryText = app.t('selectCategory') || 'Kategorie wählen';

  app.currentInput = `${favLabel} ${slot}: ${selectCategoryText}`;

  app.requestUpdate();
}

/**
 * Eingabe während Favoriten-Aufnahme
 *
 * Ablauf:
 *
 * Ctrl+1
 *   ↓
 * Kategorie Taste
 *   ↓
 * Service Taste
 */
export function handleFavoriteRecordingInput(key, app) {
  const recording = app.favoriteRecording;

  if (!recording) return;

  // Schritt 1:
  // Kategorie suchen
  if (recording.step === 0) {
    handleFavoriteCategory(key, recording, app);
    return;
  }

  // Schritt 2:
  // Service suchen
  handleFavoriteService(key, recording, app);
}

/**
 * Kategorie auswählen
 */
function handleFavoriteCategory(key, recording, app) {
  const category = app.categories.find((cat) => cat.categoryKey === key);

  if (!category) {
    cancelRecording(app);
    return;
  }

  recording.categoryKey = key;
  recording.step = 1;

  // optional:
  // Kategorie anzeigen während Aufnahme
  app.activeCategoryKey = key;

  const favLabel = app.t('favLabel') || 'FAV';
  const serviceLabel = app.t('serviceLabel') || 'Service';

  app.currentInput = `${favLabel} ${recording.slot}: ${key.toUpperCase()} → ${serviceLabel}`;

  app.requestUpdate();
}

/**
 * Service auswählen
 */
function handleFavoriteService(key, recording, app) {
  const category = app.categories.find(
    (cat) => cat.categoryKey === recording.categoryKey
  );

  const service = category?.services?.find((service) => service.key === key);

  if (!service) {
    cancelRecording(app);
    return;
  }

  saveFavorite(recording.slot, service, app);

  const favLabel = app.t('favLabel') || 'FAV';
  const savedText = app.t('saved') || 'gespeichert';

  app.currentInput = `${favLabel} ${recording.slot} ${savedText}`;

  app.isValidInput = true;

  app.favoriteRecording = null;

  app.startResetTimer(1500);
}

/**
 * Favorit speichern
 */
function saveFavorite(slot, service, app) {
  app.favorites = { ...app.favorites, [slot]: service.name };
  saveFavorites(app);
}

/**
 * LocalStorage schreiben
 */
function saveFavorites(app) {
  writeJsonStorage(FAVORITES_STORAGE_KEY, app.favorites);
}

/**
 * Aufnahme abbrechen
 */
function cancelRecording(app) {
  app.favoriteRecording = null;

  app.isInvalidInput = true;

  app.startResetTimer(1000);
}
