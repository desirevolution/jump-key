export const translations = {
  de: {
    // Generelles & Layout
    helpHint: 'Drücke [?] für Hotkey-Hilfe',
    helpTitle: 'Tastatur-Kurzbefehle',
    helpExit: 'Klicke irgendwohin oder drücke eine Taste zum Schließen.',
    searchPlaceholder: 'Service suchen...',
    noServices: 'Keine Services gefunden.',
    favorites: 'Favoriten',
    resetFavs: 'Zurücksetzen',
    categories: 'Kategorien',
    services: 'Services',
    back: 'Zurück',
    close: 'Schließen',
    cancel: 'Abbrechen',
    configSubtitle: 'Konfiguration & Backup',

    // Favoriten & Aktionen
    confirmResetTitle: 'Favoriten zurücksetzen',
    confirmReset:
      'Möchtest du die Liste der häufig genutzten Services wirklich zurücksetzen?',
    confirmResetConfirm: 'Ja, zurücksetzen',
    favAlreadyExists: 'ist bereits ein Favorit auf Slot',
    favFull: 'Alle Favoritenplätze sind belegt',
    favSaved: 'als Favorit auf Taste {slot} gespeichert',
    favRemoved: 'von Taste {slot} entfernt',
    serviceCount: 'Services',
    cannotFavoriteCategory:
      'Kategorien können nicht als Favorit gespeichert werden. Öffne die Kategorie, um ihre Services hinzuzufügen.',
    favLabel: 'FAV',
    selectCategory: 'Kategorie wählen',
    serviceLabel: 'Service',
    saved: 'gespeichert',

    // Hotkeys & Search Engines
    hkSearch: 'Suche öffnen',
    hkFavs: 'Direkt-Favorit aufrufen',
    hkCat: 'Kategorie-Hotkeys aktivieren',
    hkService: 'Service innerhalb einer Kategorie aufrufen',
    hkReset: 'Zurück zur Hauptübersicht / Abbrechen',
    hkToggleView: 'Ansichtsmodus wechseln (Kategorie / Grid)',
    hkSwitchTabs: 'Konfigurations-Tabs wechseln',
    searchEnginesShow: 'Suchmaschinen anzeigen',
    searchEnginesTitle: 'Unterstützte Suchmaschinen:',
    searchEnginePreviewPrefix: 'Suche auf',
    searchEnginePreviewFor: 'nach',
    searchEngineEnterQuery: 'Suchbegriff eingeben...',
    contextInCat: 'In Kat',
    hkSearchEngines: 'Suchmaschinen aktivieren (im Suchfeld)',
    hkNavigate: 'Ergebnisse durchblättern (im Suchfeld)',

    // Config Modal
    editConfig: 'Konfiguration bearbeiten',
    editConfigValid: 'Konfiguration ist gültig',
    editConfigInvalid: 'Konfiguration ist ungültig',
    editConfigSave: 'Speichern',
    editConfigCancel: 'Abbrechen',
    editConfigSaveDone: 'Änderungen wurden erfolgreich gespeichert',
    editConfigSaveFailed: 'Änderungen konnten nicht gespeichert werden',

    // Config: Appearance
    tabAppearance: 'Darstellung',
    appearanceTitle: 'Theme auswählen',
    appearanceDescription:
      'Das Theme wird sofort angewendet und für dieses Gerät gespeichert.',
    themeMidnight: 'Midnight',
    themeMidnightDesc: 'Das klassische Slate-Design mit Indigo-Akzent.',
    themeOcean: 'Ocean',
    themeOceanDesc: 'Dunkles Petrol mit klarem Cyan-Akzent.',
    themeGraphite: 'Graphite',
    themeGraphiteDesc: 'Neutrales Anthrazit mit violettem Akzent.',
    themeEmerald: 'Emerald',
    themeEmeraldDesc: 'Dunkles Grün mit frischem Terminal-Akzent.',
    themeDracula: 'Dracula',
    themeDraculaDesc: 'Kontrastreiches Violett mit verspieltem Charakter.',
    themeNord: 'Nord',
    themeNordDesc: 'Kühle, ruhige Blautöne für lange Sessions.',
    themeTokyoNight: 'Tokyo Night',
    themeTokyoNightDesc: 'Tiefes Nachtblau mit leuchtendem Blau-Akzent.',
    themeCatppuccin: 'Catppuccin Mocha',
    themeCatppuccinDesc: 'Weiche Pastelltöne auf warmem Dunkelgrau.',
    themeCarbon: 'Carbon',
    themeCarbonDesc: 'Reduziertes Schwarz-Grau mit klarem Blau.',
    themeHacker: 'Hacker',
    themeHackerDesc: 'Fast schwarzes Terminal-Design mit Grün-Akzent.',
    themeSolarized: 'Solarized Dark',
    themeSolarizedDesc: 'Augenschonendes Petrol mit ausgewogenen Kontrasten.',
    themeGruvbox: 'Gruvbox Dark',
    themeGruvboxDesc: 'Warme Retro-Töne mit goldigem Akzent.',

    // Config: Tab Import/Export
    tabData: 'Import & Export',
    tabDataExport: 'Exportieren',
    tabDataExportSuccess: 'Konfiguration erfolgreich exportiert!',
    tabDataExportFailed: 'Export fehlgeschlagen.',
    tabDataBackupTitle: 'Konfiguration sichern',
    tabDataBackupDesc:
      'Lade deine aktuellen Widgets und Suchmaschinen als .json-Datei herunter.',
    tabDataRestoreTitle: 'Konfiguration wiederherstellen',
    tabDataRestoreDesc: 'Lade eine vorhandene JSON-Konfigurationsdatei hoch.',
    tabDataSelectFile: 'Datei auswählen',
    tabDataOnlyJsonFiles: 'Nur valide .json-Dateien',
    tabDataImportSuccess: 'Konfiguration erfolgreich geladen!',
    tabDataImportInvalidStructure:
      'Die hochgeladene Datei hat keine valide Dashboard-Struktur.',
    tabDataImportJsonError:
      'Fehler beim Lesen der JSON-Datei. Ungültige Syntax.',

    // Config: Tab Editor
    tabEditor: 'JSON-Editor',
    tabEditorOk: 'OK',
    tabEditorSaveDoneTitle: 'Erfolgreich',
    tabEditorSaveSuccess: 'Konfiguration erfolgreich gespeichert!',
    tabEditorSaveFailedTitle: 'Fehler beim Speichern',
    tabEditorSaveFailed:
      'Die Änderungen konnten nicht in die services.json geschrieben werden.',

    // Editor Discard Dialog
    discardChangesTitle: 'Änderungen verwerfen?',
    discardChangesMessage:
      'Es gibt ungespeicherte Änderungen im JSON-Editor. Möchtest du das Fenster wirklich schließen?',
    discardConfirm: 'Ja, verwerfen',

    // Fallback/Legacy Editor keys
    tabEditorDiscardChangesTitle: 'Ungespeicherte Änderungen',
    tabEditorDiscardChangesMsg:
      'Du hast ungespeicherte Änderungen vorgenommen. Möchtest du diese wirklich verwerfen?',
    tabEditorDiscardChangesConfirm: 'Änderungen verwerfen',
    tabEditorDiscardChangesCancel: 'Weiter editieren',
    tabEditorValid: 'Gültig',
    tabEditorInvalid: 'Ungültig',
  },
  en: {
    // Generelles & Layout
    helpHint: 'Press [?] for hotkey help',
    helpTitle: 'Keyboard Shortcuts',
    helpExit: 'Click anywhere or press a key to close it.',
    searchPlaceholder: 'Search services...',
    noServices: 'No services found.',
    favorites: 'Favorites',
    resetFavs: 'Reset',
    categories: 'Categories',
    services: 'Services',
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    configSubtitle: 'Configuration & Backup',

    // Favoriten & Aktionen
    confirmResetTitle: 'Reset Favorites',
    confirmReset: 'Do you really want to reset your frequently used services?',
    confirmResetConfirm: 'Yes, reset',
    favAlreadyExists: 'is already a favorite on slot',
    favFull: 'All favorite slots are taken',
    favSaved: 'saved as favorite on key {slot}',
    favRemoved: 'removed from key {slot}',
    serviceCount: 'Services',
    cannotFavoriteCategory:
      'Categories cannot be favorited. Open the category to add its services.',
    favLabel: 'FAV',
    selectCategory: 'Select category',
    serviceLabel: 'Service',
    saved: 'saved',

    // Hotkeys & Search Engines
    hkSearch: 'Open search',
    hkFavs: 'Launch direct favorite',
    hkCat: 'Activate category hotkeys',
    hkService: 'Launch service inside active category',
    hkReset: 'Back to main overview / Cancel',
    hkToggleView: 'Toggle View Mode (Category / Grid)',
    hkSwitchTabs: 'Switch config tabs',
    searchEnginesShow: 'Show search engines',
    searchEnginesTitle: 'Supported Search Engines:',
    searchEnginePreviewPrefix: 'Search on',
    searchEnginePreviewFor: 'for',
    searchEngineEnterQuery: 'Enter search term...',
    contextInCat: 'In Cat',
    hkSearchEngines: 'Activate search engines (inside search input)',
    hkNavigate: 'Navigate results (inside search input)',

    // Config Modal
    editConfig: 'Edit configuration',
    editConfigValid: 'Configuration is valid',
    editConfigInvalid: 'Configuration is invalid',
    editConfigSave: 'Save',
    editConfigCancel: 'Cancel',
    editConfigSaveDone: 'Changes were saved successfully',
    editConfigSaveFailed: 'Changes could not be saved',

    // Config: Appearance
    tabAppearance: 'Appearance',
    appearanceTitle: 'Choose a theme',
    appearanceDescription:
      'The theme is applied immediately and saved on this device.',
    themeMidnight: 'Midnight',
    themeMidnightDesc: 'The classic slate design with an indigo accent.',
    themeOcean: 'Ocean',
    themeOceanDesc: 'Deep petrol tones with a clear cyan accent.',
    themeGraphite: 'Graphite',
    themeGraphiteDesc: 'Neutral graphite with a violet accent.',
    themeEmerald: 'Emerald',
    themeEmeraldDesc: 'Deep green with a fresh terminal-inspired accent.',
    themeDracula: 'Dracula',
    themeDraculaDesc: 'High-contrast violet with a playful character.',
    themeNord: 'Nord',
    themeNordDesc: 'Cool, calm blue tones for long sessions.',
    themeTokyoNight: 'Tokyo Night',
    themeTokyoNightDesc: 'Deep night blue with a bright blue accent.',
    themeCatppuccin: 'Catppuccin Mocha',
    themeCatppuccinDesc: 'Soft pastel tones on warm dark gray.',
    themeCarbon: 'Carbon',
    themeCarbonDesc: 'Minimal black and gray with a crisp blue accent.',
    themeHacker: 'Hacker',
    themeHackerDesc: 'Near-black terminal styling with a green accent.',
    themeSolarized: 'Solarized Dark',
    themeSolarizedDesc: 'Eye-friendly petrol tones with balanced contrast.',
    themeGruvbox: 'Gruvbox Dark',
    themeGruvboxDesc: 'Warm retro tones with a golden accent.',

    // Config: Tab Import/Export
    tabData: 'Import & Export',
    tabDataExport: 'Export',
    tabDataExportSuccess: 'Configuration successfully exported!',
    tabDataExportFailed: 'Export failed.',
    tabDataBackupTitle: 'Back up configuration',
    tabDataBackupDesc:
      'Download your current widgets and search engines as a .json file.',
    tabDataRestoreTitle: 'Restore configuration',
    tabDataRestoreDesc: 'Upload an existing JSON configuration file.',
    tabDataSelectFile: 'Select file',
    tabDataOnlyJsonFiles: 'Only valid .json files',
    tabDataImportSuccess: 'Configuration successfully loaded!',
    tabDataImportInvalidStructure:
      'The uploaded file does not have a valid dashboard structure.',
    tabDataImportJsonError: 'Error reading the JSON file. Invalid syntax.',

    // Config: Tab Editor
    tabEditor: 'JSON-Editor',
    tabEditorOk: 'OK',
    tabEditorSaveDoneTitle: 'Success',
    tabEditorSaveSuccess: 'Configuration saved successfully!',
    tabEditorSaveFailedTitle: 'Save Failed',
    tabEditorSaveFailed: 'Could not write the changes to services.json.',

    // Editor Discard Dialog
    discardChangesTitle: 'Discard Changes?',
    discardChangesMessage:
      'You have unsaved changes in the JSON editor. Do you really want to close the window?',
    discardConfirm: 'Yes, discard',

    // Fallback/Legacy Editor keys
    tabEditorDiscardChangesTitle: 'Unsaved Changes',
    tabEditorDiscardChangesMsg:
      'You have unsaved changes. Do you really want to discard them?',
    tabEditorDiscardChangesConfirm: 'Discard changes',
    tabEditorDiscardChangesCancel: 'Continue editing',
    tabEditorValid: 'Valid',
    tabEditorInvalid: 'Invalid',
  },
};

export function t(lang, key, params = {}) {
  let str = translations[lang]?.[key] ?? translations['en'][key] ?? key;
  Object.keys(params).forEach((paramKey) => {
    str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
  });
  return str;
}

export function detectLang() {
  const browserLang = navigator.language.split('-')[0];
  return translations[browserLang] ? browserLang : 'en';
}
