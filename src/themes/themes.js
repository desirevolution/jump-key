export const DEFAULT_THEME = 'midnight';
export const THEME_STORAGE_KEY = 'jump-key-theme';

export const THEMES = [
  {
    id: 'midnight',
    scheme: 'dark',
    nameKey: 'themeMidnight',
    descriptionKey: 'themeMidnightDesc',
    metaColor: '#020617',
    preview: { background: '#020617', surface: '#0f172a', accent: '#4f46e5', favorite: '#f59e0b', text: '#e2e8f0' },
  },
  {
    id: 'ocean',
    scheme: 'dark',
    nameKey: 'themeOcean',
    descriptionKey: 'themeOceanDesc',
    metaColor: '#061b24',
    preview: { background: '#061b24', surface: '#0b2a36', accent: '#0891b2', favorite: '#f59e0b', text: '#d9e9ec' },
  },
  {
    id: 'graphite',
    scheme: 'dark',
    nameKey: 'themeGraphite',
    descriptionKey: 'themeGraphiteDesc',
    metaColor: '#111113',
    preview: { background: '#111113', surface: '#1c1c20', accent: '#7c3aed', favorite: '#f59e0b', text: '#e4e4e7' },
  },
  {
    id: 'emerald',
    scheme: 'dark',
    nameKey: 'themeEmerald',
    descriptionKey: 'themeEmeraldDesc',
    metaColor: '#06130d',
    preview: { background: '#06130d', surface: '#0d2118', accent: '#10b981', favorite: '#f59e0b', text: '#d8e8df' },
  },
  {
    id: 'tokyo-night',
    scheme: 'dark',
    nameKey: 'themeTokyoNight',
    descriptionKey: 'themeTokyoNightDesc',
    metaColor: '#1a1b26',
    preview: { background: '#1a1b26', surface: '#24283b', accent: '#7aa2f7', favorite: '#e0af68', text: '#c0caf5' },
  },
  {
    id: 'catppuccin-mocha',
    scheme: 'dark',
    nameKey: 'themeCatppuccin',
    descriptionKey: 'themeCatppuccinDesc',
    metaColor: '#1e1e2e',
    preview: { background: '#1e1e2e', surface: '#313244', accent: '#89b4fa', favorite: '#f9e2af', text: '#cdd6f4' },
  },
  {
    id: 'gruvbox-dark',
    scheme: 'dark',
    nameKey: 'themeGruvbox',
    descriptionKey: 'themeGruvboxDesc',
    metaColor: '#282828',
    preview: { background: '#282828', surface: '#3c3836', accent: '#d79921', favorite: '#fabd2f', text: '#ebdbb2' },
  },
  {
    id: 'daylight',
    scheme: 'light',
    nameKey: 'themeDaylight',
    descriptionKey: 'themeDaylightDesc',
    metaColor: '#f1f5f9',
    preview: { background: '#f1f5f9', surface: '#ffffff', accent: '#4f46e5', favorite: '#d97706', text: '#0f172a' },
  },
  {
    id: 'nord-light',
    scheme: 'light',
    nameKey: 'themeNordLight',
    descriptionKey: 'themeNordLightDesc',
    metaColor: '#eceff4',
    preview: { background: '#eceff4', surface: '#ffffff', accent: '#5e81ac', favorite: '#b7791f', text: '#2e3440' },
  },
  {
    id: 'solarized-light',
    scheme: 'light',
    nameKey: 'themeSolarizedLight',
    descriptionKey: 'themeSolarizedLightDesc',
    metaColor: '#fdf6e3',
    preview: { background: '#fdf6e3', surface: '#eee8d5', accent: '#268bd2', favorite: '#9b7400', text: '#073642' },
  },
];

export function getTheme(themeId) {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function isKnownTheme(themeId) {
  return THEMES.some((theme) => theme.id === themeId);
}
