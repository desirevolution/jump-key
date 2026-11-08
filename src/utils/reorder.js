import { generateShortcuts } from './shortcuts.js';
// Immutable, pure changes. The server remains the single source of truth after save.
export function moveCategory(config, index, direction) {
  if (![-1, 1].includes(direction) || index < 0 || index + direction < 0 || index + direction >= config.categories.length) return null;
  const next = structuredClone(config);
  // Materialize generated shortcuts before moving items, preventing an order
  // change from reallocating category/service keys with colliding initials.
  next.categories = generateShortcuts(next.categories);
  [next.categories[index], next.categories[index + direction]] = [next.categories[index + direction], next.categories[index]];
  return next;
}

export function servicePosition(config, id) {
  for (let categoryIndex = 0; categoryIndex < config.categories.length; categoryIndex++) {
    const index = config.categories[categoryIndex].services.findIndex(service => service.id === id);
    if (index >= 0) return { categoryIndex, index, count: config.categories[categoryIndex].services.length };
  }
  return null;
}

export function moveService(config, id, direction) {
  const position = servicePosition(config, id);
  if (!position || ![-1, 1].includes(direction) || position.index + direction < 0 || position.index + direction >= position.count) return null;
  const next = structuredClone(config);
  next.categories = generateShortcuts(next.categories);
  const services = next.categories[position.categoryIndex].services;
  [services[position.index], services[position.index + direction]] = [services[position.index + direction], services[position.index]];
  return next;
}

export function categoryCollapseKey(user, id) {
  return `jumpkey:${encodeURIComponent(user ?? '')}:${id}:collapsed`;
}

export function toggleCollapsed(collapsed, categoryKey) {
  return { ...collapsed, [categoryKey]: !collapsed[categoryKey] };
}
