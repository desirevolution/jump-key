export const translations = {
  de: {
    helpHint: "Drücke [?] für Hotkey-Hilfe",
    helpTitle: "Tastatur-Kurzbefehle",
    helpExit: "Klicke irgendwohin oder drücke eine Taste zum Schließen.",
    searchPlaceholder: "Service suchen...",
    noServices: "Keine Services gefunden.",
    frequent: "Häufig genutzt",
    resetFavs: "Zurücksetzen",
    categories: "Kategorien",
    services: "Services",
    back: "Zurück",
    confirmReset:
      "Möchtest du die Liste der häufig genutzten Services wirklich zurücksetzen?",
    hkSearch: "Suche öffnen",
    hkFavs: "Direkt-Favorit aufrufen",
    hkCat: "Kategorie-Hotkeys aktivieren",
    hkService: "Service innerhalb einer Kategorie aufrufen",
    hkReset: "Zurück zur Hauptübersicht / Abbrechen",
    hkToggleView: "Ansichtsmodus wechseln (Kategorie / Grid)",

    searchEnginesShow: "Suchmaschinen anzeigen", // <-- Neu
    searchEnginesTitle: "Unterstützte Suchmaschinen:", // <-- Neu
    searchEnginePreviewPrefix: "Suche auf", // <-- Neu
    searchEnginePreviewFor: "nach", // <-- Neu
    searchEngineEnterQuery: "Suchbegriff eingeben...", // <-- Neu
    contextInCat: "In Kat",
    hkSearchEngines: "Suchmaschinen aktivieren (im Suchfeld)",
    hkNavigate: "Ergebnisse durchblättern (im Suchfeld)",
    editConfig: "Konfiguration bearbeiten",
    editConfigValid: "Konfiguration ist gültig",
    editConfigInvalid: "Konfiguration ist ungültig",
    editConfigSave: "Speichern",
    editConfigCancel: "Abbrechen",
    editConfigSaveDone: "Änderungen wurden erfolgreich gespeichert",
    editConfigSaveFailed: "Änderungen konnten nicht gespeichert werden",
  },
  en: {
    helpHint: "Press [?] for hotkey help",
    helpTitle: "Keyboard Shortcuts",
    helpExit: "Click anywhere or press a key to close it.",
    searchPlaceholder: "Search services...",
    noServices: "No services found.",
    frequent: "Frequently used",
    resetFavs: "Reset",
    categories: "Categories",
    services: "Services",
    back: "Back",
    confirmReset: "Do you really want to reset your frequently used services?",
    hkSearch: "Open search",
    hkFavs: "Launch direct favorite",
    hkCat: "Activate category hotkeys",
    hkService: "Launch service inside active category",
    hkReset: "Back to main overview / Cancel",
    hkToggleView: "Toggle View Mode (Category / Grid)",

    // --- Search Engine specific Keys ---
    searchEnginesShow: "Show search engines", // <-- Neu
    searchEnginesTitle: "Supported Search Engines:", // <-- Neu
    searchEnginePreviewPrefix: "Search on", // <-- Neu
    searchEnginePreviewFor: "for", // <-- Neu
    searchEngineEnterQuery: "Enter search term...", // <-- Neu
    contextInCat: "In Cat",
    hkSearchEngines: "Activate search engines (inside search input)",
    hkNavigate: "Navigate results (inside search input)",
    editConfig: "Edit configuration",
    editConfigValid: "Configurationi is valid",
    editConfigInvalid: "Configuration is invalid",
    editConfigSave: "Save",
    editConfigCancel: "Cancel",
    editConfigSaveDone: "Changes were saved successfully",
    editConfigSaveFailed: "Changes could not be saved",
  },
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations["en"][key] ?? key;
}

export function detectLang() {
  const browserLang = navigator.language.split("-")[0];
  return translations[browserLang] ? browserLang : "en";
}
