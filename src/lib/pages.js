import { coverKey } from './books.js';

// A book's page count from src/data/pages.json: { n, approx } or null.
// `approx` marks a typical length across editions rather than the owner's edition.
export function pagesOf(book, pagesData) {
  const entry = pagesData[coverKey(book)];
  return entry ? { n: entry.n, approx: Boolean(entry.approx) } : null;
}

// Page totals for a list of books: the sum of known counts, how many books have
// one, and how many books there are.
export function pageStats(books, pagesData) {
  let total = 0;
  let counted = 0;
  for (const book of books) {
    const pages = pagesOf(book, pagesData);
    if (pages) { total += pages.n; counted++; }
  }
  return { total, counted, of: books.length };
}

// A page total for display: nearest hundred below 10,000, nearest thousand from there.
export function roundedPages(total) {
  const step = total >= 10000 ? 1000 : 100;
  return Math.round(total / step) * step;
}
