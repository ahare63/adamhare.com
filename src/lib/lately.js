// Helpers for the home page's "Lately" strip.
import { parseBooks, coverKey } from './books.js';

// Something only counts as "lately" for about three months.
export const RECENT_MS = 100 * 24 * 60 * 60 * 1000;

// The first (newest) item if it happened within RECENT_MS before `now`, else null.
export function recentFirst(items, timeOf, now = Date.now()) {
  const t = items.length ? timeOf(items[0]) : NaN;
  return Number.isFinite(t) && t <= now && now - t < RECENT_MS ? items[0] : null;
}

// The `count` newest top-level bullets of books.md (newest year first, newest first within a
// year), each with its number within its year and its date from src/data/finished.json, or null.
export function newestBooks(raw, finished, count = 2) {
  return raw.split(/^## /m).slice(1).flatMap((section) => {
    const [heading, ...lines] = section.split('\n');
    const year = Number(heading.trim());
    if (!/^\d{4}$/.test(heading.trim())) return [];
    const bullets = lines.filter((l) => l.startsWith('- '));
    return bullets.map((b, i) => {
      const [book] = parseBooks(`## ${year}\n${b}\n`);
      return {
        line: b.slice(2),
        number: bullets.length - i,
        year,
        finished: (book && finished[coverKey(book)]) ?? null,
      };
    });
  }).slice(0, count);
}

// "2026-11-05" -> "5 November 2026", matching how the sheets write dates.
export function longDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
