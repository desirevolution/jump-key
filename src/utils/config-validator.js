export function validateConfig(jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object') return false;

  const hasCategories =
    Array.isArray(jsonObj.categories) && jsonObj.categories.length > 0;
  const hasSearchEngines =
    Array.isArray(jsonObj.searchEngines) && jsonObj.searchEngines.length > 0;

  if (!hasCategories || !hasSearchEngines) return false;

  const isCategoriesValid = jsonObj.categories.every(
    (cat) =>
      typeof cat.category === 'string' &&
      typeof cat.categoryKey === 'string' &&
      Array.isArray(cat.services)
  );

  const isSearchEnginesValid = jsonObj.searchEngines.every(
    (engine) =>
      typeof engine.name === 'string' &&
      typeof engine.prefix === 'string' &&
      typeof engine.url === 'string'
  );

  return isCategoriesValid && isSearchEnginesValid;
}
