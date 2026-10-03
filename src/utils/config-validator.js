const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const optionalKey = value => value === undefined || value === '' || (typeof value === 'string' && /^[a-z]$/i.test(value));

export function getConfigErrors(config) {
  const errors = [];
  const add = (path, code, other) => errors.push({ path, code, other });
  const requiredText = (value, path) => { if (!text(value)) add(path, 'text'); };
  const unique = (value, path, seen) => {
    if (seen.has(value)) add(path, 'duplicate', seen.get(value));
    else seen.set(value, path);
  };
  const key = (value, path, seen) => {
    if (!optionalKey(value)) add(path, 'key');
    else if (value) unique(value.toLowerCase(), path, seen);
  };
  if (!object(config)) return [{ path: '$', code: 'object' }];
  const ids = new Map(), categoryKeys = new Map(), prefixes = new Map();
  if (!Array.isArray(config.categories)) add('categories', 'array');
  else config.categories.forEach((category, i) => {
    const p = `categories[${i}]`;
    if (!object(category)) { add(p, 'object'); return; }
    requiredText(category.category, `${p}.category`);
    key(category.categoryKey, `${p}.categoryKey`, categoryKeys);
    if (!Array.isArray(category.services)) { add(`${p}.services`, 'array'); return; }
    const serviceKeys = new Map();
    category.services.forEach((service, j) => {
      const q = `${p}.services[${j}]`;
      if (!object(service)) { add(q, 'object'); return; }
      requiredText(service.name, `${q}.name`);
      requiredText(service.url, `${q}.url`);
      key(service.key, `${q}.key`, serviceKeys);
      if (service.icon !== undefined && typeof service.icon !== 'string') add(`${q}.icon`, 'string');
      if (service.id !== undefined) {
        if (!text(service.id)) add(`${q}.id`, 'text');
        else unique(service.id, `${q}.id`, ids);
      }
    });
  });
  if (!Array.isArray(config.searchEngines)) add('searchEngines', 'array');
  else config.searchEngines.forEach((engine, i) => {
    const p = `searchEngines[${i}]`;
    if (!object(engine)) { add(p, 'object'); return; }
    for (const field of ['name', 'prefix', 'url']) requiredText(engine[field], `${p}.${field}`);
    if (text(engine.prefix)) unique(engine.prefix.toLowerCase(), `${p}.prefix`, prefixes);
  });
  return errors;
}

export function validateConfig(config) { return getConfigErrors(config).length === 0; }
