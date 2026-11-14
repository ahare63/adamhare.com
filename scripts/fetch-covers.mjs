// Looks up an Open Library cover id for every book in src/content/books.md and
// stores it in src/data/covers.json, keyed by coverKey(book). Only books not
// already in the file are queried; existing entries (including hand-edited ones)
// are never overwritten. A value of null means "looked up, none found". A failed
// request leaves the key absent so a later run retries it.
// Run: npm run fetch:covers   (about one request per second)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseBooks, coverKey } from '../src/lib/books.js';

const BOOKS_MD = new URL('../src/content/books.md', import.meta.url);
const COVERS_JSON = new URL('../src/data/covers.json', import.meta.url);
const USER_AGENT = 'adamhare.com-site-build';
const INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sortByKey = (map) => Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

// Returns the existing map plus an entry for each book whose key is missing.
// `lookup(book)` resolves to a cover id or null; if it throws, the key is skipped.
export async function buildCoverMap(books, existing, lookup, { onProgress } = {}) {
  const out = { ...existing };
  for (const book of books) {
    const key = coverKey(book);
    if (key in out) continue;
    try {
      const id = await lookup(book);
      out[key] = id ?? null;
    } catch (err) {
      onProgress?.(book, err);
    }
  }
  return sortByKey(out);
}

async function search(title, author) {
  const params = new URLSearchParams({ title, fields: 'cover_i,title,author_name', limit: '5' });
  if (author) params.set('author', author);
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { docs = [] } = await res.json();
  return docs.find((d) => d.cover_i)?.cover_i ?? null;
}

// Throttled so consecutive requests start at least INTERVAL_MS apart.
let last = 0;
async function throttledSearch(title, author) {
  const wait = last + INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  return search(title, author);
}

// The author is omitted from the query when the book has none, so that query is
// already title-only; a book with an author that finds nothing is stored as null.
const lookup = (book) => throttledSearch(book.title, book.author);

async function main() {
  const books = parseBooks(readFileSync(BOOKS_MD, 'utf-8'));
  const existing = existsSync(COVERS_JSON) ? JSON.parse(readFileSync(COVERS_JSON, 'utf-8')) : {};
  const todo = books.filter((b) => !(coverKey(b) in existing)).length;
  console.log(`fetch-covers: ${todo} of ${books.length} books need a lookup`);

  let latest = existing;
  const save = () => writeFileSync(COVERS_JSON, JSON.stringify(latest, null, 2) + '\n');
  process.on('SIGINT', () => {
    try { save(); } catch (err) { console.error(`fetch-covers: ${err.message}`); process.exit(1); }
    process.exit(0);
  });

  // Track partial progress so SIGINT keeps what has been found so far.
  const partial = { ...existing };
  const tracked = async (book) => {
    const id = await lookup(book);
    partial[coverKey(book)] = id;
    latest = sortByKey(partial);
    return id;
  };
  const skipped = [];
  const result = await buildCoverMap(books, existing, tracked, {
    onProgress: (book, err) => skipped.push(`${book.title}: ${err.message}`),
  });
  latest = result;
  try {
    save();
  } catch (err) {
    console.error(`fetch-covers: cannot write covers.json: ${err.message}`);
    process.exit(1);
  }
  const vals = Object.values(result);
  console.log(`fetch-covers: ${vals.filter((v) => v !== null).length} covers, ${vals.filter((v) => v === null).length} none`);
  if (skipped.length) console.log(`fetch-covers: ${skipped.length} lookups failed and will be retried next run`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
