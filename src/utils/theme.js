import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  getTheme,
  isKnownTheme,
} from '../themes/themes.js';

export function loadTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isKnownTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch (error) {
    console.warn('Could not read theme preference.', error);
    return DEFAULT_THEME;
  }
}

export function applyTheme(themeId) {
  const theme = getTheme(themeId);
  document.documentElement.dataset.theme = theme.id;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.metaColor);
  return theme.id;
}

export function saveTheme(themeId) {
  const appliedTheme = applyTheme(themeId);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, appliedTheme);
  } catch (error) {
    console.warn('Could not save theme preference.', error);
  }
  return appliedTheme;
}
