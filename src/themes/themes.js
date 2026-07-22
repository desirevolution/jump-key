export const DEFAULT_THEME = 'midnight';
export const THEME_STORAGE_KEY = 'jump-key-theme';

export const THEMES = [
  {
    id: 'midnight',
    nameKey: 'themeMidnight',
    descriptionKey: 'themeMidnightDesc',
    metaColor: '#020617',
    preview: { background: '#020617', surface: '#0f172a', accent: '#4f46e5', favorite: '#f59e0b' },
  },
  {
    id: 'ocean',
    nameKey: 'themeOcean',
    descriptionKey: 'themeOceanDesc',
    metaColor: '#061b24',
    preview: { background: '#061b24', surface: '#0b2a36', accent: '#0891b2', favorite: '#f59e0b' },
  },
  {
    id: 'graphite',
    nameKey: 'themeGraphite',
    descriptionKey: 'themeGraphiteDesc',
    metaColor: '#111113',
    preview: { background: '#111113', surface: '#1c1c20', accent: '#7c3aed', favorite: '#f59e0b' },
  },
  {
    id: 'emerald',
    nameKey: 'themeEmerald',
    descriptionKey: 'themeEmeraldDesc',
    metaColor: '#06130d',
    preview: { background: '#06130d', surface: '#0d2118', accent: '#10b981', favorite: '#f59e0b' },
  },
  {
    id: 'dracula',
    nameKey: 'themeDracula',
    descriptionKey: 'themeDraculaDesc',
    metaColor: '#282a36',
    preview: { background: '#282a36', surface: '#343746', accent: '#bd93f9', favorite: '#f1fa8c' },
  },
  {
    id: 'nord',
    nameKey: 'themeNord',
    descriptionKey: 'themeNordDesc',
    metaColor: '#2e3440',
    preview: { background: '#2e3440', surface: '#3b4252', accent: '#88c0d0', favorite: '#ebcb8b' },
  },
  {
    id: 'tokyo-night',
    nameKey: 'themeTokyoNight',
    descriptionKey: 'themeTokyoNightDesc',
    metaColor: '#1a1b26',
    preview: { background: '#1a1b26', surface: '#24283b', accent: '#7aa2f7', favorite: '#e0af68' },
  },
  {
    id: 'catppuccin-mocha',
    nameKey: 'themeCatppuccin',
    descriptionKey: 'themeCatppuccinDesc',
    metaColor: '#1e1e2e',
    preview: { background: '#1e1e2e', surface: '#313244', accent: '#89b4fa', favorite: '#f9e2af' },
  },
  {
    id: 'carbon',
    nameKey: 'themeCarbon',
    descriptionKey: 'themeCarbonDesc',
    metaColor: '#161616',
    preview: { background: '#161616', surface: '#262626', accent: '#4589ff', favorite: '#f1c21b' },
  },
  {
    id: 'hacker',
    nameKey: 'themeHacker',
    descriptionKey: 'themeHackerDesc',
    metaColor: '#050505',
    preview: { background: '#050505', surface: '#101510', accent: '#22c55e', favorite: '#facc15' },
  },
  {
    id: 'solarized-dark',
    nameKey: 'themeSolarized',
    descriptionKey: 'themeSolarizedDesc',
    metaColor: '#002b36',
    preview: { background: '#002b36', surface: '#073642', accent: '#268bd2', favorite: '#b58900' },
  },
  {
    id: 'gruvbox-dark',
    nameKey: 'themeGruvbox',
    descriptionKey: 'themeGruvboxDesc',
    metaColor: '#282828',
    preview: { background: '#282828', surface: '#3c3836', accent: '#d79921', favorite: '#fabd2f' },
  },
];

export function getTheme(themeId) {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];
}

export function isKnownTheme(themeId) {
  return THEMES.some((theme) => theme.id === themeId);
}
