import { generateShortcuts } from './shortcuts.js';

// GET share targets can replace the action query, dropping our share=1 marker.
export function hasSharedInput(params) {
  return params.get('share') === '1' || ['url', 'text', 'title'].some(key => params.has(key));
}

export function sharedLink(params) {
  const candidates = [params.get('url'), params.get('text')];
  for (const value of candidates) {
    const match = value?.match(/https?:\/\/[^\s<>]+/i);
    if (match) return { url: match[0], name: params.get('title') || '' };
  }
  return { url: '', name: params.get('title') || '' };
}

export function buildQuickConfig(config, { url, name, category, newCategory, key, icon, position }) {
  let parsed;
  try { parsed = new URL(url.trim()); } catch { throw new Error('quickInvalidUrl'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('quickInvalidUrl');
  const next = structuredClone(config);
  let target;
  if (category === 'new') {
    if (!newCategory.trim()) throw new Error('quickCategoryRequired');
    if (next.categories.some(c => c.category.toLowerCase() === newCategory.trim().toLowerCase())) throw new Error('quickCategoryExists');
    target = { category: newCategory.trim(), services: [] };
    next.categories.push(target);
  } else if (/^\d+$/.test(category ?? '')) target = next.categories[Number(category)];
  if (!target) throw new Error('quickCategoryRequired');
  if (target.services.some(s => { try { return new URL(s.url, globalThis.location?.origin || 'https://jumpkey.invalid').href === parsed.href; } catch { return s.url === url.trim(); } })) throw new Error('quickDuplicate');
  const service = { name: name.trim() || parsed.hostname, url: parsed.href };
  if (key.trim()) {
    if (!/^[a-z]$/i.test(key.trim())) throw new Error('quickInvalidKey');
    const generated = generateShortcuts([target])[0];
    if (generated.services.some(s => s.key === key.trim().toLowerCase())) throw new Error('quickKeyUsed');
    service.key = key.trim().toLowerCase();
  }
  if (icon.trim()) service.icon = icon.trim();
  target.services.splice(insertionIndex(target.services, position), 0, service);
  return next;
}

export function suggestKey(config, category, name) {
  if (category !== 'new' && !/^\d+$/.test(category ?? '')) return '';
  const target = category === 'new' ? { category: 'New', services: [] } : config?.categories[Number(category)];
  if (!target) return '';
  const existing = generateShortcuts([target])[0];
  return generateShortcuts([{ ...existing, services: [...existing.services, { name: name || 'Link', url: '' }] }])[0].services.at(-1).key || '';
}

export function buildEditConfig(config, input) {
  const next = structuredClone(config);
  const sourceIndex = next.categories.findIndex(c => c.services.some(s => s.id === input.serviceId));
  if (sourceIndex < 0) throw new Error('quickServiceMissing');
  const source = next.categories[sourceIndex];
  const position = source.services.findIndex(s => s.id === input.serviceId);
  const original = source.services[position];
  // Freeze the other effective shortcuts before removing the edited entry.
  next.categories = generateShortcuts(next.categories);
  next.categories[sourceIndex].services.splice(position, 1);
  // Lit form properties are prototype accessors, not enumerable own fields.
  const { url, name, category, newCategory, key, icon } = input;
  const updated = buildQuickConfig(next, { url, name, category, newCategory, key, icon, position: 'bottom' });
  const targetIndex = input.category === 'new' ? updated.categories.length - 1 : Number(input.category);
  const target = updated.categories[targetIndex];
  const edited = { ...original, ...target.services.pop(), id: original.id };
  if (!input.icon.trim()) delete edited.icon;
  if (!input.key.trim()) delete edited.key;
  const destination = input.position === undefined && targetIndex === sourceIndex
    ? position : insertionIndex(target.services, input.position);
  target.services.splice(destination, 0, edited);
  if (input.removeEmptyCategory && sourceIndex !== targetIndex && updated.categories[sourceIndex].services.length === 0) {
    updated.categories.splice(sourceIndex, 1);
  }
  return updated;
}


function insertionIndex(services, position = 'bottom') {
  if (position === 'top') return 0;
  if (position === 'bottom') return services.length;
  if (typeof position === 'string' && position.startsWith('after:')) {
    const index = services.findIndex(s => s.id === position.slice(6));
    if (index >= 0) return index + 1;
  }
  throw new Error('quickPositionInvalid');
}

export function buildDeleteConfig(config, serviceId, removeEmptyCategory = false) {
  const next = structuredClone(config);
  next.categories = generateShortcuts(next.categories);
  const categoryIndex = next.categories.findIndex(c => c.services.some(s => s.id === serviceId));
  if (categoryIndex < 0) throw new Error('quickServiceMissing');
  const category = next.categories[categoryIndex];
  category.services = category.services.filter(s => s.id !== serviceId);
  if (removeEmptyCategory && category.services.length === 0) next.categories.splice(categoryIndex, 1);
  return next;
}
