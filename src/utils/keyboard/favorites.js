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
  app.dialogConfig = {
    show: true,

    title: app.t('confirmDeleteFavTitle') || 'Favorit löschen?',

    message: `${app.t('confirmDeleteFav') || 'Möchtest du den Favoriten entfernen?'} 
        ${slot} (${app.favorites[slot]})`,

    icon: 'trash-2',

    iconColor: 'text-rose-400',

    confirmLabel: app.t('confirmResetConfirm') || 'Löschen',

    cancelLabel: app.t('cancel') || 'Abbrechen',

    onConfirm: () => {
      delete app.favorites[slot];

      saveFavorites(app);

      app.requestUpdate();
    },
  };
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

  app.currentInput = `FAV ${slot}: Kategorie wählen`;

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

  app.currentInput = `FAV ${recording.slot}: ${key.toUpperCase()} → Service`;

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

  app.currentInput = `FAV ${recording.slot} gespeichert`;

  app.isValidInput = true;

  app.favoriteRecording = null;

  app.startResetTimer(1500);
}

/**
 * Favorit speichern
 */
function saveFavorite(slot, service, app) {
  app.favorites[slot] = service.name;

  saveFavorites(app);
}

/**
 * LocalStorage schreiben
 */
function saveFavorites(app) {
  localStorage.setItem('dashboard_favs', JSON.stringify(app.favorites));
}

/**
 * Aufnahme abbrechen
 */
function cancelRecording(app) {
  app.favoriteRecording = null;

  app.isInvalidInput = true;

  app.startResetTimer(1000);
}
