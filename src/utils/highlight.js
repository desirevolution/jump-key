/** Splits the display text without changing or trusting it as HTML. */
export function highlightParts(value, query) {
  const text = String(value ?? '');
  const needle = String(query ?? '').trim();
  if (!needle) return [{ text, match: false }];
  const lower = text.toLocaleLowerCase();
  const search = needle.toLocaleLowerCase();
  const parts = [];
  let start = 0, index;
  while ((index = lower.indexOf(search, start)) >= 0) {
    if (index > start) parts.push({ text: text.slice(start, index), match: false });
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    start = index + needle.length;
  }
  if (start < text.length) parts.push({ text: text.slice(start), match: false });
  return parts.length ? parts : [{ text, match: false }];
}
