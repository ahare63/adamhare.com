// Looks up everything needed to add one book and prints a single JSON proposal
// to stdout; nothing is written to disk. Progress and errors go to stderr.
// Run: npm run book:lookup -- --title "The Leopard" --author "Giuseppe Tomasi di Lampedusa" \
//        [--translator "Archibald Colquhoun"] [--note "re-read"]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseBooks, coverKey } from '../src/lib/books.js';
import { matchBook, largeCover } from '../src/lib/library-match.js';
import { countriesOfBook } from '../src/lib/places.js';
import { originalLanguage } from '../src/lib/languages.js';
import { fetchFeed, findBlurb, getJson, normalizeEntries, readSeeds } from './fetch-library.mjs';
import { isbnPages, searchPages } from './fetch-pages.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf-8');

// The books.md bullet for a book: *Title* by Author, trans. Translator (note).
export function bulletLine({ title, author, translator, note }) {
  const escaped = title.replace(/([\\*])/g, '\\$1');
  return `- *${escaped}*${author ? ` by ${author}` : ''}${translator ? `, trans. ${translator}` : ''}${note ? ` (${note})` : ''}`;
}

// Every top-level bullet of books.md as { year, line, book }.
function listedBooks(booksMd) {
  const out = [];
  let year = null;
  for (const line of booksMd.split('\n')) {
    const heading = line.match(/^##\s+(\d{4})\s*$/);
    if (heading) { year = Number(heading[1]); continue; }
    if (year === null || !line.startsWith('- ')) continue;
    const [book] = parseBooks(`## ${year}\n\n${line}\n`);
    if (book) out.push({ year, line, book });
  }
  return out;
}

const COMMON = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'its', 'are', 'was']);
const words = (s) => (s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) ?? []).filter((w) => !COMMON.has(w));

// Up to five catalogue entries whose titles share words with the query, best first.
function nearestTitles(title, entries) {
  const wanted = new Set(words(title));
  return entries
    .map((e) => ({ e, shared: words(e.title).filter((w) => wanted.has(w)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || words(a.e.title).length - words(b.e.title).length)
    .slice(0, 5)
    .map(({ e }) => ({ title: e.title, author: e.author_fl }));
}

// The proposal for one book, assembled from already-fetched inputs.
export function buildProposal({ book, entries, booksMd, authorCountries, languages, blurb, pages }) {
  const key = coverKey(book);
  const hit = matchBook(book, entries);
  const countries = countriesOfBook(book, authorCountries);
  const translated = Boolean(book.translator);
  return {
    book,
    bulletLine: bulletLine(book),
    key,
    alreadyListed: listedBooks(booksMd).filter((x) => coverKey(x.book) === key).map(({ year, line }) => ({ year, line })),
    librarything: hit
      ? { found: true, ltId: String(hit.book_id), title: hit.title, author: hit.author_fl, isbn: hit.ISBN_cleaned || null, cover: hit.cover ? largeCover(hit.cover) : null }
      : { found: false, nearest: nearestTitles(book.title, entries) },
    blurb: blurb ?? null,
    pages: pages ?? null,
    country: { known: countries.length ? countries : null },
    language: { needed: translated, known: translated ? originalLanguage(book, languages, hit?.original) : null },
  };
}

async function main() {
  const { values } = parseArgs({ options: {
    title: { type: 'string' }, author: { type: 'string', default: '' },
    translator: { type: 'string' }, note: { type: 'string' },
  } });
  if (!values.title) {
    console.error('usage: lookup-book --title "…" [--author "…"] [--translator "…"] [--note "…"]');
    process.exit(2);
  }
  const book = {
    year: new Date().getFullYear(), title: values.title, author: values.author,
    translator: values.translator || null, note: values.note || null,
  };
  const feed = await fetchFeed();
  const entries = normalizeEntries([...readSeeds(), ...(feed ? [feed] : [])]);
  const hit = matchBook(book, entries);
  let blurb = null;
  if (hit) {
    console.error('lookup-book: fetching description from Open Library');
    try {
      blurb = await findBlurb({ isbn: hit.ISBN_cleaned || null }, book, getJson);
    } catch (err) {
      console.error(`lookup-book: description lookup failed (${err.message})`);
    }
  }
  let pages = null;
  try {
    const n = hit?.ISBN_cleaned ? await isbnPages(hit.ISBN_cleaned, getJson) : null;
    if (n) pages = { n, approx: false, source: 'openlibrary-isbn' };
    else {
      const median = await searchPages(book, getJson);
      if (median) pages = { n: median, approx: true, source: 'openlibrary-search' };
    }
  } catch (err) {
    console.error(`lookup-book: page count lookup failed (${err.message})`);
  }
  const proposal = buildProposal({
    book, entries, blurb, pages,
    booksMd: read('../src/content/books.md'),
    authorCountries: JSON.parse(read('../src/data/author-countries.json')),
    languages: JSON.parse(read('../src/data/languages.json')),
  });
  process.stdout.write(`${JSON.stringify(proposal, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
