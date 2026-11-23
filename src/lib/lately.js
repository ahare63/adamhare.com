// Helpers for the home page's "Lately" strip.

// Something only counts as "lately" for about three months.
export const RECENT_MS = 100 * 24 * 60 * 60 * 1000;

// The first (newest) item if it happened within RECENT_MS before `now`, else null.
export function recentFirst(items, timeOf, now = Date.now()) {
  const t = items.length ? timeOf(items[0]) : NaN;
  return Number.isFinite(t) && t <= now && now - t < RECENT_MS ? items[0] : null;
}

// "2026-11-05" -> "5 November 2026", matching how the sheets write dates.
export function longDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
