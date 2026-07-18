import { getFilteredServices, getFavorites } from './shortcuts.js';

/**
 * Verarbeitet die globalen Tastatureingaben für die Dashboard-App
 */
export function handleGlobalKeyDown(e, app) {
  if (e.ctrlKey && /^[0-9]$/.test(e.key)) {
    e.preventDefault();
    handleFavoriteShortcut(e.key, app);
    return;
  }

  // Bestehender Code für sonstige Ctrl/Alt Keys
  if ((e.ctrlKey && e.key !== ',') || e.altKey || e.metaKey) {
    return;
  }

  if (e.key === 'Escape') {
    if (app.showConfigModal) {
      app.showConfigModal = false;
      return;
    }
    // Falls wir gerade einen Favoriten aufnehmen, brechen wir ab
    if (app.favoriteRecording) {
      app.favoriteRecording = null;
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

  // Wenn wir mitten in der Favoriten-Zuweisung sind (warten auf die 2 Buchstaben)
  if (app.favoriteRecording) {
    if (e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
      handleFavoriteRecordingInput(e.key.toLowerCase(), app);
    } else {
      // Wenn mitten drin was falsches getippt wird -> Abbruch
      app.favoriteRecording = null;
      app.resetInput(true);
    }
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

function handleFavoriteShortcut(slot, app) {
  // Wenn der Slot bereits belegt ist, und wir erneut Ctrl + dieselbe Zahl drücken -> Löschen triggern
  if (app.favorites[slot]) {
    app.dialogConfig = {
      show: true,
      title: app.t('confirmDeleteFavTitle') || 'Favorit löschen?',
      message: `${app.t('confirmDeleteFav') || 'Möchtest du den Favoriten auf Taste'} ${slot} (${app.favorites[slot]}) entfernen?`,
      icon: 'trash-2',
      iconColor: 'text-rose-400',
      confirmLabel: app.t('confirmResetConfirm') || 'Löschen',
      cancelLabel: app.t('cancel'),
      onConfirm: () => {
        delete app.favorites[slot];
        localStorage.setItem('dashboard_favs', JSON.stringify(app.favorites));
        app.requestUpdate();
      },
    };
    return;
  }

  // Ansonsten: Aufnahme-Modus für diesen Slot starten
  app.favoriteRecording = {
    slot: slot,
    step: 0, // 0 = wartet auf Kategorie-Buchstabe, 1 = wartet auf Service-Buchstabe
    categoryKey: '',
  };

  // Visuelles Feedback im KeyBadge
  app.currentInput = `SET FAV ${slot} → ?`;
  app.requestUpdate();
}

// In utils/keyboard-handler.js

function handleFavoriteRecordingInput(key, app) {
  const rec = app.favoriteRecording;

  if (rec.step === 0) {
    const catExists = app.categories.some((c) => c.categoryKey === key);
    if (catExists) {
      rec.categoryKey = key;
      rec.step = 1;

      // NEU: Setze die Kategorie aktiv, damit die App die Gruppe/Kacheln einblendet!
      app.activeCategoryKey = key;

      app.currentInput = `SET FAV ${rec.slot} → ${key.toUpperCase()} → ?`;
    } else {
      // Falscher Buchstabe -> Abbruch
      app.favoriteRecording = null;
      app.isInvalidInput = true;
      app.startResetTimer(1000);
    }
  } else if (rec.step === 1) {
    // 2. Buchstabe: Service in der Kategorie suchen
    const cat = app.categories.find((c) => c.categoryKey === rec.categoryKey);
    const service = cat?.services?.find((s) => s.key === key);

    if (service) {
      // Erfolg! Favorit speichern
      app.favorites[rec.slot] = service.name;
      localStorage.setItem('dashboard_favs', JSON.stringify(app.favorites));

      app.isValidInput = true;
      app.currentInput = `FAV ${rec.slot} SAVED!`;
      app.favoriteRecording = null;

      // Nach dem Speichern gehen wir automatisch zurück zur Hauptübersicht
      app.startResetTimer(1500);
    } else {
      // Ungültiger Service-Key -> Abbruch
      app.favoriteRecording = null;
      app.isInvalidInput = true;
      // Setzt auch die Ansicht zurück
      app.startResetTimer(1000);
    }
  }
  app.requestUpdate();
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
    if (/^[0-9]$/.test(key)) {
      const favService = getFavorites(app.categories, app.favorites).find((s) => s.key === key);
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
