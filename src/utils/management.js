import { generateShortcuts } from './shortcuts.js';

export function reorderItems(items, from, to) {
  if (!Array.isArray(items) || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return null;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Pin inferred shortcuts before changes, so reordering never steals a key.
export function reorderConfiguration(config, type, categoryIndex, from, to) {
  const next = structuredClone(config);
  next.categories = generateShortcuts(next.categories);
  if (type === 'categories') {
    const result = reorderItems(next.categories, from, to);
    if (!result) return null;
    next.categories = result;
  } else if (type === 'services') {
    if (!next.categories[categoryIndex]) return null;
    const result = reorderItems(next.categories[categoryIndex].services, from, to);
    if (!result) return null;
    next.categories[categoryIndex].services = result;
  } else return null;
  return next;
}

export function suggestCategoryShortcut(config, name, excludeIndex = -1) {
  const others = generateShortcuts(config.categories.filter((_, index) => index !== excludeIndex));
  const candidate = generateShortcuts([...others, { category: name.trim() || 'Kategorie', services: [] }]);
  return candidate.at(-1)?.categoryKey || '';
}

export function categoryError(config, name, shortcut, excludeIndex = -1, keyMode = 'manual') {
  const clean = name.trim();
  if (!clean) return 'Bitte einen Kategorienamen eingeben.';
  if (config.categories.some((cat, i) => i !== excludeIndex && cat.category.trim().toLowerCase() === clean.toLowerCase())) return 'Eine Kategorie mit diesem Namen existiert bereits.';
  if (!['auto', 'manual', 'none'].includes(keyMode)) return 'Ungültige Shortcut-Vergabe.';
  if (keyMode === 'manual') {
    if (!/^[a-z]$/i.test(shortcut)) return 'Bitte einen Buchstaben (A–Z) auswählen.';
    const others = generateShortcuts(config.categories.filter((_, i) => i !== excludeIndex));
    if (others.some(cat => cat.categoryKey === shortcut.toLowerCase())) return 'Dieser Kategorie-Shortcut ist bereits belegt.';
  }
  if (keyMode === 'auto' && !suggestCategoryShortcut(config, name, excludeIndex)) return 'Kein freier Kategorie-Shortcut verfügbar.';
  return '';
}

export function editCategory(config, index, name, shortcut, keyMode = 'manual') {
  const next = structuredClone(config);
  next.categories = generateShortcuts(next.categories);
  if (!next.categories[index]) throw new Error('Kategorie nicht vorhanden');
  const error = categoryError(next, name, shortcut, index, keyMode);
  if (error) throw new Error(error);
  const cat = next.categories[index];
  cat.category = name.trim();
  if (keyMode === 'none') {
    delete cat.categoryKey;
    cat.shortcutDisabled = true;
  } else {
    delete cat.shortcutDisabled;
    cat.categoryKey = keyMode === 'auto' ? suggestCategoryShortcut(next, name, index) : shortcut.toLowerCase();
  }
  return next;
}

export function addCategory(config, name, keyMode = 'auto', shortcut = '') {
  const next = structuredClone(config);
  next.categories = generateShortcuts(next.categories);
  const error = categoryError(next, name, shortcut, -1, keyMode);
  if (error) throw new Error(error);
  const cat = { category: name.trim(), services: [] };
  if (keyMode === 'none') cat.shortcutDisabled = true;
  else cat.categoryKey = keyMode === 'auto' ? suggestCategoryShortcut(next, name) : shortcut.toLowerCase();
  next.categories.push(cat);
  return next;
}

export function deleteCategory(config, index) {
  const next = structuredClone(config);
  if (!next.categories[index]) throw new Error('Kategorie nicht vorhanden');
  next.categories.splice(index, 1);
  return next;
}
