const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz'];

export const FAVORITE_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export const CONTINUE_SLOTS = FAVORITE_SLOTS;
const RESERVED_KEYS = new Set([
  'space',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '?',
]);

function pickKey(preferredChars, usedKeys) {
  return (
    [...preferredChars].find((c) => !usedKeys.has(c)) ??
    ALPHABET.find((c) => !usedKeys.has(c))
  );
}

export function generateShortcuts(data) {
  const usedCategoryKeys = new Set(RESERVED_KEYS);

  return data.map((cat) => {
    let categoryKey = cat.categoryKey?.toLowerCase() ?? '';
    if (!categoryKey) {
      const cleanName = cat.category.toLowerCase().replace(/[^a-z]/g, '');
      categoryKey = pickKey(cleanName, usedCategoryKeys);
    }
    if (categoryKey) usedCategoryKeys.add(categoryKey);

    const usedServiceKeys = new Set();
    const services = (cat.services ?? []).map((service) => {
      let serviceKey = service.key?.toLowerCase() ?? '';
      if (!serviceKey) {
        const cleanName = service.name.toLowerCase().replace(/[^a-z]/g, '');
        serviceKey = pickKey(cleanName, usedServiceKeys);
      }
      if (serviceKey) usedServiceKeys.add(serviceKey);
      return { ...service, key: serviceKey };
    });

    return { ...cat, categoryKey, services };
  });
}

export function getAllServicesFlat(categories) {
  return categories.flatMap((cat) =>
    (cat.services ?? []).map((s) => ({
      ...s,
      category: cat.category,
      categoryKey: cat.categoryKey,
    }))
  );
}

function getSearchRank(value, query) {
  if (value === query) return 0;
  if (value.startsWith(query)) return 1;
  if (value.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return 2;
  if (value.includes(query)) return 3;
  return null;
}

export function getFilteredServices(categories, searchQuery) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return [];

  return getAllServicesFlat(categories)
    .map((service, index) => {
      const nameRank = getSearchRank(service.name.toLowerCase(), query);
      const categoryRank = getSearchRank(service.category.toLowerCase(), query);

      if (nameRank === null && categoryRank === null) return null;

      return {
        service,
        index,
        rank: nameRank ?? categoryRank + 4,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.service.name.length - b.service.name.length ||
        a.index - b.index
    )
    .map(({ service }) => service);
}

export function getFavorites(categories, favorites) {
  const allServices = getAllServicesFlat(categories);
  const result = [];
  FAVORITE_SLOTS.forEach((slot) => {
    const serviceName = favorites[slot];
    if (serviceName) {
      const originalService = allServices.find((s) => s.name === serviceName);
      if (originalService) {
        result.push({
          ...originalService,
          favSlot: slot,
        });
      }
    }
  });

  return result;
}

export function addFavoriteSlots(categories, favorites) {
  const slotsByName = new Map(
    Object.entries(favorites ?? {}).map(([slot, serviceName]) => [serviceName, slot])
  );

  return categories.map((category) => ({
    ...category,
    services: (category.services ?? []).map((service) => ({
      ...service,
      favSlot: slotsByName.get(service.name) ?? '',
    })),
  }));
}

export function getFavoriteService(categories, favorites, slot) {
  return getFavorites(categories, favorites).find((service) => service.favSlot === slot) ?? null;
}


export function getContinueServices(categories, continueHistory) {
  const allServices = getAllServicesFlat(categories);

  return (continueHistory ?? [])
    .map((serviceName, index) => {
      const originalService = allServices.find((service) => service.name === serviceName);
      if (!originalService) return null;

      return {
        ...originalService,
        continueSlot: CONTINUE_SLOTS[index],
      };
    })
    .filter(Boolean);
}

export function getContinueService(categories, continueHistory, slot) {
  return (
    getContinueServices(categories, continueHistory).find(
      (service) => service.continueSlot === slot
    ) ?? null
  );
}
