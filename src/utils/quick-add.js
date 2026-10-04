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

export function buildQuickConfig(config, { url, name, category, newCategory, key, icon }) {
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
  target.services.push(service);
  return next;
}

export function suggestKey(config, category, name) {
  if (category !== 'new' && !/^\d+$/.test(category ?? '')) return '';
  const target = category === 'new' ? { category: 'New', services: [] } : config?.categories[Number(category)];
  if (!target) return '';
  const existing = generateShortcuts([target])[0];
  return generateShortcuts([{ ...existing, services: [...existing.services, { name: name || 'Link', url: '' }] }])[0].services.at(-1).key || '';
}
