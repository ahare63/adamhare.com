// Applies a confirmed book proposal: the books.md bullet plus the library,
// author-country, book-setting and original-language data entries. Everything is validated
// and computed first; files are written only if nothing failed.
// Run: npm run book:add -- <proposal.json> [--countries cn] [--settings cn,in] [--language Chinese] [--pages 339] [--finished 2026-11-20] [--force]
// The finished date (src/data/finished.json) is today unless --finished gives the day he finished it.
// The flags fill or replace those fields of the proposal (usually a draft from book:lookup --out).
// Only files whose data changed are rewritten.
//   { "bulletLine": "- *…*", "year": 2026, "key": "…",
//     "library": { "ltId", "isbn", "cover", "blurb" } | null,
//     "countries": ["it"] | null, "authorKey": "<author as in books.md>" | null,
//     "titleKey": "<title>" | null, "language": "Italian" | null,
//     "settings": ["cz"] | null  (where it is set or what it is about; keyed by the bullet's title),
//     "pages": { "n": 412, "approx": false } | null }
// Existing different values are kept (and reported) unless --force is given.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { serializeLibrary, sortByKey } from './fetch-library.mjs';
import { pageCountOf, serializePages } from './fetch-pages.mjs';
import { parseBooks } from '../src/lib/books.js';

const BOOKS_MD = new URL('../src/content/books.md', import.meta.url);
const LIBRARY_JSON = new URL('../src/data/library.json', import.meta.url);
const COUNTRIES_JSON = new URL('../src/data/author-countries.json', import.meta.url);
const LANGUAGES_JSON = new URL('../src/data/languages.json', import.meta.url);
const PAGES_JSON = new URL('../src/data/pages.json', import.meta.url);
const SETTINGS_JSON = new URL('../src/data/book-settings.json', import.meta.url);
const FINISHED_JSON = new URL('../src/data/finished.json', import.meta.url);

// A real calendar date written YYYY-MM-DD.
const isIsoDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// finished.json as written to disk: one book per line, sorted by key.
export const serializeFinished = (data) => `{\n${Object.entries(sortByKey(data))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`;

const YEAR_HEADING = /^##\s+(\d{4})\s*$/;

// Inserts `line` as the first bullet under `## year`. A missing year gets its own
// section at its place in the newest-first order, set off by blank lines.
export function insertBullet(md, year, line) {
  const lines = md.split('\n');
  const headings = lines.flatMap((l, i) => { const m = l.match(YEAR_HEADING); return m ? [{ i, year: Number(m[1]) }] : []; });
  const at = headings.find((h) => h.year === year);
  if (at) {
    let first = at.i + 1;
    while (first < lines.length && lines[first].trim() === '') first++;
    if (lines[first] === line) throw new Error(`that line is already the first bullet of ${year}`);
    lines.splice(first, 0, line);
    return lines.join('\n');
  }
  const older = headings.find((h) => h.year < year);
  if (older) {
    lines.splice(older.i, 0, `## ${year}`, '', line, '');
    return lines.join('\n');
  }
  const body = md.replace(/\n*$/, '\n');
  return `${body}\n## ${year}\n\n${line}\n`;
}

// author-countries.json as written to disk: one-space indent, arrays on one line.
export function serializeCountries(data) {
  const section = (map) => Object.entries(map)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v).replace(/","/g, '", "')}`)
    .join(',\n');
  return `{\n "authors": {\n${section(data.authors)}\n },\n "titles": {\n${section(data.titles)}\n }\n}\n`;
}

// author-countries.json is in locale order; languages.json is in plain code-unit order.
const sortedSections = (data, compare) => ({
  authors: Object.fromEntries(Object.entries(data.authors).sort(([a], [b]) => compare(a, b))),
  titles: Object.fromEntries(Object.entries(data.titles).sort(([a], [b]) => compare(a, b))),
});
const byLocale = (a, b) => a.localeCompare(b);
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const serializeLanguages = (data) => `${JSON.stringify(data, null, 2)}\n`;

// book-settings.json as written to disk: one entry per line, arrays on one line.
export const serializeSettings = (data) => `{\n${Object.entries(data)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v).replace(/","/g, '", "')}`).join(',\n')}\n}\n`;

const isCodes = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => /^[a-z]{2}$/.test(c));

function validate(p) {
  if (typeof p.bulletLine !== 'string' || !p.bulletLine.startsWith('- ')) throw new Error('bulletLine must be a books.md bullet starting with "- "');
  if (!Number.isInteger(p.year)) throw new Error('year must be an integer');
  if (p.countries != null && !isCodes(p.countries)) {
    throw new Error('country codes must be a list of lowercase ISO-2 codes, e.g. ["it"]');
  }
  if (p.settings != null && !isCodes(p.settings)) throw new Error('settings must be a list of lowercase ISO-2 codes, e.g. ["cz"]');
  if (p.language != null && !(typeof p.language === 'string' && p.language.trim())) throw new Error('language must be a non-empty language name');
  if ((p.countries != null || p.language != null) && !p.authorKey && !p.titleKey) {
    throw new Error('authorKey or titleKey is needed to record a country or language');
  }
  if (p.pages != null && !(pageCountOf(p.pages.n) && p.key != null)) throw new Error('pages needs a key and a count n between 10 and 3000');
  if (p.library != null && p.key == null) throw new Error('key is needed to record a library entry');
  if (p.finished != null && !isIsoDate(p.finished)) throw new Error(`finished must be a YYYY-MM-DD date, got "${p.finished}"`);
}

// Sets map[key] = value unless it already holds a different value; reports either way.
function setValue(map, key, value, label, { force, summary, skipped }) {
  const old = map[key];
  if (old !== undefined && JSON.stringify(old) !== JSON.stringify(value) && !force) {
    skipped.push(`${label} "${key}" already ${JSON.stringify(old)}; kept it (proposed ${JSON.stringify(value)})`);
    return;
  }
  if (JSON.stringify(old) === JSON.stringify(value)) return;
  map[key] = value;
  summary.push(`${label} "${key}" set to ${JSON.stringify(value)}`);
}

// Pure core: returns the new file contents plus a summary and the skipped changes.
export function applyProposal(state, proposal, { force = false, today = null } = {}) {
  validate(proposal);
  const summary = [];
  const skipped = [];
  const ctx = { force, summary, skipped };

  const booksMd = insertBullet(state.booksMd, proposal.year, proposal.bulletLine);
  summary.push(`books.md: added under ${proposal.year}: ${proposal.bulletLine}`);

  const library = { ...state.library };
  if (proposal.library) {
    const existing = library[proposal.key] ?? {};
    const merged = { ...existing };
    for (const [field, value] of Object.entries(proposal.library)) {
      if (merged[field] == null || (force && merged[field] !== value)) merged[field] = value;
      else if (JSON.stringify(merged[field]) !== JSON.stringify(value)) skipped.push(`library "${proposal.key}".${field} already set; kept it`);
    }
    if (JSON.stringify(merged) !== JSON.stringify(existing)) {
      library[proposal.key] = merged;
      summary.push(`library.json: "${proposal.key}" ${proposal.key in state.library ? 'updated' : 'added'}`);
    }
  }

  const countries = { authors: { ...state.countries.authors }, titles: { ...state.countries.titles } };
  if (proposal.countries) {
    const [section, key] = proposal.authorKey ? [countries.authors, proposal.authorKey] : [countries.titles, proposal.titleKey];
    setValue(section, key, proposal.countries, 'author-countries.json', ctx);
  }

  const languages = { authors: { ...state.languages.authors }, titles: { ...state.languages.titles } };
  if (proposal.language) {
    const [section, key] = proposal.authorKey ? [languages.authors, proposal.authorKey.toLowerCase()] : [languages.titles, proposal.titleKey.toLowerCase()];
    setValue(section, key, proposal.language, 'languages.json', ctx);
  }

  const settings = { ...state.settings };
  if (proposal.settings) {
    const [book] = parseBooks(`## ${proposal.year}\n${proposal.bulletLine}\n`);
    if (!book) throw new Error('could not read a title from bulletLine');
    setValue(settings, book.title, proposal.settings, 'book-settings.json', ctx);
  }

  const pages = { ...state.pages };
  if (proposal.pages) setValue(pages, proposal.key, { n: proposal.pages.n, ...(proposal.pages.approx ? { approx: true } : {}) }, 'pages.json', ctx);

  const finished = { ...state.finished };
  const date = proposal.finished ?? today;
  if (date != null && proposal.key != null) setValue(finished, proposal.key, date, 'finished.json', ctx);

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const changed = ['booksMd', ...Object.entries({ library, countries, languages, settings, pages, finished })
    .filter(([name, data]) => !same(data, state[name])).map(([name]) => name)];

  return {
    booksMd, library: sortByKey(library), pages: sortByKey(pages), countries: sortedSections(countries, byLocale), languages: sortedSections(languages, byCodeUnit),
    settings: Object.fromEntries(Object.entries(settings).sort(([a], [b]) => byLocale(a, b))), finished: sortByKey(finished), summary, skipped, changed,
  };
}

const codeList = (s) => s.split(',').map((c) => c.trim()).filter(Boolean);

// Fills the judgement calls into a draft from book:lookup --out. Flags are strings as typed:
// countries and settings are comma-separated ISO-2 codes; pages is the exact count he read.
export function applyOverrides(draft, { countries, settings, language, pages, finished } = {}) {
  const p = { ...draft };
  if (finished != null) {
    if (!isIsoDate(finished)) throw new Error(`finished must be a YYYY-MM-DD date, got "${finished}"`);
    p.finished = finished;
  }
  if (countries != null) p.countries = codeList(countries);
  if (settings != null) p.settings = codeList(settings);
  if (language != null) p.language = language;
  if (pages != null) {
    if (!/^\d+$/.test(pages.trim())) throw new Error(`pages must be a whole number, got "${pages}"`);
    p.pages = { n: Number(pages), approx: false };
  }
  return p;
}

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    force: { type: 'boolean', default: false },
    countries: { type: 'string' }, settings: { type: 'string' }, language: { type: 'string' }, pages: { type: 'string' },
    finished: { type: 'string' },
  } });
  if (positionals.length !== 1) {
    console.error('usage: add-book <proposal.json> [--countries cn] [--settings cn,in] [--language Chinese] [--pages 339] [--finished 2026-11-20] [--force]');
    process.exit(2);
  }
  const read = (url) => readFileSync(url, 'utf-8');
  let result;
  try {
    const proposal = applyOverrides(JSON.parse(readFileSync(positionals[0], 'utf-8')), values);
    result = applyProposal({
      booksMd: read(BOOKS_MD),
      library: JSON.parse(read(LIBRARY_JSON)),
      countries: JSON.parse(read(COUNTRIES_JSON)),
      languages: JSON.parse(read(LANGUAGES_JSON)),
      pages: JSON.parse(read(PAGES_JSON)),
      settings: JSON.parse(read(SETTINGS_JSON)),
      finished: JSON.parse(read(FINISHED_JSON)),
    }, proposal, { force: values.force, today: new Date().toLocaleDateString('en-CA') });
  } catch (err) {
    console.error(`add-book: ${err.message}; nothing was changed`);
    process.exit(1);
  }
  const outputs = {
    booksMd: [BOOKS_MD, (r) => r.booksMd],
    library: [LIBRARY_JSON, (r) => serializeLibrary(r.library)],
    countries: [COUNTRIES_JSON, (r) => serializeCountries(r.countries)],
    languages: [LANGUAGES_JSON, (r) => serializeLanguages(r.languages)],
    pages: [PAGES_JSON, (r) => serializePages(r.pages)],
    settings: [SETTINGS_JSON, (r) => serializeSettings(r.settings)],
    finished: [FINISHED_JSON, (r) => serializeFinished(r.finished)],
  };
  for (const name of result.changed) {
    const [url, render] = outputs[name];
    writeFileSync(url, render(result));
  }
  for (const line of result.summary) console.log(line);
  for (const line of result.skipped) console.log(`skipped: ${line}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
