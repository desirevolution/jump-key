export const DEFAULT_TIMINGS = { categoryTimeout: 3, launchDelay: 1.2 };
export function normalizeTimings(value = {}) {
  const result = {};
  for (const [key, max, step] of [['categoryTimeout', 30, 1], ['launchDelay', 5, 0.1]]) {
    const n = value?.[key];
    result[key] = typeof n === 'number' && Number.isFinite(n)
      ? Math.round(Math.min(max, Math.max(0, n)) / step) * step
      : DEFAULT_TIMINGS[key];
    result[key] = Number(result[key].toFixed(1));
  }
  return result;
}
