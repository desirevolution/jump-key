export const translations = {
  de: {
    helpHint: "Drücke [?] für Hotkey-Hilfe",
    helpTitle: "Tastatur-Kurzbefehle",
    helpExit: "Klicke irgendwohin oder drücke eine Taste zum Schließen.",
    searchPlaceholder: "Service suchen...",
    close: "Schließen",
    noServices: "Keine Services gefunden.",
    frequent: "Häufig genutzt",
    resetFavs: "Zurücksetzen",
    categories: "Kategorien",
    services: "Services",
    back: "Zurück",
    confirmReset: "Möchtest du die Liste der häufig genutzten Services wirklich zurücksetzen?",
    hkSearch: "Suche öffnen",
    hkFavs: "Direkt-Favorit aufrufen",
    hkCat: "Kategorie-Hotkeys aktivieren",
    hkService: "Service innerhalb einer Kategorie aufrufen",
    hkReset: "Zurück zur Hauptübersicht / Abbrechen",
    hkToggleView: "Ansichtsmodus wechseln (Kategorie / Grid)" // <-- Added
  },
  en: {
    helpHint: "Press [?] for hotkey help",
    helpTitle: "Keyboard Shortcuts",
    helpExit: "Click anywhere or press a key to close it.",
    searchPlaceholder: "Search services...",
    close: "Close",
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
    hkToggleView: "Toggle View Mode (Category / Grid)" // <-- Added
  }
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations['en'][key] ?? key;
}

export function detectLang() {
  const browserLang = navigator.language.split('-')[0];
  return translations[browserLang] ? browserLang : 'en';
}
