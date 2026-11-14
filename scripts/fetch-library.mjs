// Builds src/data/library.json, keyed by coverKey(book), from the owner's
// LibraryThing catalogue: { ltId, isbn, cover, blurb } per book in books.md.
// Catalogue entries come from the public LibraryThing feed (the 250 most recently
// added, one request per run) merged with every *.json file in librarything/.
// Descriptions come from Open Library by ISBN, at most one request per second.
// Existing entries and their cover/blurb values are never overwritten, so hand
// edits win. A book with no catalogue match gets no key and is retried next run.
// A failed description lookup leaves `blurb` absent so it is retried next run;
// `blurb: null` means "looked up, none found".
// Run: npm run fetch:library
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseBooks, coverKey } from '../src/lib/books.js';
import { matchBook, largeCover, cleanBlurb } from '../src/lib/library-match.js';

const BOOKS_MD = new URL('../src/content/books.md', import.meta.url);
const LIBRARY_JSON = new URL('../src/data/library.json', import.meta.url);
const SEED_DIR = new URL('../librarything/', import.meta.url);
const UNMATCHED_TXT = new URL('../librarything/unmatched.txt', import.meta.url);
const FEED_URL = 'https://www.librarything.com/api_getdata.php?userid=ahare63&responseType=json&max=250&booksort=entry_REV';
const USER_AGENT = 'adamhare.com-site-build';
const INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sortByKey = (map) => Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

// Flattens feed-shaped ({ books: {...} }) and bare ({ id: {...} }) sources into
// one list of entries; when a book_id repeats, the later source wins.
export function normalizeEntries(sources) {
  const byId = new Map();
  for (const src of sources) {
    const books = src && typeof src.books === 'object' ? src.books : src;
    for (const [key, entry] of Object.entries(books ?? {})) byId.set(String(entry.book_id ?? key), entry);
  }
  return [...byId.values()];
}

// Adds an entry for every book that has none yet and matches a catalogue entry.
export function buildLibrary(books, existing, entries) {
  const library = { ...existing };
  const unmatched = [];
  const seen = new Set();
  for (const book of books) {
    const key = coverKey(book);
    if (key in library || seen.has(key)) continue;
    seen.add(key);
    const hit = matchBook(book, entries);
    if (!hit) { unmatched.push(book); continue; }
    library[key] = { ltId: String(hit.book_id), isbn: hit.ISBN_cleaned || null, cover: largeCover(hit.cover) };
  }
  return { library: sortByKey(library), unmatched };
}

// Looks up a blurb for each entry that has an ISBN and no `blurb` property.
// `lookupBlurb(isbn)` resolves to text or null; if it throws, `blurb` stays absent.
export async function fillBlurbs(library, lookupBlurb, { onUpdate } = {}) {
  const out = { ...library };
  let found = 0, none = 0, failed = 0;
  for (const [key, entry] of Object.entries(out)) {
    if (!entry.isbn || 'blurb' in entry) continue;
    try {
      const blurb = await lookupBlurb(entry.isbn);
      out[key] = { ...entry, blurb: blurb ?? null };
      if (blurb) found++; else none++;
      onUpdate?.(out);
    } catch {
      failed++;
    }
  }
  return { library: sortByKey(out), found, none, failed };
}

let last = 0;
async function throttledGet(url) {
  const wait = last + INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
}

const descriptionOf = (doc) => (typeof doc.description === 'string' ? doc.description : doc.description?.value);

async function getJson(url) {
  const res = await throttledGet(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function openLibraryBlurb(isbn) {
  const edition = await getJson(`https://openlibrary.org/isbn/${isbn}.json`);
  if (!edition) return null;
  let text = descriptionOf(edition);
  const workKey = edition.works?.[0]?.key;
  if (!cleanBlurb(text) && workKey) {
    const work = await getJson(`https://openlibrary.org${workKey}.json`);
    text = work ? descriptionOf(work) : undefined;
  }
  return cleanBlurb(text);
}

async function fetchFeed() {
  try {
    const res = await fetch(FEED_URL, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`fetch-library: LibraryThing feed unavailable (${err.message}); using seed files only`);
    return null;
  }
}

function readSeeds() {
  const dir = fileURLToPath(SEED_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, SEED_DIR), 'utf-8')));
}

async function main() {
  const books = parseBooks(readFileSync(BOOKS_MD, 'utf-8'));
  const existing = existsSync(LIBRARY_JSON) ? JSON.parse(readFileSync(LIBRARY_JSON, 'utf-8')) : {};
  const feed = await fetchFeed();
  const entries = normalizeEntries([...readSeeds(), ...(feed ? [feed] : [])]);

  const { library: matched, unmatched } = buildLibrary(books, existing, entries);
  let latest = matched;
  const save = () => writeFileSync(LIBRARY_JSON, JSON.stringify(latest, null, 2) + '\n');
  process.on('SIGINT', () => {
    try { save(); } catch (err) { console.error(`fetch-library: ${err.message}`); process.exit(1); }
    process.exit(0);
  });

  const { library, found, none, failed } = await fillBlurbs(matched, openLibraryBlurb, {
    onUpdate: (partial) => { latest = sortByKey(partial); },
  });
  latest = library;
  try {
    save();
    writeFileSync(UNMATCHED_TXT, unmatched.map((b) => `${b.year}\t${b.title}\t${b.author}`).join('\n') + '\n');
  } catch (err) {
    console.error(`fetch-library: cannot write output: ${err.message}`);
    process.exit(1);
  }
  const newlyMatched = Object.keys(matched).length - Object.keys(existing).length;
  console.log(`fetch-library: ${entries.length} catalogue entries; ${newlyMatched} newly matched, ${unmatched.length} unmatched`);
  console.log(`fetch-library: blurbs ${found} found, ${none} none, ${failed} failed (retried next run)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
