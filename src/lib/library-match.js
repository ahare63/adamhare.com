// Pairs books.md entries with LibraryThing catalogue entries, and cleans up the
// cover URLs and descriptions that come with them.

const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalize = (s) => fold(s).replace(/^(the|a|an) /, '');

const mainTitle = (s) => String(s ?? '').split(/[:(]/)[0];

const titleForms = (title) => [normalize(title), normalize(mainTitle(title))].filter(Boolean);

const entryTitleForms = (e) => [...titleForms(e.title), ...(e.originaltitle ? titleForms(e.originaltitle) : [])];

const surname = (author) => {
  const first = author.split(/ and |,|;/)[0];
  return normalize(first).split(' ').pop();
};

const wordCount = (s) => s.split(' ').length;

// True when `short` appears inside `long` as a run of whole words and is long
// enough to be distinctive: two words or eight characters, or a single word that
// opens the other title (article included, so "Ulysses" does not match "The Ulysses Theme").
const containsRun = (short, long, shortKept, longKept) => {
  if (!short || !` ${long} `.includes(` ${short} `)) return false;
  if (wordCount(short) >= 2 || short.length >= 8) return true;
  return ` ${longKept} `.startsWith(` ${shortKept} `);
};

const loosely = (book, e) => {
  const wanted = titleForms(book.title);
  const kept = fold(book.title);
  const candidates = [e.title, e.originaltitle].filter(Boolean);
  return candidates.some((t) => {
    const forms = [normalize(t), normalize(mainTitle(t))].filter(Boolean);
    const entryKept = fold(t);
    return wanted.some((w) => forms.some((f) => containsRun(w, f, kept, entryKept)));
  });
};

// The best LibraryThing entry for a book, or null. Titles must agree (full or
// main title, either side, entry original title included) and, when the book has
// an author, the first author's surname must appear among the entry's authors.
// Only when no entry agrees that way does a looser rule apply: the entry's title
// contains the book's as a run of whole words (the entry may carry extra words,
// never the book), and the author must match. Among candidates an exact
// full-title match wins, then one with an ISBN, then the most recent.
export function matchBook(book, entries) {
  const wanted = titleForms(book.title);
  const sur = book.author ? surname(book.author) : '';
  const authorOk = (e) => ` ${normalize(e.author_fl)} `.includes(` ${sur} `);
  let hits = entries.filter((e) => entryTitleForms(e).some((t) => wanted.includes(t)) && (!sur || authorOk(e)));
  if (!hits.length && sur) hits = entries.filter((e) => authorOk(e) && loosely(book, e));
  if (!hits.length) return null;
  const full = normalize(book.title);
  const rank = (e) => [normalize(e.title) === full ? 1 : 0, e.ISBN_cleaned ? 1 : 0, Number(e.entry_stamp) || 0];
  const cmp = (a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  };
  return hits.sort(cmp)[0];
}

// LibraryThing feed covers are thumbnails; the size is part of the URL.
export function largeCover(url) {
  if (url.includes('images-amazon.com')) return url.replace('_SX100_SY200_', '_SX400_');
  if (url.includes('pics.cdn.librarything.com')) return url.replace('-h200-w100-', '-h600-w300-');
  return url;
}

const MAX_BLURB = 600;
const MIN_BLURB = 40;

const STOP_WORDS = new Set((
  'the of and a an to in is was it that he she his her with for as on by at from this which are be has had not ' +
  'but or their they who its were have been into'
).split(' '));

// Share of tokens that are common English function words; other European
// languages score far lower, and proper-noun-heavy English still scores well above the cut.
export function looksEnglish(text) {
  const tokens = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (!tokens.length) return false;
  return tokens.filter((t) => STOP_WORDS.has(t.replace(/^'+|'+$/g, '').replace(/['’]s$/, ''))).length / tokens.length >= 0.18;
}

const OPEN_QUOTES = '"“„';
const CLOSE_QUOTES = '"”';
const SOURCE_TAIL = /\s*(?:--|—)\s*(?:from\s+)?(?:the\s+)?(?:publisher'?s?(?:\s+(?:description|summary))?|provided by (?:the )?publisher|amazon(?:\.com)?|(?:dust |book )?jacket|back cover)\.?\s*$/i;

const isQuote = (c) => (OPEN_QUOTES + CLOSE_QUOTES).includes(c);
const countQuotes = (t) => [...t].filter(isQuote).length;

// Quotes in catalogue text: a quote at both ends is a wrapper around the whole
// text and is removed (an inner quotation that follows survives); a repeated
// opening quote collapses to one; a single quote with no partner is dropped.
function tidyQuotes(t) {
  if (t.length > 1 && OPEN_QUOTES.includes(t[0]) && CLOSE_QUOTES.includes(t[t.length - 1])) t = t.slice(1, -1).trim();
  t = t.replace(new RegExp(`^([${OPEN_QUOTES}])[${OPEN_QUOTES}${CLOSE_QUOTES}]+`), '$1');
  if (countQuotes(t) % 2 === 1) {
    if (isQuote(t[0])) return t.slice(1).trim();
    if (isQuote(t[t.length - 1])) return t.slice(0, -1).trim();
  }
  return t;
}

// Plain-text description, or null when there is nothing worth showing.
export function cleanBlurb(text) {
  if (typeof text !== 'string') return null;
  let t = text
    .replace(/(?:-{10,}|Contains:|See also:|\(\[source\])[\s\S]*$/, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/(\*\*|__|\*)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/("|\u201d)\s*--$/, '$1')
    .replace(SOURCE_TAIL, '')
    .trim();
  t = tidyQuotes(t);
  if (t.length < MIN_BLURB || !looksEnglish(t)) return null;
  if (t.length > MAX_BLURB) {
    const head = t.slice(0, MAX_BLURB);
    const ends = [...head.matchAll(/[.!?]["”')]*(?=\s|$)/g)];
    const last = ends[ends.length - 1];
    t = last ? head.slice(0, last.index + last[0].length) : `${head.slice(0, head.lastIndexOf(' ')).trim()}…`;
  }
  return t;
}
