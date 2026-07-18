const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const RESERVED_KEYS = new Set(['space', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '?']);

function pickKey(preferredChars, usedKeys) {
  return (
    [...preferredChars].find((c) => !usedKeys.has(c)) ?? ALPHABET.find((c) => !usedKeys.has(c))
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
    })),
  );
}

export function getFilteredServices(categories, searchQuery) {
  if (!searchQuery) return [];
  const q = searchQuery.toLowerCase();
  return getAllServicesFlat(categories).filter(
    (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
  );
}

export function getFavorites(categories, favorites) {
  const allServices = getAllServicesFlat(categories);
  const result = [];

  // Die feste Reihenfolge der Slots: 1 bis 9, und die 0 am Ende
  const slots = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  slots.forEach((slot) => {
    const serviceName = favorites[slot];
    if (serviceName) {
      const service = allServices.find((s) => s.name === serviceName);
      if (service) {
        // Wir übergeben den Slot ('1'-'0') als Key für den Kachel-Badge
        result.push({ ...service, key: slot });
      }
    }
  });

  return result;
}
