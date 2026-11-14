// Records a page count for every book in src/content/books.md in
// src/data/pages.json, keyed by coverKey(book): { n }, { n, approx: true } (a typical
// length across editions) or null (looked up everywhere, nothing found).
// Sources, first hit wins: the LibraryThing export's `pages` (only present locally),
// Open Library by ISBN, then an Open Library title/author search (approx).
// Existing entries, including hand edits, are never overwritten. A failed request
// leaves the key absent so a later run retries it.
// Run: npm run fetch:pages   (about one request per second)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseBooks, coverKey } from '../src/lib/books.js';
import { getJson, normalizeEntries, readSeeds, sortByKey } from './fetch-library.mjs';

const BOOKS_MD = new URL('../src/content/books.md', import.meta.url);
const LIBRARY_JSON = new URL('../src/data/library.json', import.meta.url);
const PAGES_JSON = new URL('../src/data/pages.json', import.meta.url);
const ISBN_CACHE = new URL('../librarything/ol-pages-cache.json', import.meta.url);
const OL = 'https://openlibrary.org';

// A usable page count, or null. Anything under 10 or over 3000 is a data error.
export function pageCountOf(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 10 && n <= 3000 ? n : null;
}

// pages.json as written to disk: one entry per line, sorted by key.
export function serializePages(pages) {
  const lines = Object.entries(sortByKey(pages)).map(([key, v]) => {
    const value = v === null ? 'null' : `{ "n": ${v.n}${v.approx ? ', "approx": true' : ''} }`;
    return `  ${JSON.stringify(key)}: ${value}`;
  });
  return lines.length ? `{\n${lines.join(',\n')}\n}\n` : '{}\n';
}

// Open Library's page count for an ISBN's edition, or null.
export async function isbnPages(isbn, getJson) {
  return pageCountOf((await getJson(`${OL}/isbn/${isbn}.json`))?.number_of_pages);
}

// The median page count Open Library reports across editions of the first search
// hit that has one (title only when the book has no author), or null.
export async function searchPages(book, getJson) {
  const params = new URLSearchParams({ title: book.title, fields: 'key,title,author_name,number_of_pages_median', limit: '3' });
  if (book.author) params.set('author', book.author);
  const { docs = [] } = (await getJson(`${OL}/search.json?${params}`)) ?? {};
  return docs.map((d) => pageCountOf(d.number_of_pages_median)).find(Boolean) ?? null;
}

// Returns the existing map plus an entry for each book whose key is missing.
// `lookups.fromExport(book)` answers synchronously; `fromIsbn(book)` and
// `fromSearch(book)` resolve to a count or null. A lookup that throws leaves the key absent.
export async function buildPagesMap(books, existing, lookups, { onFailure } = {}) {
  const out = { ...existing };
  for (const book of books) {
    const key = coverKey(book);
    if (key in out) continue;
    try {
      const exact = pageCountOf(lookups.fromExport(book)) ?? pageCountOf(await lookups.fromIsbn(book));
      if (exact) { out[key] = { n: exact }; continue; }
      const approx = pageCountOf(await lookups.fromSearch(book));
      out[key] = approx ? { n: approx, approx: true } : null;
    } catch (err) {
      onFailure?.(book, err);
    }
  }
  return sortByKey(out);
}

const readJson = (url, fallback) => (existsSync(url) ? JSON.parse(readFileSync(url, 'utf-8')) : fallback);

async function main() {
  const books = parseBooks(readFileSync(BOOKS_MD, 'utf-8'));
  const existing = readJson(PAGES_JSON, {});
  const library = readJson(LIBRARY_JSON, {});
  const isbnCache = readJson(ISBN_CACHE, {});
  const exportPages = new Map(normalizeEntries(readSeeds()).filter((e) => e.pages).map((e) => [String(e.book_id), e.pages]));

  const lookups = {
    fromExport: (book) => exportPages.get(String(library[coverKey(book)]?.ltId)),
    fromIsbn: async (book) => {
      const key = coverKey(book);
      const isbn = library[key]?.isbn;
      if (!isbn) return null;
      if (key in isbnCache) return isbnCache[key];
      return isbnPages(isbn, getJson);
    },
    fromSearch: (book) => searchPages(book, getJson),
  };

  let latest = existing;
  process.on('SIGINT', () => {
    try { writeFileSync(PAGES_JSON, serializePages(latest)); } catch (err) { console.error(`fetch-pages: ${err.message}`); process.exit(1); }
    process.exit(0);
  });
  const todo = books.filter((b) => !(coverKey(b) in existing)).length;
  console.log(`fetch-pages: ${todo} of ${books.length} books to look up`);
  const failed = [];
  const result = await buildPagesMap(books, existing, lookups, { onFailure: (b, err) => failed.push(`${b.title}: ${err.message}`) });
  latest = result;
  try {
    writeFileSync(PAGES_JSON, serializePages(result));
  } catch (err) {
    console.error(`fetch-pages: cannot write pages.json: ${err.message}`);
    process.exit(1);
  }
  const values = Object.values(result);
  console.log(`fetch-pages: ${values.filter((v) => v && !v.approx).length} exact, ${values.filter((v) => v?.approx).length} approx, ${values.filter((v) => v === null).length} none`);
  if (failed.length) console.log(`fetch-pages: ${failed.length} lookups failed and will be retried next run`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
