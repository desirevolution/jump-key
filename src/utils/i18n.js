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

    tabData: "Import & Export",
    tabDataExport: "Exportieren",
    tabDataBackupTitle: "Konfiguration sichern",
    tabDataBackupDesc:
      "Lade deine aktuellen Widgets und Suchmaschinen als .json-Datei herunter.",
    tabDataRestoreTitle: "Konfiguration wiederherstellen",
    tabDataRestoreDesc: "Lade eine vorhandene JSON-Konfigurationsdatei hoch.",
    tabDataSelectFile: "Datei auswählen",
    tabDataOnlyJsonFiles: "Nur valide .json-Dateien",
    tabDataImportSuccess: "Konfiguration erfolgreich geladen!",
    tabDataImportInvalidStructure:
      "Die hochgeladene Datei hat keine valide Dashboard-Struktur.",
    tabDataImportJsonError:
      "Fehler beim Lesen der JSON-Datei. Ungültige Syntax.",

    tabEditor: "JSON-Editor",
    tabEditorOk: "OK",
    tabEditorSaveDoneTitle: "Erfolgreich",
    tabEditorSaveDone: "Konfiguration erfolgreich gespeichert!",
    tabEditorSaveFailedTitle: "Fehler beim Speichern",
    tabEditorSaveFailed:
      "Die Änderungen konnten nicht in die services.json geschrieben werden.",
    tabEditorDiscardChangesTitle: "Ungespeicherte Änderungen",
    tabEditorDiscardChangesMsg:
      "Du hast ungespeicherte Änderungen vorgenommen. Möchtest du diese wirklich verwerfen?",
    tabEditorDiscardChangesConfirm: "Änderungen verwerfen",
    tabEditorDiscardChangesCancel: "Weiter editieren",
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

    tabData: "Import & Export",
    tabDataExport: "Export",
    tabDataBackupTitle: "Back up configuration",
    tabDataBackupDesc:
      "Download your current widgets and search engines as a .json file.",
    tabDataRestoreTitle: "Restore configuration",
    tabDataRestoreDesc: "Upload an existing JSON configuration file.",
    tabDataSelectFile: "Select file",
    tabDataOnlyJsonFiles: "Only valid .json files",
    tabDataImportSuccess: "Configuration successfully loaded!",
    tabDataImportInvalidStructure:
      "The uploaded file does not have a valid dashboard structure.",
    tabDataImportJsonError: "Error reading the JSON file. Invalid syntax.",

    tabEditor: "JSON-Editor",
    tabEditorOk: "OK",
    tabEditorgSaveDoneTitle: "Success",
    tabEditorgSaveDone: "Configuration saved successfully!",
    tabEditorgSaveFailedTitle: "Save Failed",
    tabEditorSaveFailed: "Could not write the changes to services.json.",
    tabEditorDiscardChangesTitle: "Unsaved Changes",
    tabEditorDiscardChangesMsg: "You have unsaved changes. Do you really want to discard them?",
    tabEditorDiscardChangesConfirm: "Discard changes",
    tabEditorDiscardChangesCancel: "Continue editing",
  },
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations["en"][key] ?? key;
}

export function detectLang() {
  const browserLang = navigator.language.split("-")[0];
  return translations[browserLang] ? browserLang : "en";
}
