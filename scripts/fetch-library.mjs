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
const OVERRIDES_JSON = new URL('../src/data/cover-overrides.json', import.meta.url);
const SEED_DIR = new URL('../librarything/', import.meta.url);
const UNMATCHED_TXT = new URL('../librarything/unmatched.txt', import.meta.url);
const FEED_URL = 'https://www.librarything.com/api_getdata.php?userid=ahare63&responseType=json&max=250&booksort=entry_REV';
const USER_AGENT = 'adamhare.com-site-build';
const INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sortByKey = (map) => Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const isIsbn10 = (v) => typeof v === 'string' && /^[0-9]{9}[0-9Xx]$/.test(v);
const isIsbn13 = (v) => typeof v === 'string' && /^[0-9]{13}$/.test(v);

// Maps a LibraryThing export record to the feed's entry shape. Only the fields
// the site uses are kept; the export carries private notes that never leave here.
function fromExport(rec) {
  const isbns = [rec.originalisbn, ...(Array.isArray(rec.isbn) ? rec.isbn : Object.values(rec.isbn ?? {}))].filter(Boolean);
  const author = Array.isArray(rec.authors) ? rec.authors.find((a) => a && a.fl)?.fl : undefined;
  const stamp = rec.entrydate ? Date.parse(`${rec.entrydate}T00:00:00Z`) / 1000 : NaN;
  return {
    book_id: String(rec.books_id),
    title: rec.title,
    author_fl: author ?? '',
    ISBN_cleaned: isbns.find(isIsbn10) ?? isbns.find(isIsbn13) ?? '',
    entry_stamp: Number.isNaN(stamp) ? undefined : String(stamp),
    language: rec.language_codeA?.[0],
    originaltitle: rec.originaltitle || undefined,
    original: rec.originallanguage_codeA?.find((c) => c && c !== 'eng'),
    cover: undefined,
  };
}

// The feed's original-language code is only kept when it is not English.
const withOriginal = (raw) => (raw.language_original && raw.language_original !== 'eng' ? { ...raw, original: raw.language_original } : raw);

const present = (v) => v !== undefined && v !== null && v !== '';

// Flattens feed-shaped ({ books: {...} }), bare ({ id: {...} }) and export-shaped
// ({ id: { books_id, ... } }) sources into one list of entries. For a repeated
// book_id the later source wins, except that export data only fills fields an
// earlier feed entry lacks.
export function normalizeEntries(sources) {
  const byId = new Map();
  for (const src of sources) {
    const books = src && typeof src.books === 'object' ? src.books : src;
    for (const [key, raw] of Object.entries(books ?? {})) {
      const fromExp = raw.books_id !== undefined;
      const entry = fromExp ? fromExport(raw) : withOriginal(raw);
      const id = String(entry.book_id ?? key);
      const prev = byId.get(id);
      if (!prev) { byId.set(id, { entry, fromExp }); continue; }
      const merged = { ...prev.entry };
      for (const [k, v] of Object.entries(entry)) {
        if (!present(v)) continue;
        if (fromExp && !prev.fromExp && present(merged[k])) continue;
        merged[k] = v;
      }
      byId.set(id, { entry: merged, fromExp: prev.fromExp && fromExp });
    }
  }
  return [...byId.values()].map((v) => v.entry);
}

// Adds an entry for every book that has none yet and matches a catalogue entry,
// and fills a missing ISBN or original-language code on existing entries from
// the catalogue.
// `added` lists the keys of the new entries.
// `overrides` maps a LibraryThing id to a hand-picked cover (local path or URL).
export function buildLibrary(books, existing, entries, overrides = {}) {
  const library = { ...existing };
  const byLtId = new Map(entries.map((e) => [String(e.book_id), e]));
  for (const [key, entry] of Object.entries(library)) {
    const found = byLtId.get(String(entry.ltId));
    const fill = {};
    if (entry.isbn == null && found?.ISBN_cleaned) fill.isbn = found.ISBN_cleaned;
    if (entry.lang === undefined && found?.original) fill.lang = found.original;
    if (Object.keys(fill).length) library[key] = { ...entry, ...fill };
  }
  const unmatched = [];
  const added = [];
  const seen = new Set();
  for (const book of books) {
    const key = coverKey(book);
    if (key in library || seen.has(key)) continue;
    seen.add(key);
    const hit = matchBook(book, entries);
    if (!hit) { unmatched.push(book); continue; }
    library[key] = { ltId: String(hit.book_id), isbn: hit.ISBN_cleaned || null, cover: overrides[hit.book_id] ?? (hit.cover ? largeCover(hit.cover) : null), ...(hit.original ? { lang: hit.original } : {}) };
    added.push(key);
  }
  return { library: sortByKey(library), unmatched, added };
}

// For added entries with no cover and a 10-character ISBN, tries the Amazon
// image for that ISBN; `check(url)` resolves true when it is a real cover.
export async function fillCovers(library, addedKeys, check) {
  const out = { ...library };
  for (const key of addedKeys) {
    const entry = out[key];
    if (entry.cover || !isIsbn10(entry.isbn)) continue;
    const url = `https://ecx.images-amazon.com/images/P/${entry.isbn}.01._SX400_SCRM_.jpg`;
    try {
      if (await check(url)) out[key] = { ...entry, cover: url };
    } catch {
      // cover stays null
    }
  }
  return out;
}

// Looks up a blurb for each entry that has no `blurb` property.
// `lookupBlurb(entry, key)` resolves to text or null; if it throws, `blurb` stays absent.
export async function fillBlurbs(library, lookupBlurb, { onUpdate } = {}) {
  const out = { ...library };
  let found = 0, none = 0, failed = 0;
  for (const [key, entry] of Object.entries(out)) {
    if ('blurb' in entry) continue;
    try {
      const blurb = await lookupBlurb(entry, key);
      out[key] = { ...entry, blurb: blurb ?? null };
      if (blurb) found++; else none++;
      onUpdate?.(out);
    } catch {
      failed++;
    }
  }
  return { library: sortByKey(out), found, none, failed };
}

const descriptionOf = (doc) => (typeof doc?.description === 'string' ? doc.description : doc?.description?.value);
const OL = 'https://openlibrary.org';

// First usable description for a book: the English edition's, then its work's,
// then the work found by searching title and author. `getJson(url)` resolves to
// parsed JSON or null (not found) and throws on request failure.
export async function findBlurb(entry, book, getJson) {
  if (entry.isbn) {
    const edition = await getJson(`${OL}/isbn/${entry.isbn}.json`);
    if (edition) {
      const langs = edition.languages;
      const english = !langs?.length || langs.some((l) => l.key === '/languages/eng');
      const fromEdition = english ? cleanBlurb(descriptionOf(edition)) : null;
      if (fromEdition) return fromEdition;
      const workKey = edition.works?.[0]?.key;
      const fromWork = workKey ? cleanBlurb(descriptionOf(await getJson(`${OL}${workKey}.json`))) : null;
      if (fromWork) return fromWork;
    }
  }
  const params = new URLSearchParams({ title: book.title, ...(book.author ? { author: book.author } : {}), fields: 'key', limit: '1' });
  const found = await getJson(`${OL}/search.json?${params}`);
  const key = found?.docs?.[0]?.key;
  return key ? cleanBlurb(descriptionOf(await getJson(`${OL}${key}.json`))) : null;
}

let last = 0;
async function throttledGet(url) {
  const wait = last + INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } });
}

async function getJson(url) {
  const res = await throttledGet(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Amazon answers with a tiny placeholder image when it has no cover for an ISBN.
async function isRealCover(url) {
  const res = await throttledGet(url);
  if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return false;
  return (await res.arrayBuffer()).byteLength > 1000;
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

  const built = buildLibrary(books, existing, entries, JSON.parse(readFileSync(OVERRIDES_JSON, 'utf-8')));
  const unmatched = built.unmatched;
  const matched = await fillCovers(built.library, built.added, isRealCover);
  const derived = built.added.filter((k) => !built.library[k].cover && matched[k].cover).length;
  let latest = matched;
  const save = () => writeFileSync(LIBRARY_JSON, JSON.stringify(latest, null, 2) + '\n');
  process.on('SIGINT', () => {
    try { save(); } catch (err) { console.error(`fetch-library: ${err.message}`); process.exit(1); }
    process.exit(0);
  });

  const bookByKey = new Map(books.map((b) => [coverKey(b), b]));
  const lookup = (entry, key) => findBlurb(entry, bookByKey.get(key) ?? { title: key.split('|')[0], author: '' }, getJson);
  const { library, found, none, failed } = await fillBlurbs(matched, lookup, {
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
  console.log(`fetch-library: ${entries.length} catalogue entries; ${built.added.length} newly matched, ${unmatched.length} unmatched`);
  console.log(`fetch-library: ${derived} covers derived from Amazon; ${Object.values(library).filter((v) => !v.cover).length} entries with no cover`);
  console.log(`fetch-library: blurbs ${found} found, ${none} none, ${failed} failed (retried next run)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
