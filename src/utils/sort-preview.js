/** Visual reorder only; persistence remains the responsibility of the manager. */
export function reorderPreview(items, from, to) {
  if (!Array.isArray(items) || !Number.isInteger(from) || !Number.isInteger(to) ||
      from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return [...(items || [])];
  const next = [...items];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** Stable insertion index excluding the dragged placeholder. */
export function insertionIndex(pointerY, centers) {
  return centers.filter(y => pointerY > y).length;
}


/** Resolve the target slot from stable row identities, not drag-marker attributes.
 *
 * During a Lit rerender an ordinary data-* attribute with an undefined value may
 * still be serialized. Filtering by its presence can therefore remove every row
 * and make every drop incorrectly resolve to position zero.
 * Returns null if the source row is missing/duplicated while the DOM updates.
 */
export function dragInsertionIndex(pointerY, rowCenters, sourceId) {
  if (!Array.isArray(rowCenters)) return null;
  const sourceKey = String(sourceId);
  const matches = rowCenters.filter(row => String(row.id) === sourceKey);
  if (matches.length !== 1) return null;
  return insertionIndex(pointerY, rowCenters.filter(row => String(row.id) !== sourceKey).map(row => row.center));
}
